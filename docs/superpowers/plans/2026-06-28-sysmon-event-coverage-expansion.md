# Sysmon Event Coverage Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `SYSMON_EVENTS` so existing event and field completions cover the Sysmon event tags already represented by local snippets.

**Architecture:** Keep this data-only. Update schema tests first, expand `SYSMON_EVENTS` in `src/sysmonSchema.ts`, and adjust only completion tests that assert the full derived event tag list. Do not change provider logic in `src/extension.ts`.

**Tech Stack:** TypeScript, Mocha, Node `assert`, VS Code extension test runner.

---

## File Structure

- Modify `src/sysmonSchema.ts`
  - Expand `SYSMON_EVENTS` from 3 events to the 22 event tags represented by local snippets.
  - Preserve existing starter events and add curated field lists from `snippets/smc.json`.
- Modify `src/test/suite/sysmonSchema.test.ts`
  - Add expected event tag coverage, uniqueness tests, and selected field-list assertions.
- Modify `src/test/suite/extension.test.ts`
  - Update the existing `EVENT_TAG_COMPLETIONS` assertion because it derives from the expanded schema.

No provider behavior should change.

---

### Task 1: Add Failing Schema Coverage Tests

**Files:**
- Modify: `src/test/suite/sysmonSchema.test.ts`
- Modify: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Add expected event tag coverage tests**

In `src/test/suite/sysmonSchema.test.ts`, replace the existing `starter events include core Sysmon event definitions` test with:

```ts
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
```

- [ ] **Step 2: Add uniqueness tests**

Add this test after the event coverage test:

```ts
	test('events have unique tags and event ids', () => {
		const tags = SYSMON_EVENTS.map(event => event.tag);
		const eventIds = SYSMON_EVENTS.map(event => event.eventId);

		assert.strictEqual(new Set(tags).size, tags.length);
		assert.strictEqual(new Set(eventIds).size, eventIds.length);
	});
```

- [ ] **Step 3: Add selected field list tests**

Add this helper and test inside the `Sysmon Schema Data` suite:

```ts
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
```

- [ ] **Step 4: Update the derived event tag completion assertion**

In `src/test/suite/extension.test.ts`, replace the expected list in `event tag completions include starter Sysmon events` with the same 22 event tags from Step 1, and rename the test to:

```ts
	test('event tag completions include schema Sysmon events', () => {
```

- [ ] **Step 5: Run tests to verify expected failures**

Run:

```bash
npm test
```

Expected result: tests fail because the expanded event tags and selected field lists are not yet present in `SYSMON_EVENTS`.

---

### Task 2: Expand `SYSMON_EVENTS`

**Files:**
- Modify: `src/sysmonSchema.ts`
- Test: `src/test/suite/sysmonSchema.test.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Replace `SYSMON_EVENTS` with expanded data**

Replace the current `SYSMON_EVENTS` array with entries for:

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
	'FileBlockExecutable',
	'FileExecutableDetected',
	'FileBlockShredding',
	'FileDeleteDetected',
	'ClipboardChange',
	'ProcessTampering'
]
```

Use the event IDs and field lists from `docs/superpowers/specs/2026-06-28-sysmon-event-coverage-expansion-design.md`.

- [ ] **Step 2: Run tests**

Run:

```bash
npm test
```

Expected result: all schema and completion tests pass.

---

### Task 3: Verify and Commit

**Files:**
- Modify: `src/sysmonSchema.ts`
- Modify: `src/test/suite/sysmonSchema.test.ts`
- Modify: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Run audit**

Run:

```bash
npm audit
```

Expected result: `found 0 vulnerabilities`.

- [ ] **Step 2: Run compile**

Run:

```bash
npm run compile
```

Expected result: TypeScript exits successfully with no compile errors.

- [ ] **Step 3: Run extension tests**

Run:

```bash
npm test
```

Expected result: all extension tests pass.

- [ ] **Step 4: Review the worktree**

Run:

```bash
git status --short
git diff -- src/sysmonSchema.ts src/test/suite/sysmonSchema.test.ts src/test/suite/extension.test.ts
```

Expected result: only the planned schema and test changes are staged or unstaged, plus any pre-existing unrelated untracked files such as `graphify-out/`.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/sysmonSchema.ts src/test/suite/sysmonSchema.test.ts src/test/suite/extension.test.ts
git commit -m "feat: expand Sysmon event schema coverage"
```

Expected result: a commit containing only expanded schema data and tests.

---

## Self-Review

Spec coverage:

- Expanded event tags are asserted in Task 1 and implemented in Task 2.
- Field list coverage for selected events is asserted in Task 1 and implemented in Task 2.
- Event tag and event ID uniqueness are asserted in Task 1.
- `src/extension.ts` is not changed.
- Verification includes `npm audit`, `npm run compile`, and `npm test`.

Placeholder scan:

- No placeholder steps remain.

Type consistency:

- Existing `SysmonEventDefinition` and `SysmonFieldDefinition` shapes are reused unchanged.
