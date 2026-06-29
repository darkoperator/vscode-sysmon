# Schema Platform and Version Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add platform-aware schema selection so completions and diagnostics resolve schemas by `sysmon.platform` plus `sysmon.schemaVersion`, defaulting to Windows `4.91`.

**Architecture:** `src/sysmonSchema.ts` owns schema registry lookup and supported platform/version metadata. `package.json` contributes the user settings. `src/extension.ts` reads settings at completion/diagnostic time and passes the resolved schema into existing helper functions through optional parameters.

**Tech Stack:** VS Code extension, TypeScript, Node `assert`, package contribution metadata, npm scripts.

---

## File Structure

- Modify `src/test/suite/sysmonSchema.test.ts`: add failing tests for platform-aware schema lookup and supported platform/version helpers.
- Modify `src/sysmonSchema.ts`: add platform/lookup types, platform-aware `getSysmonSchema()`, platform/version helpers, and default platform constants.
- Modify `src/test/suite/extension.test.ts`: add failing tests for package settings and schema-aware helper parameters.
- Modify `package.json`: contribute `sysmon.platform` and `sysmon.schemaVersion`.
- Modify `src/extension.ts`: read settings, pass selected schema to helpers, and refresh diagnostics on relevant config changes.

---

### Task 1: Add Failing Schema API Tests

**Files:**
- Modify: `src/test/suite/sysmonSchema.test.ts`

- [ ] **Step 1: Update imports**

Add these imports from `../../sysmonSchema`:

```ts
DEFAULT_SYSMON_SCHEMA_PLATFORM,
SYSMON_SCHEMA_PLATFORM,
getSysmonSchemaPlatforms,
getSysmonSchemaVersions
```

The import block should include:

```ts
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
```

- [ ] **Step 2: Expand default metadata test**

In `default schema metadata points to Windows Sysmon 4.91`, add:

```ts
assert.strictEqual(DEFAULT_SYSMON_SCHEMA_PLATFORM, 'windows');
assert.strictEqual(SYSMON_SCHEMA_PLATFORM, 'windows');
```

- [ ] **Step 3: Replace version-only lookup test**

Replace the current `gets schemas by version and falls back to the default schema` test with:

```ts
	test('gets schemas by platform and version and falls back to the default schema', () => {
		assert.strictEqual(getSysmonSchema({ platform: 'windows', schemaVersion: '4.90' }).schemaVersion, '4.90');
		assert.strictEqual(getSysmonSchema({ platform: 'windows', schemaVersion: '4.91' }).schemaVersion, '4.91');
		assert.strictEqual(getSysmonSchema({ platform: 'linux', schemaVersion: '4.91' }).platform, 'windows');
		assert.strictEqual(getSysmonSchema({ platform: 'windows', schemaVersion: 'does-not-exist' }).schemaVersion, '4.91');
		assert.strictEqual(getSysmonSchema({ platform: 'does-not-exist', schemaVersion: '4.90' }).schemaVersion, '4.91');
		assert.strictEqual(getSysmonSchema().schemaVersion, '4.91');
	});
```

- [ ] **Step 4: Add platform/version helper tests**

Add:

```ts
	test('lists supported schema platforms and platform-scoped versions', () => {
		assert.deepStrictEqual(getSysmonSchemaPlatforms(), ['windows']);
		assert.deepStrictEqual(getSysmonSchemaVersions('windows'), ['4.91', '4.90']);
		assert.deepStrictEqual(getSysmonSchemaVersions('linux'), []);
		assert.deepStrictEqual(getSysmonSchemaVersions(), ['4.91', '4.90']);
	});
```

- [ ] **Step 5: Update 4.90 schema test lookup**

Change:

```ts
const schema = getSysmonSchema('4.90');
```

to:

```ts
const schema = getSysmonSchema({ platform: 'windows', schemaVersion: '4.90' });
```

- [ ] **Step 6: Run tests and verify expected failure**

Run:

```bash
npm test
```

Expected: FAIL during TypeScript compile because the new schema constants/helpers and object lookup signature do not exist yet.

- [ ] **Step 7: Commit failing schema tests**

```bash
git add src/test/suite/sysmonSchema.test.ts
git commit -m "test: cover platform-aware schema lookup"
```

---

### Task 2: Implement Platform-Aware Schema API

**Files:**
- Modify: `src/sysmonSchema.ts`

- [ ] **Step 1: Add platform and lookup types**

Near the top of `src/sysmonSchema.ts`, add:

```ts
export type SysmonSchemaPlatform = 'windows';

export interface SysmonSchemaLookup {
	readonly platform?: string;
	readonly schemaVersion?: string;
}
```

