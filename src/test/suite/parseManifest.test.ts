import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseManifest } from '../../parseManifest';

const MANIFESTS_ROOT = path.join(__dirname, '../../../schema/manifests');

function readManifest(platform: string, version: string): string {
	return fs.readFileSync(
		path.join(MANIFESTS_ROOT, platform, `sysmon-${version}.xml`),
		'utf8'
	);
}

suite('Manifest Parser', () => {
	test('parses schema and binary version from 4.91 manifest', () => {
		const schema = parseManifest(readManifest('windows', '4.91'), 'windows');

		assert.strictEqual(schema.schemaVersion, '4.91');
		assert.strictEqual(schema.binaryVersion, '18');
		assert.strictEqual(schema.platform, 'windows');
	});

	test('parses schema and binary version from 4.90 manifest', () => {
		const schema = parseManifest(readManifest('windows', '4.90'), 'windows');

		assert.strictEqual(schema.schemaVersion, '4.90');
		assert.strictEqual(schema.platform, 'windows');
	});

	test('parses condition operators from filters element', () => {
		const schema = parseManifest(readManifest('windows', '4.91'), 'windows');

		assert.deepStrictEqual(Array.from(schema.conditionOperators), [
			'is',
			'is not',
			'contains',
			'contains any',
			'is any',
			'contains all',
			'excludes',
			'excludes any',
			'excludes all',
			'begin with',
			'not begin with',
			'end with',
			'not end with',
			'less than',
			'more than',
			'image'
		]);
	});

	test('deduplicates shared-tag events and merges their fields', () => {
		const schema = parseManifest(readManifest('windows', '4.91'), 'windows');

		const registryEvent = schema.events.find(e => e.tag === 'RegistryEvent');
		assert.ok(registryEvent, 'RegistryEvent not found');
		assert.strictEqual(registryEvent.eventId, 12);

		const fieldNames = registryEvent.fields.map(f => f.name);
		assert.ok(fieldNames.includes('TargetObject'), 'missing TargetObject');
		assert.ok(fieldNames.includes('Details'), 'missing Details from event 13');
		assert.ok(fieldNames.includes('NewName'), 'missing NewName from event 14');
	});

	test('each event tag appears exactly once', () => {
		const schema = parseManifest(readManifest('windows', '4.91'), 'windows');
		const tags = schema.events.map(e => e.tag);
		const uniqueTags = [...new Set(tags)];

		assert.strictEqual(tags.length, uniqueTags.length);
	});

	test('ProcessCreate has expected fields', () => {
		const schema = parseManifest(readManifest('windows', '4.91'), 'windows');
		const event = schema.events.find(e => e.tag === 'ProcessCreate');

		assert.ok(event, 'ProcessCreate not found');
		assert.strictEqual(event.eventId, 1);

		const fieldNames = event.fields.map(f => f.name);
		assert.ok(fieldNames.includes('Image'));
		assert.ok(fieldNames.includes('CommandLine'));
		assert.ok(fieldNames.includes('ParentUser'));
	});

	test('parses a <manifests>-wrapped Linux manifest and applies target filtering', () => {
		const xml = readManifest('linux', '4.90');

		const linux = parseManifest(xml, 'linux');
		assert.strictEqual(linux.schemaVersion, '4.90');
		assert.strictEqual(linux.platform, 'linux');
		assert.ok(linux.events.some(e => e.tag === 'eBPFEvent'), 'Linux should include target="linux" events');
		assert.ok(linux.events.some(e => e.tag === 'ProcessCreate'), 'Linux should include target="all" events');

		// The same manifest parsed as windows must drop the target="linux" event.
		const windows = parseManifest(xml, 'windows');
		assert.ok(!windows.events.some(e => e.tag === 'eBPFEvent'), 'Windows must exclude target="linux" events');
		assert.ok(windows.events.some(e => e.tag === 'ProcessCreate'), 'Windows should keep target="all" events');
	});

	test('returned schema is frozen', () => {
		const schema = parseManifest(readManifest('windows', '4.91'), 'windows');

		assert.ok(Object.isFrozen(schema));
		assert.ok(Object.isFrozen(schema.conditionOperators));
		assert.ok(Object.isFrozen(schema.events));
		assert.ok(Object.isFrozen(schema.events[0]));
		assert.ok(Object.isFrozen(schema.events[0].fields));
	});
});
