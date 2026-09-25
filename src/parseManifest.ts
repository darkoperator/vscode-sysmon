import { XMLParser } from 'fast-xml-parser';
import { SysmonSchemaDefinition, SysmonSchemaPlatform } from './sysmonSchema';

interface RawEvent {
	'@_name': string;
	'@_value': number;
	'@_rulename'?: string;
	'@_target'?: string;
	data?: Array<{ '@_name': string }>;
}

interface RawManifest {
	'@_schemaversion': string;
	'@_binaryversion': number;
	configuration: {
		filters: string | { '#text': string; '@_default': string };
	};
	events: {
		event: RawEvent[];
	};
}

const PARSER = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	// Match on the jpath suffix so both wrapped (<manifests><manifest>) and bare
	// (<manifest>) documents force the same nodes to arrays.
	isArray: (_, jpath) =>
		String(jpath).endsWith('events.event') ||
		String(jpath).endsWith('event.data')
});

// An event's `target` declares which platforms it applies to. Events with no
// target apply everywhere (our target-less Windows manifests). `internal` is a
// debug-only surface and is never exposed. Otherwise the target must match the
// requested platform (or `all`).
function eventMatchesPlatform(target: string | undefined, platform: SysmonSchemaPlatform): boolean {
	if (target === undefined) {
		return true;
	}
	if (target === 'internal') {
		return false;
	}
	if (target === 'all') {
		return true;
	}

	return target === platform;
}

export function parseManifest(xmlContent: string, platform: SysmonSchemaPlatform): SysmonSchemaDefinition {
	const parsed = PARSER.parse(xmlContent) as {
		manifest?: RawManifest | RawManifest[];
		manifests?: { manifest: RawManifest | RawManifest[] };
	};

	// Accept both a bare <manifest> root and a <manifests> wrapper (which may hold
	// several versions — newest first, so take the first).
	const manifestNode = parsed.manifest ?? parsed.manifests?.manifest;
	if (!manifestNode) {
		throw new Error('Manifest XML has no <manifest> element.');
	}
	const manifest = Array.isArray(manifestNode) ? manifestNode[0] : manifestNode;

	const schemaVersion = String(manifest['@_schemaversion']);
	const binaryVersion = String(manifest['@_binaryversion']);

	const filtersRaw = manifest.configuration.filters;
	const filtersText = typeof filtersRaw === 'object' ? filtersRaw['#text'] : filtersRaw;
	const conditionOperators = Object.freeze(
		String(filtersText).split(',').map(op => op.trim()).filter(Boolean)
	);

	// Group events by rulename, merging fields across shared-tag events (e.g. RegistryEvent)
	const byTag = new Map<string, { eventId: number; fieldNames: string[] }>();
	for (const event of manifest.events.event) {
		const tag = event['@_rulename'];
		if (!tag) {
			continue;
		}
		if (!eventMatchesPlatform(event['@_target'], platform)) {
			continue;
		}
		const fields = (event.data || []).map(d => d['@_name']);
		const existing = byTag.get(tag);
		if (!existing) {
			byTag.set(tag, { eventId: Number(event['@_value']), fieldNames: fields });
		} else {
			for (const name of fields) {
				if (!existing.fieldNames.includes(name)) {
					existing.fieldNames.push(name);
				}
			}
		}
	}

	const events = Object.freeze(
		Array.from(byTag.entries()).map(([tag, { eventId, fieldNames }]) =>
			Object.freeze({
				name: tag,
				eventId,
				tag,
				fields: Object.freeze(fieldNames.map(name => Object.freeze({ name })))
			})
		)
	);

	return Object.freeze({
		platform,
		schemaVersion,
		binaryVersion,
		conditionOperators,
		events
	});
}
