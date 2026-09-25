import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import {
	CONDITION_COMPLETIONS,
	EVENT_TAG_COMPLETIONS,
	GROUP_RELATION_COMPLETIONS,
	ONMATCH_COMPLETIONS,
	getAttributeCompletions,
	getElementCompletions,
	getFieldCompletions,
	getSysmonDiagnostics
} from '../../extension';
import { formatSysmonXml } from '../../formatter';
import { SysmonSchemaDefinition } from '../../sysmonSchema';

const packageJson = require(path.join(__dirname, '../../../package.json'));
const TEST_SCHEMA: SysmonSchemaDefinition = {
	platform: 'windows',
	schemaVersion: 'test',
	binaryVersion: 'test',
	conditionOperators: ['custom condition'],
	events: [
		{
			name: 'CustomEvent',
			eventId: 999,
			tag: 'CustomEvent',
			fields: [
				{ name: 'CustomField' }
			]
		}
	]
};

suite('Extension Metadata', () => {
	test('activates only for the Sysmon language', () => {
		assert.deepStrictEqual(packageJson.activationEvents, ['onLanguage:smc']);
	});

	test('associates .smc files without claiming generic XML files', () => {
		const language = packageJson.contributes.languages.find((entry: any) => entry.id === 'smc');

		assert.ok(language, 'Expected smc language contribution');
		assert.deepStrictEqual(language.extensions, ['.smc']);
	});

	test('contributes schema platform and version settings', () => {
		const properties = packageJson.contributes.configuration.properties;

		assert.strictEqual(properties['sysmon.platform'].default, 'windows');
		assert.deepStrictEqual(properties['sysmon.platform'].enum, ['windows', 'linux']);
		assert.strictEqual(properties['sysmon.schemaVersion'].default, '4.91');
		assert.deepStrictEqual(properties['sysmon.schemaVersion'].enum, ['4.91', '4.90']);
	});

	test('contributes a custom schema path setting', () => {
		const properties = packageJson.contributes.configuration.properties;

		assert.strictEqual(properties['sysmon.customSchemaPath'].type, 'string');
		assert.strictEqual(properties['sysmon.customSchemaPath'].default, '');
	});
});

suite('Formatting Helpers', () => {
	test('formats a compact Sysmon config as indented XML', () => {
		assert.strictEqual(
			formatSysmonXml('<Sysmon schemaversion="4.91"><EventFiltering><ProcessCreate onmatch="include"><Image condition="is">cmd.exe</Image></ProcessCreate></EventFiltering></Sysmon>', { insertSpaces: true, tabSize: 2 }),
			[
				'<Sysmon schemaversion="4.91">',
				'  <EventFiltering>',
				'    <ProcessCreate onmatch="include">',
				'      <Image condition="is">cmd.exe</Image>',
				'    </ProcessCreate>',
				'  </EventFiltering>',
				'</Sysmon>'
			].join('\n')
		);
	});

	test('preserves XML declarations and comments while formatting', () => {
		assert.strictEqual(
			formatSysmonXml('<?xml version="1.0"?><Sysmon><!-- keep --><EventFiltering></EventFiltering></Sysmon>', { insertSpaces: false, tabSize: 4 }),
			[
				'<?xml version="1.0"?>',
				'<Sysmon>',
				'\t<!-- keep -->',
				'\t<EventFiltering>',
				'\t</EventFiltering>',
				'</Sysmon>'
			].join('\n')
		);
	});
});