Change `SysmonSchemaDefinition.platform` to:

```ts
readonly platform: SysmonSchemaPlatform;
```

- [ ] **Step 2: Add default platform constants**

Near `DEFAULT_SYSMON_SCHEMA_VERSION`, add:

```ts
export const DEFAULT_SYSMON_SCHEMA_PLATFORM: SysmonSchemaPlatform = 'windows';
```

After `DEFAULT_SYSMON_SCHEMA`, add:

```ts
export const SYSMON_SCHEMA_PLATFORM = DEFAULT_SYSMON_SCHEMA.platform;
```

- [ ] **Step 3: Add platform/version helper functions**

Add:

```ts
export function getSysmonSchemaPlatforms(): readonly SysmonSchemaPlatform[] {
	const platforms = SYSMON_SCHEMAS.map(schema => schema.platform);

	return platforms.filter((platform, index) => platforms.indexOf(platform) === index);
}

export function getSysmonSchemaVersions(platform: string = DEFAULT_SYSMON_SCHEMA_PLATFORM): readonly string[] {
	return SYSMON_SCHEMAS
		.filter(schema => schema.platform === platform)
		.map(schema => schema.schemaVersion);
}
```

- [ ] **Step 4: Replace `getSysmonSchema()`**

Replace the current string-based function with:

```ts
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

export function getSysmonSchema(lookup: SysmonSchemaLookup = {}): SysmonSchemaDefinition {
	const platform = getSysmonSchemaPlatforms().indexOf(lookup.platform as SysmonSchemaPlatform) === -1
		? DEFAULT_SYSMON_SCHEMA_PLATFORM
		: lookup.platform;
	const schemaVersion = lookup.schemaVersion || DEFAULT_SYSMON_SCHEMA_VERSION;
	const schema = SYSMON_SCHEMAS.find(candidate =>
		candidate.platform === platform
		&& candidate.schemaVersion === schemaVersion
	);

	return schema || getDefaultSysmonSchema();
}
```

- [ ] **Step 5: Run compile and tests**

Run:

```bash
npm run compile
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit schema implementation**

```bash
git add src/sysmonSchema.ts src/test/suite/sysmonSchema.test.ts
git commit -m "feat: add platform-aware schema lookup"
```

---

### Task 3: Add Failing Extension and Configuration Tests

**Files:**
- Modify: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Import schema lookup for explicit helper tests**

Add:

```ts
import { getSysmonSchema } from '../../sysmonSchema';
```

- [ ] **Step 2: Add package configuration metadata tests**

Inside `suite('Extension Metadata', () => { ... })`, add:

```ts
	test('contributes schema platform and version settings', () => {
		const properties = packageJson.contributes.configuration.properties;

		assert.strictEqual(properties['sysmon.platform'].default, 'windows');
		assert.deepStrictEqual(properties['sysmon.platform'].enum, ['windows']);
		assert.strictEqual(properties['sysmon.schemaVersion'].default, '4.91');
		assert.deepStrictEqual(properties['sysmon.schemaVersion'].enum, ['4.91', '4.90']);
	});
