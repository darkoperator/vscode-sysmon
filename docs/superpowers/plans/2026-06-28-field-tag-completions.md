# Field Tag Completions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event-specific Sysmon field tag completions when editing inside a known event block.

**Architecture:** Reuse `SYSMON_EVENTS` in `src/sysmonSchema.ts` as the source of truth for event fields. Add an exported `getFieldCompletions(documentText, linePrefix)` helper in `src/extension.ts` with no VS Code dependency, then update the provider to check attribute completions, field completions, and event tag completions in that order.

**Tech Stack:** TypeScript, VS Code Extension API, Mocha, Node `assert`.

---

## File Structure

- Modify `src/test/suite/extension.test.ts`
  - Import `getFieldCompletions`.
  - Add direct helper tests for `ProcessCreate`, `NetworkConnect`, outside-event context, closed-event context, and non-element prefix.
- Modify `src/extension.ts`
  - Add `getFieldCompletions(documentText, linePrefix)`.
  - Update provider completion priority so field completions run before event tag completions.

No changes are needed in `src/sysmonSchema.ts`; starter event field data already exists.

---

### Task 1: Add Failing Field Completion Tests

**Files:**
- Modify: `src/test/suite/extension.test.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Import the field completion helper**

Change the import from `../../extension` to include `getFieldCompletions`:

```ts
import {
	CONDITION_COMPLETIONS,
	EVENT_TAG_COMPLETIONS,
	GROUP_RELATION_COMPLETIONS,
	ONMATCH_COMPLETIONS,
	getAttributeCompletions,
	getElementCompletions,
	getFieldCompletions
} from '../../extension';
```

- [ ] **Step 2: Add field completion tests**

Add these tests inside `suite('Completion Helpers', () => { ... })` after the event tag completion tests and before the attribute prefix tests:

```ts
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
```

- [ ] **Step 3: Run tests to verify the expected failure**

Run:

```bash
npm test
```

Expected result: TypeScript compilation fails because `getFieldCompletions` is not exported from `src/extension.ts`.

---

### Task 2: Implement Field Completion Helper

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Add `getFieldCompletions`**

Add this helper after `getElementCompletions()`:

```ts
export function getFieldCompletions(documentText: string, linePrefix: string): string[] | undefined {
	if (!linePrefix.endsWith('<')) {
		return undefined;
	}

	let activeEventTagIndex = -1;
	let activeEventFields: string[] | undefined;

	for (const event of SYSMON_EVENTS) {
		const lastEventOpen = documentText.lastIndexOf(`<${event.tag}`);
		const lastEventClose = documentText.lastIndexOf(`</${event.tag}>`);

		if (lastEventOpen > lastEventClose && lastEventOpen > activeEventTagIndex) {
			activeEventTagIndex = lastEventOpen;
			activeEventFields = event.fields.map(field => field.name);
		}
	}

	return activeEventFields;
}
```

- [ ] **Step 2: Run tests to verify the helper behavior**

Run:

```bash
npm test
```

Expected result: all tests pass, including the new field completion tests.

---

### Task 3: Wire Field Completions Into Provider

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Update provider completion priority**

Replace:

```ts
const values = getAttributeCompletions(linePrefix)
	|| getElementCompletions(document.getText(), linePrefix);
```

With:

```ts
const documentText = document.getText();
const values = getAttributeCompletions(linePrefix)
	|| getFieldCompletions(documentText, linePrefix)
	|| getElementCompletions(documentText, linePrefix);
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm test
```

Expected result: all tests pass.

---

### Task 4: Verify and Commit

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

Expected result: all tests pass.

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
git commit -m "feat: add field tag completions"
```

Expected result: a commit containing only the field tag completion implementation and tests.

---

## Self-Review

Spec coverage:

- `getFieldCompletions(documentText, linePrefix)` is added and exported in Task 2.
- Field completions are sourced from `SYSMON_EVENTS` in Task 2.
- The helper returns fields only when the prefix ends with `<` and the document is inside an open known event tag.
- Provider priority checks attribute completions, field completions, then event tag completions in Task 3.
- Tests cover `ProcessCreate`, `NetworkConnect`, outside context, closed context, and non-element prefix.
- Verification includes `npm audit`, `npm run compile`, and `npm test`.

Placeholder scan:

- No placeholder steps or vague implementation instructions remain.

Type consistency:

- The helper is consistently named `getFieldCompletions` and typed as `string[] | undefined`.
