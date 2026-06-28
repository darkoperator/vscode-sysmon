# Sysmon Schema Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small TypeScript schema module that becomes the shared source of truth for existing completion values and starter Sysmon event data.

**Architecture:** `src/sysmonSchema.ts` will own schema data and lookup helpers with no VS Code API dependency. `src/extension.ts` will continue to own VS Code provider registration and will re-export completion constants sourced from the schema module to preserve existing behavior.

**Tech Stack:** TypeScript 3.3, VS Code extension API, Mocha TDD tests, Node `assert`.

---

## File Structure

- Create `src/sysmonSchema.ts`: schema interfaces, constants, starter event data, and `getEventDefinition()`.
- Create `src/test/suite/sysmonSchema.test.ts`: schema data and lookup tests.
- Modify `src/extension.ts`: import schema constants and re-export current completion constants from schema data.
- Existing `src/test/suite/extension.test.ts`: no required edits; it should continue passing.

---

### Task 1: Schema Module Tests

**Files:**
- Create: `src/test/suite/sysmonSchema.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `src/test/suite/sysmonSchema.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run compile
```

Expected: FAIL with TypeScript error that `../../sysmonSchema` cannot be found.

- [ ] **Step 3: Commit nothing**

Do not commit the failing test alone unless specifically asked. Continue to Task 2.

---

### Task 2: Schema Module Implementation

**Files:**
- Create: `src/sysmonSchema.ts`
- Test: `src/test/suite/sysmonSchema.test.ts`

- [ ] **Step 1: Add the schema module**

Create `src/sysmonSchema.ts`:

```ts
export interface SysmonFieldDefinition {
	name: string;
	description?: string;
}

export interface SysmonEventDefinition {
	name: string;
	eventId: number;
	tag: string;
	description?: string;
	fields: SysmonFieldDefinition[];
}

export const CONDITION_OPERATORS = [
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
];

export const ONMATCH_VALUES = [
	'include',
	'exclude'
];

export const GROUP_RELATION_VALUES = [
	'and',
	'or'
];

export const SYSMON_EVENTS: SysmonEventDefinition[] = [
	{
		name: 'ProcessCreate',
		eventId: 1,
		tag: 'ProcessCreate',
		description: 'Process creation event.',
		fields: [
			{ name: 'Image' },
			{ name: 'CommandLine' },
			{ name: 'ParentImage' },
			{ name: 'ParentCommandLine' },
			{ name: 'User' },
			{ name: 'IntegrityLevel' },
			{ name: 'CurrentDirectory' },
			{ name: 'Hashes' }
		]
	},
	{
		name: 'NetworkConnect',
		eventId: 3,
		tag: 'NetworkConnect',
		description: 'Network connection event.',
		fields: [
			{ name: 'Image' },
			{ name: 'DestinationIp' },
			{ name: 'DestinationHostname' },
			{ name: 'DestinationPort' },
			{ name: 'DestinationPortName' },
			{ name: 'SourceIp' },
			{ name: 'SourceHostname' },
			{ name: 'SourcePort' },
			{ name: 'Protocol' },
			{ name: 'User' }
		]
	},
	{
		name: 'ImageLoad',
		eventId: 7,
		tag: 'ImageLoad',
		description: 'Image loaded into a process.',
		fields: [
			{ name: 'Image' },
			{ name: 'ImageLoaded' },
			{ name: 'Hashes' },
			{ name: 'Signed' },
			{ name: 'Signature' },
			{ name: 'SignatureStatus' },
			{ name: 'Company' },
			{ name: 'Description' },
			{ name: 'Product' }
		]
	}
];

export function getEventDefinition(name: string): SysmonEventDefinition | undefined {
	return SYSMON_EVENTS.find(event => event.name === name || event.tag === name);
}
```

- [ ] **Step 2: Run compile**

Run:

```bash
npm run compile
```

Expected: PASS.

- [ ] **Step 3: Run tests**

Run:

```bash
npm test
```

Expected: PASS with existing extension tests plus new schema tests.

- [ ] **Step 4: Commit schema module and tests**

Run:

```bash
git add src/sysmonSchema.ts src/test/suite/sysmonSchema.test.ts
git commit -m "feat: add Sysmon schema data module"
```

---

### Task 3: Wire Extension Completions to Schema Data

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`
- Test: `src/test/suite/sysmonSchema.test.ts`

- [ ] **Step 1: Update extension imports and exported constants**

In `src/extension.ts`, replace the hardcoded `CONDITION_COMPLETIONS` and `ONMATCH_COMPLETIONS` declarations with schema-backed exports.

The top of the file should become:

```ts
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CONDITION_OPERATORS, ONMATCH_VALUES } from './sysmonSchema';

export const CONDITION_COMPLETIONS = CONDITION_OPERATORS;
export const ONMATCH_COMPLETIONS = ONMATCH_VALUES;
```

Leave `getAttributeCompletions()`, `toCompletionItems()`, `activate()`, and `deactivate()` behavior unchanged.

- [ ] **Step 2: Run compile**

Run:

```bash
npm run compile
```

Expected: PASS.

- [ ] **Step 3: Run tests**

Run:

```bash
npm test
```

Expected: PASS. Existing completion tests should still pass because exported completion constants preserve the same values.

- [ ] **Step 4: Commit extension integration**

Run:

```bash
git add src/extension.ts
git commit -m "refactor: source completions from Sysmon schema data"
```

---

### Task 4: Final Verification

**Files:**
- Verify all modified files

- [ ] **Step 1: Run security audit**

Run:

```bash
npm audit
```

Expected: `found 0 vulnerabilities`.

- [ ] **Step 2: Run compile**

Run:

```bash
npm run compile
```

Expected: PASS.

- [ ] **Step 3: Run extension tests**

Run:

```bash
npm test
```

Expected: PASS with metadata, completion helper, and schema data tests.

- [ ] **Step 4: Inspect status and diff**

Run:

```bash
git status --short
git log --oneline -6
```

Expected: only pre-existing `graphify-out/` may remain untracked. Recent commits should include the schema module and schema-backed completion integration.

- [ ] **Step 5: Commit any verification-only fixes**

If verification found and fixed issues, commit them:

```bash
git add src/sysmonSchema.ts src/extension.ts src/test/suite/sysmonSchema.test.ts src/test/suite/extension.test.ts
git commit -m "fix: stabilize Sysmon schema module tests"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- `src/sysmonSchema.ts` module: Task 2.
- Condition and onmatch values moved into schema module: Tasks 2 and 3.
- `GROUP_RELATION_VALUES`: Task 2.
- Starter `SYSMON_EVENTS`: Task 2.
- `getEventDefinition()`: Task 2.
- Extension reads completion values from schema module: Task 3.
- Schema-focused tests: Task 1 and Task 2.
- Existing completion behavior preserved: Task 3 and Task 4.
- Verification commands: Task 4.

No placeholders remain in this plan. Names are consistent across tasks:

- `SysmonFieldDefinition`
- `SysmonEventDefinition`
- `CONDITION_OPERATORS`
- `ONMATCH_VALUES`
- `GROUP_RELATION_VALUES`
- `SYSMON_EVENTS`
- `getEventDefinition`
