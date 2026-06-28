# Windows Schema Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add checked-in Windows Sysmon schema support for versions `4.91` and `4.90`, with `4.91` as the default schema used by snippets, completions, and diagnostics.

**Architecture:** Keep `src/sysmonSchema.ts` as the runtime schema API, but change it from single-schema constants to a small registry with compatibility exports pointing at the default schema. Store the user-provided Windows manifests under `schema/manifests/windows/` as source-of-truth files, and update the Windows config snippet so it only offers the supported Windows schema versions.

**Tech Stack:** VS Code extension, TypeScript, Node `assert`, Node `fs`/`path`, JSON snippets, npm scripts.

---

## File Structure

- Create `schema/manifests/windows/sysmon-4.90.xml`: exact Windows Sysmon 4.90 manifest XML pasted by the user.
- Create `schema/manifests/windows/sysmon-4.91.xml`: exact Windows Sysmon 4.91 manifest XML pasted by the user.
- Modify `src/sysmonSchema.ts`: add `SysmonSchemaDefinition`, `DEFAULT_SYSMON_SCHEMA_VERSION`, `SYSMON_SCHEMAS`, `getSysmonSchema()`, default compatibility exports, and manifest-backed Windows event fields.
- Modify `src/test/suite/sysmonSchema.test.ts`: assert registry behavior, default metadata, filter order, event order, and representative manifest-backed fields.
- Create `src/test/suite/snippets.test.ts`: assert the Windows config snippet only offers `4.91` and `4.90`, and the Linux snippet remains `4.81`.
- Modify `snippets/smc.json`: update the Windows config snippet schema picker from old versions to `4.91,4.90`.

---

### Task 1: Add Failing Schema Registry Tests

**Files:**
- Modify: `src/test/suite/sysmonSchema.test.ts`

- [ ] **Step 1: Replace the schema test imports**

Use this import block at the top of `src/test/suite/sysmonSchema.test.ts`:

```ts
import * as assert from 'assert';
import {
	CONDITION_OPERATORS,
	DEFAULT_SYSMON_SCHEMA_VERSION,
	GROUP_RELATION_VALUES,
	ONMATCH_VALUES,
	SYSMON_BINARY_VERSION,
	SYSMON_EVENTS,
	SYSMON_SCHEMAS,
	SYSMON_SCHEMA_VERSION,
	getEventDefinition,
	getSysmonSchema
} from '../../sysmonSchema';
```

- [ ] **Step 2: Replace the first condition operator test with registry metadata tests**

Add these tests at the start of the `suite('Sysmon Schema Data', () => { ... })` body:

```ts
	test('default schema metadata points to Windows Sysmon 4.91', () => {
		assert.strictEqual(DEFAULT_SYSMON_SCHEMA_VERSION, '4.91');
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

	test('gets schemas by version and falls back to the default schema', () => {
		assert.strictEqual(getSysmonSchema('4.90').schemaVersion, '4.90');
		assert.strictEqual(getSysmonSchema('4.91').schemaVersion, '4.91');
		assert.strictEqual(getSysmonSchema('does-not-exist').schemaVersion, '4.91');
	});
```

- [ ] **Step 3: Update the condition operator test expected order**

Replace the existing `condition operators match current completion values` expected array with this manifest order:

```ts
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
```

- [ ] **Step 4: Update the event order test expected tags**

Replace the expected `SYSMON_EVENTS.map(event => event.tag)` array with:

```ts
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
```

- [ ] **Step 5: Replace the expanded field-list test with manifest-backed assertions**

Use this test body:

```ts
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
```

- [ ] **Step 6: Add a test that 4.90 exposes the same current Windows filterable surface**

Add:

```ts
	test('Windows 4.90 schema exposes the supported filterable event surface', () => {
		const schema = getSysmonSchema('4.90');

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
```

- [ ] **Step 7: Run the schema test and verify it fails for missing exports**

Run:

```bash
npm test -- --grep "Sysmon Schema Data"
```

Expected: FAIL. The compile/test output should mention missing exports such as `DEFAULT_SYSMON_SCHEMA_VERSION`, `SYSMON_SCHEMAS`, `SYSMON_SCHEMA_VERSION`, or `getSysmonSchema`.

- [ ] **Step 8: Commit failing tests**

```bash
git add src/test/suite/sysmonSchema.test.ts
git commit -m "test: cover Windows Sysmon schema registry"
```

---

### Task 2: Implement the Schema Registry and Default Manifest Data

**Files:**
- Modify: `src/sysmonSchema.ts`

- [ ] **Step 1: Add the schema definition interface and metadata constants**

Add this interface after `SysmonEventDefinition`:

```ts
export interface SysmonSchemaDefinition {
	platform: 'windows';
	schemaVersion: string;
	binaryVersion: string;
	conditionOperators: string[];
	events: SysmonEventDefinition[];
}
```

Define the manifest filter operator list in this order:

```ts
const WINDOWS_CONDITION_OPERATORS = [
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
];
```

