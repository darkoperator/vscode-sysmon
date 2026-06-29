import * as assert from 'assert';
import {
	CONDITION_OPERATORS,
	DEFAULT_SYSMON_SCHEMA_PLATFORM,
	DEFAULT_SYSMON_SCHEMA_VERSION,
	GROUP_RELATION_VALUES,
	ONMATCH_VALUES,
	SYSMON_BINARY_VERSION,
	SYSMON_EVENTS,
	SYSMON_SCHEMAS,
	SYSMON_SCHEMA_PLATFORM,
	SYSMON_SCHEMA_VERSION,
	getEventDefinition,
	getSysmonSchema,
	getSysmonSchemaPlatforms,
	getSysmonSchemaVersions
} from '../../sysmonSchema';

suite('Sysmon Schema Data', () => {
	test('default schema metadata points to Windows Sysmon 4.91', () => {
		assert.strictEqual(DEFAULT_SYSMON_SCHEMA_PLATFORM, 'windows');
		assert.strictEqual(DEFAULT_SYSMON_SCHEMA_VERSION, '4.91');
		assert.strictEqual(SYSMON_SCHEMA_PLATFORM, 'windows');
		assert.strictEqual(SYSMON_SCHEMA_VERSION, '4.91');
		assert.strictEqual(SYSMON_BINARY_VERSION, '18');
		assert.strictEqual(getSysmonSchema().schemaVersion, '4.91');
		assert.strictEqual(getSysmonSchema().platform, 'windows');
	});

	test('registry contains only supported Windows schema versions', () => {
		assert.deepStrictEqual(
			SYSMON_SCHEMAS.map(schema => `${schema.platform}:${schema.schemaVersion}`),
			[
				'windows:4.91',
				'windows:4.90'
			]
		);
	});

	test('gets schemas by platform and version and falls back to the default schema', () => {
		assert.strictEqual(getSysmonSchema({ platform: 'windows', schemaVersion: '4.90' }).schemaVersion, '4.90');
		assert.strictEqual(getSysmonSchema({ platform: 'windows', schemaVersion: '4.91' }).schemaVersion, '4.91');
		assert.strictEqual(getSysmonSchema({ platform: 'linux', schemaVersion: '4.91' }).platform, 'windows');
		assert.strictEqual(getSysmonSchema({ platform: 'windows', schemaVersion: 'does-not-exist' }).schemaVersion, '4.91');
		assert.strictEqual(getSysmonSchema({ platform: 'does-not-exist', schemaVersion: '4.90' }).schemaVersion, '4.91');
		assert.strictEqual(getSysmonSchema().schemaVersion, '4.91');
	});

	test('lists supported schema platforms and platform-scoped versions', () => {
		assert.deepStrictEqual(getSysmonSchemaPlatforms(), ['windows']);
		assert.deepStrictEqual(getSysmonSchemaVersions('windows'), ['4.91', '4.90']);
		assert.deepStrictEqual(getSysmonSchemaVersions('linux'), []);
		assert.deepStrictEqual(getSysmonSchemaVersions(), ['4.91', '4.90']);
	});

	test('condition operators match current completion values', () => {
		assert.deepStrictEqual(CONDITION_OPERATORS, [
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

	test('onmatch values include include and exclude', () => {
		assert.deepStrictEqual(ONMATCH_VALUES, [
			'include',
			'exclude'
		]);
	});

	test('group relation values include and and or', () => {
		assert.deepStrictEqual(GROUP_RELATION_VALUES, [
			'and',
			'or'
		]);
	});

	test('events include Sysmon event definitions represented by snippets', () => {
		assert.deepStrictEqual(SYSMON_EVENTS.map(event => event.tag), [
			'ProcessCreate',
			'FileCreateTime',
			'NetworkConnect',
			'ProcessTerminate',
			'DriverLoad',
			'ImageLoad',
			'CreateRemoteThread',
			'RawAccessRead',
			'ProcessAccess',
			'FileCreate',
			'RegistryEvent',
			'FileCreateStreamHash',
			'PipeEvent',
			'WmiEvent',
			'DnsQuery',
			'FileDelete',
			'ClipboardChange',
			'ProcessTampering',
			'FileDeleteDetected',
			'FileBlockExecutable',
			'FileBlockShredding',
			'FileExecutableDetected'
		]);
	});

	test('events have unique tags and event ids', () => {
		const tags = SYSMON_EVENTS.map(event => event.tag);
		const eventIds = SYSMON_EVENTS.map(event => event.eventId);

		assert.strictEqual(new Set(tags).size, tags.length);
		assert.strictEqual(new Set(eventIds).size, eventIds.length);
	});

	test('every event has required metadata and fields', () => {
		for (const event of SYSMON_EVENTS) {
			assert.strictEqual(typeof event.eventId, 'number');
			assert.ok(event.tag.length > 0, `${event.name} should have a tag`);
			assert.ok(event.fields.length > 0, `${event.name} should have fields`);
		}
	});

	function getFieldNames(eventName: string): string[] {
		const event = getEventDefinition(eventName);

		assert.ok(event, `Expected ${eventName} to exist`);

		return event.fields.map(field => field.name);
	}

	test('expanded events include manifest-backed field lists', () => {
		assert.deepStrictEqual(getFieldNames('ProcessCreate'), [
			'RuleName',
			'UtcTime',
			'ProcessGuid',
			'ProcessId',
			'Image',
			'FileVersion',
			'Description',
			'Product',
			'Company',
			'OriginalFileName',
			'CommandLine',
			'CurrentDirectory',
			'User',
			'LogonGuid',
			'LogonId',
			'TerminalSessionId',
			'IntegrityLevel',
			'Hashes',
			'ParentProcessGuid',
			'ParentProcessId',
			'ParentImage',
			'ParentCommandLine',
			'ParentUser'
		]);

		assert.deepStrictEqual(getFieldNames('ImageLoad'), [
			'RuleName',
			'UtcTime',
			'ProcessGuid',
			'ProcessId',
			'Image',
			'ImageLoaded',
			'FileVersion',
			'Description',
			'Product',
			'Company',
			'OriginalFileName',
			'Hashes',
			'Signed',
			'Signature',
			'SignatureStatus',
			'User'
		]);

		assert.deepStrictEqual(getFieldNames('RegistryEvent'), [
			'RuleName',
			'EventType',
			'UtcTime',
			'ProcessGuid',
			'ProcessId',
			'Image',
			'TargetObject',
			'User',
			'Details',
			'NewName'
		]);

		assert.deepStrictEqual(getFieldNames('PipeEvent'), [
			'RuleName',
			'EventType',
			'UtcTime',
			'ProcessGuid',
			'ProcessId',
			'PipeName',
			'Image',
			'User'
		]);

		assert.deepStrictEqual(getFieldNames('WmiEvent'), [
			'RuleName',
			'EventType',
			'UtcTime',
			'Operation',
			'User',
			'EventNamespace',
			'Name',
			'Query',
			'Type',
			'Destination',
			'Consumer',
			'Filter'
		]);

		assert.deepStrictEqual(getFieldNames('FileExecutableDetected'), [
			'RuleName',
			'UtcTime',
			'ProcessGuid',
			'ProcessId',
			'User',
			'Image',
			'TargetFilename',
			'Hashes'
		]);
	});

	test('Windows 4.90 schema exposes the supported filterable event surface', () => {
		const schema = getSysmonSchema({ platform: 'windows', schemaVersion: '4.90' });

		assert.strictEqual(schema.schemaVersion, '4.90');
		assert.strictEqual(schema.binaryVersion, '18');
		assert.deepStrictEqual(
			schema.events.map(event => event.tag),
			SYSMON_EVENTS.map(event => event.tag)
		);
		assert.deepStrictEqual(
			schema.events.find(event => event.tag === 'FileExecutableDetected')!.fields.map(field => field.name),
			[
				'RuleName',
				'UtcTime',
				'ProcessGuid',
				'ProcessId',
				'User',
				'Image',
				'TargetFilename',
				'Hashes'
			]
		);
	});

	test('gets event definitions by name or tag', () => {
		assert.strictEqual(getEventDefinition('ProcessCreate')!.name, 'ProcessCreate');
		assert.strictEqual(getEventDefinition('ImageLoad')!.name, 'ImageLoad');
		assert.strictEqual(getEventDefinition('DoesNotExist'), undefined);
	});
});
