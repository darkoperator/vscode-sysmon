import * as assert from 'assert';
import * as path from 'path';
import {
	CONDITION_COMPLETIONS,
	EVENT_TAG_COMPLETIONS,
	GROUP_RELATION_COMPLETIONS,
	ONMATCH_COMPLETIONS,
	getAttributeCompletions,
	getElementCompletions,
	getFieldCompletions
} from '../../extension';

const packageJson = require(path.join(__dirname, '../../../package.json'));

suite('Extension Metadata', () => {
	test('activates only for the Sysmon language', () => {
		assert.deepStrictEqual(packageJson.activationEvents, ['onLanguage:smc']);
	});

	test('associates .smc files without claiming generic XML files', () => {
		const language = packageJson.contributes.languages.find((entry: any) => entry.id === 'smc');

		assert.ok(language, 'Expected smc language contribution');
		assert.deepStrictEqual(language.extensions, ['.smc']);
	});
});

suite('Completion Helpers', () => {
	test('condition completions include current Sysmon operators', () => {
		assert.deepStrictEqual(CONDITION_COMPLETIONS, [
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

	test('onmatch completions include include and exclude', () => {
		assert.deepStrictEqual(ONMATCH_COMPLETIONS, [
			'include',
			'exclude'
		]);
	});

	test('group relation completions include and and or', () => {
		assert.deepStrictEqual(GROUP_RELATION_COMPLETIONS, [
			'and',
			'or'
		]);
	});

	test('event tag completions include schema Sysmon events', () => {
		assert.deepStrictEqual(EVENT_TAG_COMPLETIONS, [
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

	test('returns event tag completions inside an open EventFiltering block', () => {
		assert.deepStrictEqual(
			getElementCompletions('<EventFiltering>\n<', '<'),
			EVENT_TAG_COMPLETIONS
		);
	});

	test('returns no event tag completions outside EventFiltering', () => {
		assert.strictEqual(getElementCompletions('<Sysmon>\n<', '<'), undefined);
	});

	test('returns no event tag completions after EventFiltering is closed', () => {
		assert.strictEqual(
			getElementCompletions('<EventFiltering>\n</EventFiltering>\n<', '<'),
			undefined
		);
	});

	test('returns no event tag completions when not starting an element', () => {
		assert.strictEqual(getElementCompletions('<EventFiltering>\n', ''), undefined);
	});

	test('returns ProcessCreate field completions inside an open ProcessCreate block', () => {
		assert.deepStrictEqual(
			getFieldCompletions('<ProcessCreate>\n<', '<'),
			[
				'Image',
				'CommandLine',
				'ParentImage',
				'ParentCommandLine',
				'User',
				'IntegrityLevel',
				'CurrentDirectory',
				'Hashes'
			]
		);
	});

	test('returns NetworkConnect field completions inside an open NetworkConnect block', () => {
		assert.deepStrictEqual(
			getFieldCompletions('<NetworkConnect>\n<', '<'),
			[
				'Image',
				'DestinationIp',
				'DestinationHostname',
				'DestinationPort',
				'DestinationPortName',
				'SourceIp',
				'SourceHostname',
				'SourcePort',
				'Protocol',
				'User'
			]
		);
	});

	test('returns no field completions outside known event tags', () => {
		assert.strictEqual(getFieldCompletions('<Sysmon>\n<', '<'), undefined);
	});

	test('returns no field completions after the event tag is closed', () => {
		assert.strictEqual(
			getFieldCompletions('<ProcessCreate>\n</ProcessCreate>\n<', '<'),
			undefined
		);
	});

	test('returns no field completions when not starting an element', () => {
		assert.strictEqual(getFieldCompletions('<ProcessCreate>\n', ''), undefined);
	});

	test('returns condition completions after condition attribute prefix', () => {
		assert.deepStrictEqual(
			getAttributeCompletions('<Image condition="'),
			CONDITION_COMPLETIONS
		);
	});

	test('returns onmatch completions after onmatch attribute prefix', () => {
		assert.deepStrictEqual(
			getAttributeCompletions('<ProcessCreate onmatch="'),
			ONMATCH_COMPLETIONS
		);
	});

	test('returns group relation completions after groupRelation attribute prefix', () => {
		assert.deepStrictEqual(
			getAttributeCompletions('<RuleGroup groupRelation="'),
			GROUP_RELATION_COMPLETIONS
		);
	});

	test('returns no completions outside supported attribute prefixes', () => {
		assert.strictEqual(getAttributeCompletions('<Image name="'), undefined);
		assert.strictEqual(getAttributeCompletions('<Image condition="value'), undefined);
		assert.strictEqual(getAttributeCompletions('<Image>'), undefined);
	});
});