suite('Diagnostic Helpers', () => {
	test('reports unknown event tags inside EventFiltering', () => {
		const diagnostics = getSysmonDiagnostics('<EventFiltering>\n<BadEvent>\n</EventFiltering>');

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Unknown Sysmon event tag "BadEvent".');
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		assert.strictEqual(diagnostics[0].start, '<EventFiltering>\n<'.length);
		assert.strictEqual(diagnostics[0].end, '<EventFiltering>\n<BadEvent'.length);
	});

	test('does not report known event tags inside EventFiltering', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n</ProcessCreate>\n</EventFiltering>'),
			[]
		);
	});

	test('does not report unknown tags outside EventFiltering', () => {
		assert.deepStrictEqual(getSysmonDiagnostics('<Sysmon>\n<BadEvent>\n</Sysmon>'), []);
	});

	test('does not report structural tags inside EventFiltering', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<RuleGroup>\n<Rule>\n</Rule>\n</RuleGroup>\n</EventFiltering>'),
			[]
		);
	});

	test('does not report known field tags inside known events', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n<Image condition="is">cmd.exe</Image>\n</ProcessCreate>\n</EventFiltering>'),
			[]
		);
	});

	test('diagnostic helper accepts an explicit schema', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<CustomEvent>\n<CustomField condition="custom condition">value</CustomField>\n</CustomEvent>\n</EventFiltering>', TEST_SCHEMA),
			[]
		);
	});

	test('reports unknown field tags inside known events', () => {
		const documentText = '<EventFiltering>\n<ProcessCreate>\n<BadField>\n</ProcessCreate>\n</EventFiltering>';
		const diagnostics = getSysmonDiagnostics(documentText);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Unknown Sysmon field tag "BadField" for event "ProcessCreate".');
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		assert.strictEqual(diagnostics[0].start, '<EventFiltering>\n<ProcessCreate>\n<'.length);
		assert.strictEqual(diagnostics[0].end, '<EventFiltering>\n<ProcessCreate>\n<BadField'.length);
	});

	test('reports fields that are valid for another event but invalid for the active event', () => {
		const diagnostics = getSysmonDiagnostics(
			'<EventFiltering>\n<ProcessCreate>\n<DestinationIp>\n</ProcessCreate>\n</EventFiltering>'
		);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Unknown Sysmon field tag "DestinationIp" for event "ProcessCreate".');
	});

	test('does not report manifest-backed ProcessCreate fields', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n<RuleName condition="is">technique_id=T1059</RuleName>\n<ParentUser condition="contains">admin</ParentUser>\n</ProcessCreate>\n</EventFiltering>'),
			[]
		);
	});

	test('does not report unknown field diagnostics outside known events', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<BadField>\n</EventFiltering>'),
			[
				{
					message: 'Unknown Sysmon event tag "BadField".',
					severity: vscode.DiagnosticSeverity.Warning,
					start: '<EventFiltering>\n<'.length,
					end: '<EventFiltering>\n<BadField'.length
				}
			]
		);
	});

	test('reports invalid condition attribute values', () => {
		const documentText = '<EventFiltering>\n<ProcessCreate>\n<Image condition="bad">cmd.exe</Image>\n</ProcessCreate>\n</EventFiltering>';
		const diagnostics = getSysmonDiagnostics(documentText);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Invalid Sysmon condition value "bad".');
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		assert.strictEqual(diagnostics[0].start, documentText.indexOf('bad'));
		assert.strictEqual(diagnostics[0].end, documentText.indexOf('bad') + 'bad'.length);
	});

	test('reports invalid onmatch attribute values', () => {
		const documentText = '<EventFiltering>\n<ProcessCreate onmatch="bad">\n</ProcessCreate>\n</EventFiltering>';
		const diagnostics = getSysmonDiagnostics(documentText);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Invalid Sysmon onmatch value "bad".');
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		assert.strictEqual(diagnostics[0].start, documentText.indexOf('bad'));
		assert.strictEqual(diagnostics[0].end, documentText.indexOf('bad') + 'bad'.length);
	});

	test('reports duplicate include filters for the same event tag', () => {
		const documentText = '<EventFiltering>\n<ProcessCreate onmatch="include">\n</ProcessCreate>\n<ProcessCreate onmatch="include">\n</ProcessCreate>\n</EventFiltering>';
		const duplicateValueStart = documentText.lastIndexOf('include');
		const diagnostics = getSysmonDiagnostics(documentText);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Duplicate Sysmon ProcessCreate filter with onmatch="include". Only one include filter is allowed per event tag.');
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		assert.strictEqual(diagnostics[0].start, duplicateValueStart);
		assert.strictEqual(diagnostics[0].end, duplicateValueStart + 'include'.length);
	});

	test('reports duplicate exclude filters for the same event tag', () => {
		const documentText = '<EventFiltering>\n<NetworkConnect onmatch="exclude">\n</NetworkConnect>\n<NetworkConnect onmatch="exclude">\n</NetworkConnect>\n</EventFiltering>';
		const duplicateValueStart = documentText.lastIndexOf('exclude');
		const diagnostics = getSysmonDiagnostics(documentText);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Duplicate Sysmon NetworkConnect filter with onmatch="exclude". Only one exclude filter is allowed per event tag.');
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		assert.strictEqual(diagnostics[0].start, duplicateValueStart);
		assert.strictEqual(diagnostics[0].end, duplicateValueStart + 'exclude'.length);
	});

	test('allows one include and one exclude filter for the same event tag', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate onmatch="include">\n</ProcessCreate>\n<ProcessCreate onmatch="exclude">\n</ProcessCreate>\n</EventFiltering>'),
			[]
		);
	});

	test('reports invalid groupRelation attribute values', () => {
		const documentText = '<EventFiltering>\n<RuleGroup groupRelation="bad">\n</RuleGroup>\n</EventFiltering>';
		const diagnostics = getSysmonDiagnostics(documentText);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Invalid Sysmon groupRelation value "bad".');
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		assert.strictEqual(diagnostics[0].start, documentText.indexOf('bad'));
		assert.strictEqual(diagnostics[0].end, documentText.indexOf('bad') + 'bad'.length);
	});

	test('does not report valid current attribute values', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<RuleGroup groupRelation="or">\n<ProcessCreate onmatch="include">\n<Image condition="contains">cmd.exe</Image>\n</ProcessCreate>\n</RuleGroup>\n</EventFiltering>'),
			[]
		);
	});

	test('reports invalid condition spellings not in schema', () => {
		const diags = getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n<Image condition="begins with">C:\\Users\\</Image>\n<CommandLine condition="not ends with">.tmp</CommandLine>\n</ProcessCreate>\n</EventFiltering>');
		assert.strictEqual(diags.length, 2);
	});

	test('reports unsupported root schema version', () => {
		const documentText = '<Sysmon schemaversion="4.30">\n<EventFiltering>\n</EventFiltering>\n</Sysmon>';
		const diagnostics = getSysmonDiagnostics(documentText);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Unsupported Sysmon schema version "4.30". Supported versions: 4.91, 4.90.');
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		assert.strictEqual(diagnostics[0].start, documentText.indexOf('4.30'));
		assert.strictEqual(diagnostics[0].end, documentText.indexOf('4.30') + '4.30'.length);
	});

	test('does not report supported root schema versions', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<Sysmon schemaversion="4.91">\n<EventFiltering>\n</EventFiltering>\n</Sysmon>'),
			[]
		);
		assert.deepStrictEqual(
			getSysmonDiagnostics('<Sysmon schemaversion="4.90">\n<EventFiltering>\n</EventFiltering>\n</Sysmon>'),
			[]
		);
	});

	test('does not report a root tag without a schema version', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<Sysmon>\n<EventFiltering>\n</EventFiltering>\n</Sysmon>'),
			[]
		);
	});

	test('does not report root schema versions inside comments', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<!-- <Sysmon schemaversion="4.30"> -->\n<EventFiltering>\n</EventFiltering>'),
			[]
		);
	});

	test('does not report unknown attributes', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate name="anything">\n</ProcessCreate>\n</EventFiltering>'),
			[]
		);
	});

	test('does not report attributes inside comments', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<!-- <Image condition="bad">cmd.exe</Image> -->\n</EventFiltering>'),
			[]
		);
	});

	test('does not report comments or XML declarations', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<?xml version="1.0"?>\n<EventFiltering>\n<!-- <BadEvent> -->\n</EventFiltering>'),
			[]
		);
	});

	test('ignores a commented-out event when resolving the active event', () => {
		// CommandLine is a ProcessCreate field but NOT a ProcessTerminate field. The
		// commented-out <ProcessCreate> must not be treated as the active event, so the
		// invalid field is correctly attributed to ProcessTerminate.
		const diagnostics = getSysmonDiagnostics(
			'<EventFiltering>\n<ProcessTerminate onmatch="include">\n<!-- <ProcessCreate> -->\n<CommandLine condition="is">x</CommandLine>\n</ProcessTerminate>\n</EventFiltering>'
		);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Unknown Sysmon field tag "CommandLine" for event "ProcessTerminate".');
	});

	test('does not treat attribute-looking text content as an attribute', () => {
		// The condition="bad" substring lives in element text, not in a tag, so it must
		// not be flagged. Only the real condition="is" attribute is validated.
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n<Image condition="is">value with condition="bad" inside</Image>\n</ProcessCreate>\n</EventFiltering>'),
			[]
		);
	});

	test('resolves the active event through nested RuleGroup structure', () => {
		const diagnostics = getSysmonDiagnostics(
			'<EventFiltering>\n<RuleGroup groupRelation="or">\n<NetworkConnect onmatch="include">\n<CommandLine condition="is">x</CommandLine>\n</NetworkConnect>\n</RuleGroup>\n</EventFiltering>'
		);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Unknown Sysmon field tag "CommandLine" for event "NetworkConnect".');
	});

	test('reports invalid condition values on multiline tags', () => {
		const documentText = '<EventFiltering>\n<ProcessCreate>\n<Image\ncondition="bad">cmd.exe</Image>\n</ProcessCreate>\n</EventFiltering>';
		const diagnostics = getSysmonDiagnostics(documentText);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Invalid Sysmon condition value "bad".');
		assert.strictEqual(diagnostics[0].start, documentText.indexOf('bad'));
	});
});

