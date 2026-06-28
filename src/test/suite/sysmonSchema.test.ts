import * as assert from 'assert';
import {
	CONDITION_OPERATORS,
	GROUP_RELATION_VALUES,
	ONMATCH_VALUES,
	SYSMON_EVENTS,
	getEventDefinition
} from '../../sysmonSchema';

suite('Sysmon Schema Data', () => {
	test('condition operators match current completion values', () => {
		assert.deepStrictEqual(CONDITION_OPERATORS, [
			'is',
			'is not',
			'is any',
			'contains',
			'contains any',
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
			'FileBlockExecutable',
			'FileExecutableDetected',
			'FileBlockShredding',
			'FileDeleteDetected',
			'ClipboardChange',
			'ProcessTampering'
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

	test('expanded events include expected field lists', () => {
		assert.deepStrictEqual(getFieldNames('FileCreateTime'), [
			'Image',
			'TargetFilename',
			'PreviousCreationUtcTime',
			'User'
		]);

		assert.deepStrictEqual(getFieldNames('ProcessAccess'), [
			'SourceThreadId',
			'SourceImage',
			'TargetImage',
			'GrantedAccess',
			'CallTrace',
			'SourceUser',
			'TargetUser'
		]);

		assert.deepStrictEqual(getFieldNames('RegistryEvent'), [
			'EventType',
			'Image',
			'TargetObject',
			'Details',
			'NewName',
			'User'
		]);

		assert.deepStrictEqual(getFieldNames('DnsQuery'), [
			'QueryName',
			'QueryStatus',
			'QueryResults',
			'Image',
			'User'
		]);

		assert.deepStrictEqual(getFieldNames('FileExecutableDetected'), [
			'User',
			'Image',
			'TargetFilename',
			'Hashes',
			'IsExecutable'
		]);
	});

	test('gets event definitions by name or tag', () => {
		assert.strictEqual(getEventDefinition('ProcessCreate')!.name, 'ProcessCreate');
		assert.strictEqual(getEventDefinition('ImageLoad')!.name, 'ImageLoad');
		assert.strictEqual(getEventDefinition('DoesNotExist'), undefined);
	});
});
