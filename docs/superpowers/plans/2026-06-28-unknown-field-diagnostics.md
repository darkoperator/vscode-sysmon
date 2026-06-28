# Unknown Field Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add warning diagnostics for unknown Sysmon field tags inside known Sysmon event blocks.

**Architecture:** Extend the existing lightweight diagnostic scanner in `src/extension.ts`. Replace the boolean `isInsideKnownEvent()` helper with an active-event lookup that returns the matching `SysmonEventDefinition`, then use that active event to validate field tags while preserving existing unknown-event behavior outside known events.

**Tech Stack:** TypeScript, VS Code Extension API, Mocha, Node `assert`.

---

## File Structure

- Modify `src/test/suite/extension.test.ts`
  - Add tests for unknown field diagnostics, valid fields, invalid fields for the active event, and unknown fields outside known events.
- Modify `src/extension.ts`
  - Import `SysmonEventDefinition`.
  - Add `getActiveEvent(documentText, offset)`.
  - Extend `getSysmonDiagnostics()` to validate tags inside a known event block against that event's field list.

No schema data or provider lifecycle wiring changes are needed.

---

### Task 1: Add Failing Field Diagnostic Tests

**Files:**
- Modify: `src/test/suite/extension.test.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Replace the old field-tag diagnostic boundary test**

Replace this existing test:

```ts
	test('does not report field tags inside known events', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n<Image condition="is">cmd.exe</Image>\n</ProcessCreate>\n</EventFiltering>'),
			[]
		);
	});
```

With:

```ts
	test('does not report known field tags inside known events', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n<Image condition="is">cmd.exe</Image>\n</ProcessCreate>\n</EventFiltering>'),
			[]
		);
	});
```

- [ ] **Step 2: Add unknown field diagnostic tests**

Add these tests after the renamed known-field test:

```ts
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
```

- [ ] **Step 3: Run tests to verify expected failure**

Run:

```bash
npm test
```

Expected result: the unknown field tests fail because `getSysmonDiagnostics()` currently skips tags inside known events.

---

### Task 2: Implement Active Event Field Diagnostics

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Import `SysmonEventDefinition`**

Change the schema import in `src/extension.ts` to:

```ts
import {
	CONDITION_OPERATORS,
	GROUP_RELATION_VALUES,
	ONMATCH_VALUES,
	SYSMON_EVENTS,
	SysmonEventDefinition
} from './sysmonSchema';
```

- [ ] **Step 2: Replace `isInsideKnownEvent()` with `getActiveEvent()`**

Replace:

```ts
function isInsideKnownEvent(documentText: string, offset: number): boolean {
	let activeEventTagIndex = -1;

	for (const event of SYSMON_EVENTS) {
		const textBeforeOffset = documentText.slice(0, offset);
		const lastEventOpen = textBeforeOffset.lastIndexOf(`<${event.tag}`);
		const lastEventClose = textBeforeOffset.lastIndexOf(`</${event.tag}>`);

		if (lastEventOpen > lastEventClose && lastEventOpen > activeEventTagIndex) {
			activeEventTagIndex = lastEventOpen;
		}
	}

	return activeEventTagIndex !== -1;
}
```

With:

```ts
function getActiveEvent(documentText: string, offset: number): SysmonEventDefinition | undefined {
	const textBeforeOffset = documentText.slice(0, offset);
	let activeEventTagIndex = -1;
	let activeEvent: SysmonEventDefinition | undefined;

	for (const event of SYSMON_EVENTS) {
		const lastEventOpen = textBeforeOffset.lastIndexOf(`<${event.tag}`);
		const lastEventClose = textBeforeOffset.lastIndexOf(`</${event.tag}>`);

		if (lastEventOpen > lastEventClose && lastEventOpen > activeEventTagIndex) {
			activeEventTagIndex = lastEventOpen;
			activeEvent = event;
		}
	}

	return activeEvent;
}
```

- [ ] **Step 3: Extend `getSysmonDiagnostics()`**

Inside `getSysmonDiagnostics()`, replace:

```ts
		if (isInsideKnownEvent(documentText, tagStart)) {
			continue;
		}

		if (structuralTags.has(tagName) || knownEventTags.has(tagName)) {
			continue;
		}
```

With:

```ts
		const activeEvent = getActiveEvent(documentText, tagStart);

		if (activeEvent) {
			if (tagName === activeEvent.tag) {
				continue;
			}

			if (activeEvent.fields.some(field => field.name === tagName)) {
				continue;
			}

			diagnostics.push({
				message: `Unknown Sysmon field tag "${tagName}" for event "${activeEvent.tag}".`,
				severity: vscode.DiagnosticSeverity.Warning,
				start: tagNameStart,
				end: tagNameEnd
			});
			continue;
		}

		if (structuralTags.has(tagName) || knownEventTags.has(tagName)) {
			continue;
		}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test
```

Expected result: all tests pass.

---

### Task 3: Verify and Commit

**Files:**
- Modify: `src/extension.ts`
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
git diff -- src/extension.ts src/test/suite/extension.test.ts
```

Expected result: only the planned source and test changes are staged or unstaged, plus any pre-existing unrelated untracked files such as `graphify-out/`.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/extension.ts src/test/suite/extension.test.ts
git commit -m "feat: add unknown field diagnostics"
```

Expected result: a commit containing only the unknown-field diagnostics implementation and tests.

---

## Self-Review

Spec coverage:

- Unknown field diagnostics inside known events are tested in Task 1 and implemented in Task 2.
- Known fields continue to produce no diagnostics.
- Fields valid in another event but invalid in the active event are tested.
- Existing unknown event behavior is preserved.
- VS Code diagnostic collection wiring is unchanged.
- Verification includes `npm audit`, `npm run compile`, and `npm test`.

Placeholder scan:

- No placeholder steps remain.

Type consistency:

- The active-event helper consistently returns `SysmonEventDefinition | undefined`.