```

- [ ] **Step 3: Add explicit schema helper tests**

Inside `suite('Completion Helpers', () => { ... })`, add:

```ts
	test('completion helpers accept an explicit schema', () => {
		const schema = getSysmonSchema({ platform: 'windows', schemaVersion: '4.90' });

		assert.deepStrictEqual(getAttributeCompletions('<Image condition="', schema), CONDITION_COMPLETIONS);
		assert.deepStrictEqual(getElementCompletions('<EventFiltering>\n<', '<', schema), EVENT_TAG_COMPLETIONS);
		assert.deepStrictEqual(
			getFieldCompletions('<NetworkConnect>\n<', '<', schema),
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
```

Inside `suite('Diagnostic Helpers', () => { ... })`, add:

```ts
	test('diagnostic helper accepts an explicit schema', () => {
		const schema = getSysmonSchema({ platform: 'windows', schemaVersion: '4.90' });

		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n<Image condition="is">cmd.exe</Image>\n</ProcessCreate>\n</EventFiltering>', schema),
			[]
		);
	});
```

- [ ] **Step 4: Run tests and verify expected failure**

Run:

```bash
npm test
```

Expected: FAIL because `package.json` does not yet contribute `contributes.configuration`, and helper signatures do not yet accept explicit schemas.

- [ ] **Step 5: Commit failing extension/config tests**

```bash
git add src/test/suite/extension.test.ts
git commit -m "test: cover schema selection settings"
```

---

### Task 4: Add Settings and Wire Runtime Schema Selection

**Files:**
- Modify: `package.json`
- Modify: `src/extension.ts`

- [ ] **Step 1: Add configuration contribution**

In `package.json`, inside `contributes`, add a `configuration` object alongside `snippets`, `languages`, and `grammars`:

```json
"configuration": {
	"title": "Sysmon",
	"properties": {
		"sysmon.platform": {
			"type": "string",
			"default": "windows",
			"enum": [
				"windows"
			],
			"description": "Sysmon platform used for completions and diagnostics."
		},
		"sysmon.schemaVersion": {
			"type": "string",
			"default": "4.91",
			"enum": [
				"4.91",
				"4.90"
			],
			"description": "Sysmon schema version used for completions and diagnostics."
		}
	}
}
```

- [ ] **Step 2: Import schema APIs in extension**

Update the `src/extension.ts` import from `./sysmonSchema` to include:

```ts
	getSysmonSchema,
	SysmonSchemaDefinition
```

- [ ] **Step 3: Add selected schema helper**

Add after `CONDITION_ALIASES`:

```ts
function getConfiguredSysmonSchema(): SysmonSchemaDefinition {
	const configuration = vscode.workspace.getConfiguration('sysmon');

	return getSysmonSchema({
		platform: configuration.get<string>('platform'),
		schemaVersion: configuration.get<string>('schemaVersion')
	});
}
```

- [ ] **Step 4: Add schema parameters to helper functions**

Update helper signatures and internals:

```ts
export function getAttributeCompletions(
	linePrefix: string,
	schema: SysmonSchemaDefinition = getSysmonSchema()
): readonly string[] | undefined
```

Use `schema.conditionOperators` instead of `CONDITION_COMPLETIONS` for condition completions.

```ts
export function getElementCompletions(
	documentText: string,
	linePrefix: string,
	schema: SysmonSchemaDefinition = getSysmonSchema()
): readonly string[] | undefined
```

Return `schema.events.map(event => event.tag)`.

```ts
export function getFieldCompletions(
	documentText: string,
	linePrefix: string,
	schema: SysmonSchemaDefinition = getSysmonSchema()
): readonly string[] | undefined
```

Loop over `schema.events`.

Change `getActiveEvent()`, `getAllowedAttributeValues()`, `getAttributeDiagnostics()`, and `getSysmonDiagnostics()` to accept and pass `schema: SysmonSchemaDefinition`.

- [ ] **Step 5: Use configured schema at runtime**

In completion provider:

```ts
const schema = getConfiguredSysmonSchema();
const values = getAttributeCompletions(linePrefix, schema)
	|| getFieldCompletions(documentText, linePrefix, schema)
	|| getElementCompletions(documentText, linePrefix, schema);
```

In `updateDiagnostics()`:

```ts
const schema = getConfiguredSysmonSchema();
diagnosticCollection.set(
	document.uri,
	getSysmonDiagnostics(document.getText(), schema).map(diagnostic => toDiagnostic(document, diagnostic))
);
```

- [ ] **Step 6: Refresh diagnostics when schema settings change**

In `activate()`, add this subscription:

```ts
vscode.workspace.onDidChangeConfiguration(event => {
	if (!event.affectsConfiguration('sysmon.platform') && !event.affectsConfiguration('sysmon.schemaVersion')) {
		return;
	}

	for (const document of vscode.workspace.textDocuments) {
		updateDiagnostics(document, diagnosticCollection);
	}
})
```

Include it in `context.subscriptions.push(...)`.

- [ ] **Step 7: Run compile and tests**

Run:

```bash
npm run compile
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit runtime implementation**

```bash
git add package.json src/extension.ts src/test/suite/extension.test.ts
git commit -m "feat: add schema platform and version settings"
```

---

### Task 5: Final Verification

**Files:**
- No planned edits.

- [ ] **Step 1: Run audit**

```bash
npm audit
```

Expected: `found 0 vulnerabilities`.

- [ ] **Step 2: Run compile**

```bash
npm run compile
```

Expected: exit code 0.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Check git status**

```bash
git status --short
```

Expected: only the pre-existing untracked `graphify-out/` directory may remain.

---

## Self-Review

- Spec coverage: the plan covers settings, platform-aware lookup, helper parameters, runtime config reads, diagnostic refresh on config change, tests, and final verification.
- Placeholder scan: no open placeholders remain; all tasks name exact files, functions, commands, and expected outcomes.
- Type consistency: the plan uses `SysmonSchemaPlatform`, `SysmonSchemaLookup`, `SysmonSchemaDefinition`, `getSysmonSchemaPlatforms()`, and `getSysmonSchemaVersions(platform?: string)` consistently.