suite('Completion Helpers', () => {
	test('condition completions include current Sysmon operators', () => {
		assert.deepStrictEqual(CONDITION_COMPLETIONS, [
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
			'ClipboardChange',
			'ProcessTampering',
			'FileDeleteDetected',
			'FileBlockExecutable',
			'FileBlockShredding',
			'FileExecutableDetected'
		]);
	});

	test('returns event tag completions inside an open EventFiltering block', () => {
		assert.deepStrictEqual(
			getElementCompletions('<EventFiltering>\n<', '<'),
			EVENT_TAG_COMPLETIONS
		);
	});

	test('returns event tag completions at the cursor when the document continues afterward', () => {
		const documentText = '<Sysmon>\n<EventFiltering>\n<\n</EventFiltering>\n</Sysmon>';
		const cursorOffset = documentText.indexOf('<\n</EventFiltering>') + 1;

		assert.deepStrictEqual(
			(getElementCompletions as any)(documentText, '<', cursorOffset),
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
			]
		);
	});

	test('returns field completions at the cursor when the event closes later', () => {
		const documentText = '<EventFiltering>\n<ProcessCreate>\n<\n</ProcessCreate>\n</EventFiltering>';
		const cursorOffset = documentText.indexOf('<\n</ProcessCreate>') + 1;

		assert.deepStrictEqual(
			(getFieldCompletions as any)(documentText, '<', cursorOffset),
			[
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
			]
		);
	});

	test('returns NetworkConnect field completions inside an open NetworkConnect block', () => {
		assert.deepStrictEqual(
			getFieldCompletions('<NetworkConnect>\n<', '<'),
			[
				'RuleName',
				'UtcTime',
				'ProcessGuid',
				'ProcessId',
				'Image',
				'User',
				'Protocol',
				'Initiated',
				'SourceIsIpv6',
				'SourceIp',
				'SourceHostname',
				'SourcePort',
				'SourcePortName',
				'DestinationIsIpv6',
				'DestinationIp',
				'DestinationHostname',
				'DestinationPort',
				'DestinationPortName'
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

	test('completion helpers accept an explicit schema', () => {
		assert.deepStrictEqual(getAttributeCompletions('<CustomField condition="', TEST_SCHEMA), ['custom condition']);
		assert.deepStrictEqual(getElementCompletions('<EventFiltering>\n<', '<', TEST_SCHEMA), ['CustomEvent']);
		assert.deepStrictEqual(getFieldCompletions('<CustomEvent>\n<', '<', TEST_SCHEMA), ['CustomField']);
	});
});
