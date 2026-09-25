import * as fs from 'fs';
import * as path from 'path';
import { parseManifest } from './parseManifest';

export interface SysmonFieldDefinition {
	readonly name: string;
	readonly description?: string;
}

export interface SysmonEventDefinition {
	readonly name: string;
	readonly eventId: number;
	readonly tag: string;
	readonly description?: string;
	readonly fields: readonly SysmonFieldDefinition[];
}

export type SysmonSchemaPlatform = 'windows' | 'linux';

export interface SysmonSchemaLookup {
	readonly platform?: string;
	readonly schemaVersion?: string;
}

export interface SysmonSchemaDefinition {
	readonly platform: SysmonSchemaPlatform;
	readonly schemaVersion: string;
	readonly binaryVersion: string;
	readonly conditionOperators: readonly string[];
	readonly events: readonly SysmonEventDefinition[];
}

export const ONMATCH_VALUES = [
	'include',
	'exclude'
];

export const GROUP_RELATION_VALUES = [
	'and',
	'or'
];

export const DEFAULT_SYSMON_SCHEMA_VERSION = '4.91';
export const DEFAULT_SYSMON_SCHEMA_PLATFORM: SysmonSchemaPlatform = 'windows';

const KNOWN_PLATFORMS: SysmonSchemaPlatform[] = ['windows', 'linux'];

function parseVersionParts(version: string): number[] {
	return version.split('.').map(part => {
		const parsed = parseInt(part, 10);

		return isNaN(parsed) ? 0 : parsed;
	});
}

export function compareSchemaVersionsDescending(left: string, right: string): number {
	const leftParts = parseVersionParts(left);
	const rightParts = parseVersionParts(right);
	const length = Math.max(leftParts.length, rightParts.length);

	for (let index = 0; index < length; index++) {
		const leftPart = leftParts[index] || 0;
		const rightPart = rightParts[index] || 0;

		if (leftPart !== rightPart) {
			return rightPart - leftPart;
		}
	}

	return 0;
}

function getManifestVersion(fileName: string): string {
	return path.basename(fileName, '.xml').replace(/^sysmon-/, '');
}

function loadSchemas(): readonly SysmonSchemaDefinition[] {
	const manifestsRoot = path.join(__dirname, '../schema/manifests');
	const schemas: SysmonSchemaDefinition[] = [];

	for (const platform of KNOWN_PLATFORMS) {
		const platformDir = path.join(manifestsRoot, platform);
		if (!fs.existsSync(platformDir)) {
			continue;
		}
		const files = fs.readdirSync(platformDir)
			.filter(f => f.endsWith('.xml'))
			.sort((left, right) => compareSchemaVersionsDescending(getManifestVersion(left), getManifestVersion(right)));
		for (const file of files) {
			const xmlContent = fs.readFileSync(path.join(platformDir, file), 'utf8');
			schemas.push(parseManifest(xmlContent, platform));
		}
	}

	return Object.freeze(schemas);
}

export const SYSMON_SCHEMAS: readonly SysmonSchemaDefinition[] = loadSchemas();

function getDefaultSysmonSchema(): SysmonSchemaDefinition {
	const schema = SYSMON_SCHEMAS.find(candidate =>
		candidate.platform === DEFAULT_SYSMON_SCHEMA_PLATFORM
		&& candidate.schemaVersion === DEFAULT_SYSMON_SCHEMA_VERSION
	);

	if (!schema) {
		throw new Error(`Default Sysmon schema ${DEFAULT_SYSMON_SCHEMA_PLATFORM}:${DEFAULT_SYSMON_SCHEMA_VERSION} is not registered.`);
	}

	return schema;
}

export function getSysmonSchemaPlatforms(): readonly SysmonSchemaPlatform[] {
	const platforms = SYSMON_SCHEMAS.map(schema => schema.platform);

	return platforms.filter((platform, index) => platforms.indexOf(platform) === index);
}

export function getSysmonSchemaVersions(platform: string = DEFAULT_SYSMON_SCHEMA_PLATFORM): readonly string[] {
	return SYSMON_SCHEMAS
		.filter(schema => schema.platform === platform)
		.map(schema => schema.schemaVersion);
}

function getSchemaPlatform(platform: string | undefined): SysmonSchemaPlatform {
	return platform !== undefined && getSysmonSchemaPlatforms().indexOf(platform as SysmonSchemaPlatform) !== -1
		? platform as SysmonSchemaPlatform
		: DEFAULT_SYSMON_SCHEMA_PLATFORM;
}

function getDefaultSchemaVersion(platform: SysmonSchemaPlatform): string {
	const versions = getSysmonSchemaVersions(platform);

	if (platform === DEFAULT_SYSMON_SCHEMA_PLATFORM && versions.indexOf(DEFAULT_SYSMON_SCHEMA_VERSION) !== -1) {
		return DEFAULT_SYSMON_SCHEMA_VERSION;
	}

	return versions[0] || DEFAULT_SYSMON_SCHEMA_VERSION;
}

function isKnownSchemaPlatform(platform: string | undefined): boolean {
	return platform === undefined || getSysmonSchemaPlatforms().indexOf(platform as SysmonSchemaPlatform) !== -1;
}

function getSchemaVersion(platform: SysmonSchemaPlatform, schemaVersion: string | undefined, useRequestedVersion: boolean): string {
	const versions = getSysmonSchemaVersions(platform);

	return useRequestedVersion && schemaVersion !== undefined && versions.indexOf(schemaVersion) !== -1
		? schemaVersion
		: getDefaultSchemaVersion(platform);
}

export function getSysmonSchema(lookup: SysmonSchemaLookup = {}): SysmonSchemaDefinition {
	const platform = getSchemaPlatform(lookup.platform);
	const schemaVersion = getSchemaVersion(platform, lookup.schemaVersion, isKnownSchemaPlatform(lookup.platform));
	const schema = SYSMON_SCHEMAS.find(candidate =>
		candidate.platform === platform
		&& candidate.schemaVersion === schemaVersion
	);

	return schema || getDefaultSysmonSchema();
}

// Load a Sysmon schema from an arbitrary manifest XML file. Returns undefined if
// the file is missing or does not parse into a usable manifest, so callers can
// fall back to a built-in schema. The platform selects which target-scoped events
// are exposed (see parseManifest).
export function loadSysmonSchemaFromFile(filePath: string, platform?: string): SysmonSchemaDefinition | undefined {
	let xmlContent: string;

	try {
		xmlContent = fs.readFileSync(filePath, 'utf8');
	} catch {
		return undefined;
	}

	try {
		return parseManifest(xmlContent, getSchemaPlatform(platform));
	} catch {
		return undefined;
	}
}

const DEFAULT_SYSMON_SCHEMA = getDefaultSysmonSchema();

export const SYSMON_SCHEMA_PLATFORM = DEFAULT_SYSMON_SCHEMA.platform;
export const SYSMON_SCHEMA_VERSION = DEFAULT_SYSMON_SCHEMA.schemaVersion;
export const SYSMON_BINARY_VERSION = DEFAULT_SYSMON_SCHEMA.binaryVersion;
export const CONDITION_OPERATORS = DEFAULT_SYSMON_SCHEMA.conditionOperators;
export const SYSMON_EVENTS = DEFAULT_SYSMON_SCHEMA.events;

export function getEventDefinition(name: string): SysmonEventDefinition | undefined {
	return SYSMON_EVENTS.find(event => event.name === name || event.tag === name);
}