- [ ] **Step 2: Replace `SYSMON_EVENTS` with shared Windows manifest-backed events**

Rename the current event array to:

```ts
const WINDOWS_SYSMON_EVENTS: SysmonEventDefinition[] = [
```

Update every event field list so it matches the pasted manifests. The exact event tag order is:

```ts
[
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
]
```

Use these exact field rules:

- Add `RuleName`, `UtcTime`, GUID/ID, and other runtime fields from each manifest event.
- Use manifest order for fields.
- For grouped `RegistryEvent`, `PipeEvent`, and `WmiEvent`, append new fields from later event IDs at the point first seen and skip duplicates.
- Ensure `FileExecutableDetected` does not include `IsExecutable`.
- Ensure `FileDeleteDetected` and `FileBlockShredding` do include `IsExecutable`.

- [ ] **Step 3: Add the schema registry exports**

Add this below `WINDOWS_SYSMON_EVENTS`:

```ts
export const DEFAULT_SYSMON_SCHEMA_VERSION = '4.91';

export const SYSMON_SCHEMAS: SysmonSchemaDefinition[] = [
	{
		platform: 'windows',
		schemaVersion: '4.91',
		binaryVersion: '18',
		conditionOperators: WINDOWS_CONDITION_OPERATORS,
		events: WINDOWS_SYSMON_EVENTS
	},
	{
		platform: 'windows',
		schemaVersion: '4.90',
		binaryVersion: '18',
		conditionOperators: WINDOWS_CONDITION_OPERATORS,
		events: WINDOWS_SYSMON_EVENTS
	}
];

export function getSysmonSchema(version: string = DEFAULT_SYSMON_SCHEMA_VERSION): SysmonSchemaDefinition {
	return SYSMON_SCHEMAS.find(schema => schema.schemaVersion === version) || SYSMON_SCHEMAS[0];
}

const DEFAULT_SYSMON_SCHEMA = getSysmonSchema();

export const SYSMON_SCHEMA_VERSION = DEFAULT_SYSMON_SCHEMA.schemaVersion;
export const SYSMON_BINARY_VERSION = DEFAULT_SYSMON_SCHEMA.binaryVersion;
export const CONDITION_OPERATORS = DEFAULT_SYSMON_SCHEMA.conditionOperators;
export const SYSMON_EVENTS = DEFAULT_SYSMON_SCHEMA.events;
```

Keep the existing `ONMATCH_VALUES`, `GROUP_RELATION_VALUES`, and `getEventDefinition()` exports.

- [ ] **Step 4: Run the schema tests and verify they pass**

Run:

```bash
npm test -- --grep "Sysmon Schema Data"
```

Expected: PASS for the Sysmon schema suite.

- [ ] **Step 5: Run compile and all tests to catch downstream expectation failures**

Run:

```bash
npm run compile
npm test
```

Expected: `npm run compile` passes. `npm test` may fail only where extension completion/diagnostic expectations need to include manifest-backed fields.

- [ ] **Step 6: Commit schema registry implementation**

```bash
git add src/sysmonSchema.ts src/test/suite/sysmonSchema.test.ts
git commit -m "feat: add Windows Sysmon schema registry"
```

---

### Task 3: Update Completion and Diagnostic Expectations for Manifest Fields

**Files:**
- Modify: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Update condition completion expected order**

In the `condition completions include current Sysmon operators` test, update the expected array so it matches:

```ts
[
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
]
```

- [ ] **Step 2: Update event completion expected order**

In the event tag completion test, use the same order from Task 1 Step 4.

- [ ] **Step 3: Update ProcessCreate field completion expectations**

In the `returns ProcessCreate field completions inside an open ProcessCreate block` test, expect:

```ts
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
```

- [ ] **Step 4: Update NetworkConnect field completion expectations**

In the `returns NetworkConnect field completions inside an open NetworkConnect block` test, expect:

```ts
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
```

- [ ] **Step 5: Update unknown-field diagnostic tests for newly valid fields**

Keep `DestinationIp` invalid under `ProcessCreate`, because it is still only a `NetworkConnect` field.

Add this assertion to an existing valid diagnostic test or a new test:

```ts
	assert.deepStrictEqual(
		getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n<RuleName condition="is">technique_id=T1059</RuleName>\n<ParentUser condition="contains">admin</ParentUser>\n</ProcessCreate>\n</EventFiltering>'),
		[]
	);
```

- [ ] **Step 6: Run extension tests**

Run:

```bash
npm test -- --grep "Sysmon Extension"
```

Expected: PASS for extension tests.

- [ ] **Step 7: Commit test expectation updates**

```bash
git add src/test/suite/extension.test.ts
git commit -m "test: align completions with manifest schema"
```

---

### Task 4: Add Manifest Files and Snippet Version Tests

**Files:**
- Create: `schema/manifests/windows/sysmon-4.90.xml`
- Create: `schema/manifests/windows/sysmon-4.91.xml`
- Create: `src/test/suite/snippets.test.ts`

- [ ] **Step 1: Add manifest XML files**

