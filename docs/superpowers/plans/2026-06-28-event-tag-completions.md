# Event Tag Completions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sysmon event tag completions when editing a new element inside an open `EventFiltering` block.

**Architecture:** Reuse the existing schema data as the source of truth by deriving `EVENT_TAG_COMPLETIONS` from `SYSMON_EVENTS`. Add a small exported helper in `src/extension.ts` that checks the line prefix and a lightweight document-text context test. Keep the existing provider flow, checking attribute completions first and then element completions.

**Tech Stack:** TypeScript, VS Code Extension API, Mocha, Node `assert`.

---

## File Structure

- Modify `src/test/suite/extension.test.ts`
  - Add tests for the exported event tag list and `getElementCompletions()` helper.
  - Keep the existing attribute completion tests unchanged.
- Modify `src/extension.ts`
  - Import `SYSMON_EVENTS`.
  - Export `EVENT_TAG_COMPLETIONS`.
  - Add `getElementCompletions(documentText, linePrefix)`.
  - Update the completion provider to use attribute completions first, then element completions.

No schema file changes are needed because `src/sysmonSchema.ts` already contains the starter event definitions.

---

### Task 1: Add Failing Event Completion Tests

**Files:**
- Modify: `src/test/suite/extension.test.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Import the new helper and completion constant**

Change the import from `../../extension` to include `EVENT_TAG_COMPLETIONS` and `getElementCompletions`:

```ts
import {
	CONDITION_COMPLETIONS,
	EVENT_TAG_COMPLETIONS,
	GROUP_RELATION_COMPLETIONS,
	ONMATCH_COMPLETIONS,
	getAttributeCompletions,
	getElementCompletions
} from '../../extension';
```

- [ ] **Step 2: Add tests for event tag completions**

Add these tests inside the existing `suite('Completion Helpers', () => { ... })` block after the group relation completions test and before the attribute prefix tests:

```ts
	test('event tag completions include starter Sysmon events', () => {
		assert.deepStrictEqual(EVENT_TAG_COMPLETIONS, [
			'ProcessCreate',
			'NetworkConnect',
			'ImageLoad'
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
```

- [ ] **Step 3: Run the tests to verify they fail for the expected reason**

Run:

```bash
npm test
```

Expected result: TypeScript compilation fails because `EVENT_TAG_COMPLETIONS` and `getElementCompletions` are not exported from `src/extension.ts`.

---

### Task 2: Implement Event Tag Completions

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Import `SYSMON_EVENTS`**

Change the schema import in `src/extension.ts` to:

```ts
import {
	CONDITION_OPERATORS,
	GROUP_RELATION_VALUES,
	ONMATCH_VALUES,
	SYSMON_EVENTS
} from './sysmonSchema';
```

- [ ] **Step 2: Export event tag completion values**

Add this export after the existing completion constants:

```ts
export const EVENT_TAG_COMPLETIONS = SYSMON_EVENTS.map(event => event.tag);
```

- [ ] **Step 3: Add the element completion helper**

Add this helper after `getAttributeCompletions()`:

```ts
export function getElementCompletions(documentText: string, linePrefix: string): string[] | undefined {
	if (!linePrefix.endsWith('<')) {
		return undefined;
	}

	const lastEventFilteringOpen = documentText.lastIndexOf('<EventFiltering');
	const lastEventFilteringClose = documentText.lastIndexOf('</EventFiltering>');

	if (lastEventFilteringOpen === -1 || lastEventFilteringOpen < lastEventFilteringClose) {
		return undefined;
	}

	return EVENT_TAG_COMPLETIONS;
}
```

- [ ] **Step 4: Update the provider completion flow**

Replace the current provider body:

```ts
const linePrefix = document.lineAt(position).text.substr(0, position.character);
const values = getAttributeCompletions(linePrefix);

if (!values) {
	return undefined;
}

return toCompletionItems(values);
```

With:

```ts
const linePrefix = document.lineAt(position).text.substr(0, position.character);
const values = getAttributeCompletions(linePrefix)
	|| getElementCompletions(document.getText(), linePrefix);

if (!values) {
	return undefined;
}

return toCompletionItems(values);
```

- [ ] **Step 5: Register `<` as a completion trigger**

Change the completion provider trigger list from:

```ts
'"'
```

To:

```ts
'"',
'<'
```

- [ ] **Step 6: Run the tests to verify the feature passes**

Run:

```bash
npm test
```

Expected result: All tests pass, including the new event tag completion tests.

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
git commit -m "feat: add event tag completions"
```

Expected result: a commit containing only the event tag completion implementation and tests.

---

## Self-Review

Spec coverage:

- Event tag completions are exported from `src/extension.ts` in Task 2.
- `getElementCompletions(documentText, linePrefix)` is added in Task 2.
- The helper returns event tags only when the prefix ends with `<` and the document is inside an open `EventFiltering` block.
- Attribute completions remain first in the provider flow.
- Tests cover the event list, inside context, outside context, closed context, and non-element prefix.
- Verification includes `npm audit`, `npm run compile`, and `npm test`.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified implementation steps remain.

Type consistency:

- The plan consistently uses `EVENT_TAG_COMPLETIONS` and `getElementCompletions(documentText: string, linePrefix: string): string[] | undefined`.
