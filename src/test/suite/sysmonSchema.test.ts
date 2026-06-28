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

	test('starter events include core Sysmon event definitions', () => {
		assert.ok(SYSMON_EVENTS.some(event => event.name === 'ProcessCreate'));
		assert.ok(SYSMON_EVENTS.some(event => event.name === 'NetworkConnect'));
		assert.ok(SYSMON_EVENTS.some(event => event.name === 'ImageLoad'));
	});

	test('every starter event has required metadata and fields', () => {
		for (const event of SYSMON_EVENTS) {
			assert.strictEqual(typeof event.eventId, 'number');
			assert.ok(event.tag.length > 0, `${event.name} should have a tag`);
			assert.ok(event.fields.length > 0, `${event.name} should have fields`);
		}
	});

	test('gets event definitions by name or tag', () => {
		assert.strictEqual(getEventDefinition('ProcessCreate')!.name, 'ProcessCreate');
		assert.strictEqual(getEventDefinition('ImageLoad')!.name, 'ImageLoad');
		assert.strictEqual(getEventDefinition('DoesNotExist'), undefined);
	});
});