Create `schema/manifests/windows/`.

Populate `schema/manifests/windows/sysmon-4.90.xml` with the exact XML from the user's message that starts:

```xml
<manifest schemaversion="4.90" binaryversion="18">
```

Populate `schema/manifests/windows/sysmon-4.91.xml` with the exact XML from the user's message that starts:

```xml
<manifest schemaversion="4.91" binaryversion="18">
```

Do not synthesize or reformat the XML. Preserve the pasted manifest content as the checked-in source of truth.

- [ ] **Step 2: Add snippet tests**

Create `src/test/suite/snippets.test.ts` with:

```ts
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('Sysmon Snippets', () => {
	function getSnippets(): any {
		const snippetsPath = path.resolve(__dirname, '../../../snippets/smc.json');
		return JSON.parse(fs.readFileSync(snippetsPath, 'utf8'));
	}

	test('Windows config snippet only offers supported Windows schema versions', () => {
		const snippets = getSnippets();

		assert.deepStrictEqual(snippets['Template Sysmon Config'].body[0], '<Sysmon schemaversion="${1|4.91,4.90|}">');
	});

	test('Linux config snippet keeps its existing schema version picker', () => {
		const snippets = getSnippets();

		assert.deepStrictEqual(snippets['Template Sysmon Linux_Config'].body[0], '<Sysmon schemaversion="${1|4.81|}">');
	});

	test('Windows manifest source files are checked in for supported schemas', () => {
		const rootPath = path.resolve(__dirname, '../../..');
		const manifest490 = fs.readFileSync(path.join(rootPath, 'schema/manifests/windows/sysmon-4.90.xml'), 'utf8');
		const manifest491 = fs.readFileSync(path.join(rootPath, 'schema/manifests/windows/sysmon-4.91.xml'), 'utf8');

		assert.ok(manifest490.includes('<manifest schemaversion="4.90" binaryversion="18">'));
		assert.ok(manifest491.includes('<manifest schemaversion="4.91" binaryversion="18">'));
		assert.ok(manifest490.includes('<filters default="is">is,is not,contains,contains any,is any,contains all,excludes,excludes any,excludes all,begin with,not begin with,end with,not end with,less than,more than,image</filters>'));
		assert.ok(manifest491.includes('<filters default="is">is,is not,contains,contains any,is any,contains all,excludes,excludes any,excludes all,begin with,not begin with,end with,not end with,less than,more than,image</filters>'));
	});
});
```

- [ ] **Step 3: Run snippet tests and verify they fail before snippet edit**

Run:

```bash
npm test -- --grep "Sysmon Snippets"
```

Expected: FAIL because the Windows snippet still includes old schema versions.

- [ ] **Step 4: Commit failing snippet tests and manifest source files**

```bash
git add schema/manifests/windows/sysmon-4.90.xml schema/manifests/windows/sysmon-4.91.xml src/test/suite/snippets.test.ts
git commit -m "test: cover Windows Sysmon manifest sources and snippets"
```

---

### Task 5: Update the Windows Config Snippet

**Files:**
- Modify: `snippets/smc.json`

- [ ] **Step 1: Update the Windows config schema version picker**

Change the first body line under `"Template Sysmon Config"` from:

```json
"<Sysmon schemaversion=\"${1|4.90,4.70,4.81,4.82,4.83|}\">"
```

to:

```json
"<Sysmon schemaversion=\"${1|4.91,4.90|}\">"
```

Do not change `"Template Sysmon Linux_Config"`.

- [ ] **Step 2: Run snippet tests**

Run:

```bash
npm test -- --grep "Sysmon Snippets"
```

Expected: PASS.

- [ ] **Step 3: Run all tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Commit snippet update**

```bash
git add snippets/smc.json
git commit -m "fix: limit Windows schema snippet versions"
```

---

### Task 6: Final Verification

**Files:**
- No planned edits.

- [ ] **Step 1: Run audit**

Run:

```bash
npm audit
```

Expected: `found 0 vulnerabilities`.

- [ ] **Step 2: Run TypeScript compile**

Run:

```bash
npm run compile
```

Expected: command exits with code 0 and no TypeScript errors.

- [ ] **Step 3: Run test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Inspect git status**

Run:

```bash
git status --short
```

Expected: no tracked files modified. It is acceptable if the existing untracked `graphify-out/` directory is still present.

---

## Self-Review

- Spec coverage: the plan adds both Windows manifests, schema registry exports, default `4.91`, `4.90` registry support, snippet picker changes, Linux snippet preservation, and verification commands.
- Placeholder scan: no open-ended tasks are left. The only source-file instruction that references external content is intentional: the manifest files must preserve the exact user-pasted XML and should not be synthesized.
- Type consistency: `SysmonSchemaDefinition`, `DEFAULT_SYSMON_SCHEMA_VERSION`, `SYSMON_SCHEMAS`, `SYSMON_SCHEMA_VERSION`, `SYSMON_BINARY_VERSION`, and `getSysmonSchema()` are used consistently across tests and implementation.
