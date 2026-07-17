# Group Relation Completions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `groupRelation=""` completions sourced from the Sysmon schema module.

**Architecture:** Keep the existing prefix-based completion helper. Extend `src/extension.ts` to import and re-export `GROUP_RELATION_VALUES`, then add one new branch in `getAttributeCompletions()`.

**Tech Stack:** TypeScript 3.3, VS Code extension API, Mocha TDD tests, Node `assert`.

---

## File Structure

- `src/extension.ts`: import schema `GROUP_RELATION_VALUES`, export `GROUP_RELATION_COMPLETIONS`, and handle `groupRelation=""`.
- `src/test/suite/extension.test.ts`: test the exported completion values and helper behavior.
- `src/sysmonSchema.ts`: no expected changes.

---

### Task 1: Add Group Relation Completion Tests

**Files:**
- Modify: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Add the new import**

In `src/test/suite/extension.test.ts`, update the extension import block to include `GROUP_RELATION_COMPLETIONS`:

```ts
import {
	CONDITION_COMPLETIONS,
	GROUP_RELATION_COMPLETIONS,
	ONMATCH_COMPLETIONS,
	getAttributeCompletions
} from '../../extension';
```

- [ ] **Step 2: Add exported value test**

In the `Completion Helpers` suite, after the `onmatch completions include include and exclude` test, add:

```ts
	test('group relation completions include and and or', () => {
		assert.deepStrictEqual(GROUP_RELATION_COMPLETIONS, [
			'and',
			'or'
		]);
	});
```

- [ ] **Step 3: Add helper behavior test**

In the `Completion Helpers` suite, after the `returns onmatch completions after onmatch attribute prefix` test, add:

```ts
	test('returns group relation completions after groupRelation attribute prefix', () => {
		assert.deepStrictEqual(
			getAttributeCompletions('<RuleGroup groupRelation="'),
			GROUP_RELATION_COMPLETIONS
		);
	});
```

- [ ] **Step 4: Run compile to verify RED**

Run:

```bash
npm run compile
```

Expected: FAIL because `GROUP_RELATION_COMPLETIONS` is not exported from `src/extension.ts`.

Do not commit yet.

---

### Task 2: Implement Group Relation Completions

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Import and export group relation completions**

In `src/extension.ts`, replace:

```ts
import { CONDITION_OPERATORS, ONMATCH_VALUES } from './sysmonSchema';
```

with:

```ts
import { CONDITION_OPERATORS, GROUP_RELATION_VALUES, ONMATCH_VALUES } from './sysmonSchema';
```

Then add:

```ts
export const GROUP_RELATION_COMPLETIONS = GROUP_RELATION_VALUES;
```

next to the existing exported completion constants:

```ts
export const CONDITION_COMPLETIONS = CONDITION_OPERATORS;
export const GROUP_RELATION_COMPLETIONS = GROUP_RELATION_VALUES;
export const ONMATCH_COMPLETIONS = ONMATCH_VALUES;
```

- [ ] **Step 2: Add groupRelation prefix branch**

In `getAttributeCompletions()`, after the `onmatch=""` branch and before the final `return undefined`, add:

```ts
	if (linePrefix.endsWith('groupRelation="')) {
		return GROUP_RELATION_COMPLETIONS;
	}
```

- [ ] **Step 3: Run compile**

Run:

```bash
npm run compile
```

Expected: PASS.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test
```

Expected: PASS. Test count should increase by 2 from the previous suite.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add src/extension.ts src/test/suite/extension.test.ts
git commit -m "feat: add groupRelation completions"
```

---

### Task 3: Final Verification

**Files:**
- Verify all modified files

- [ ] **Step 1: Run audit**

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

- [ ] **Step 3: Run tests**

Run:

```bash
npm test
```

Expected: PASS with metadata, condition/onmatch/groupRelation completion tests, and schema data tests.

- [ ] **Step 4: Inspect status**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: only pre-existing `graphify-out/` may remain untracked.

---

## Self-Review

Spec coverage:

- `groupRelation=""` completions: Task 2.
- Values sourced from `GROUP_RELATION_VALUES`: Task 2.
- Existing condition/onmatch behavior preserved: Task 2 and Task 3.
- Tests for exported values and helper behavior: Task 1.
- Verification commands: Task 3.

No placeholders remain in this plan. Names are consistent across tasks:

- `GROUP_RELATION_VALUES`
- `GROUP_RELATION_COMPLETIONS`
- `getAttributeCompletions`
