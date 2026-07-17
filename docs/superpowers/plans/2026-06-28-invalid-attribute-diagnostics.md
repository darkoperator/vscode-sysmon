# Invalid Attribute Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add warning diagnostics for invalid `condition`, `onmatch`, and `groupRelation` attribute values.

**Architecture:** Extend the existing pure `getSysmonDiagnostics(documentText)` helper by appending attribute diagnostics after tag diagnostics. Keep completion constants and provider behavior unchanged; only validate quoted attribute values using existing schema constants plus TrustedSec-compatible condition aliases.

**Tech Stack:** TypeScript, VS Code Extension API, Mocha, Node `assert`.

---

## File Structure

- Modify `src/test/suite/extension.test.ts`
  - Add tests for invalid attribute values.
  - Add tests for valid current values, TrustedSec-compatible aliases, unknown attributes, and comments.
- Modify `src/extension.ts`
  - Add accepted condition aliases.
  - Add `getAttributeDiagnostics(documentText)`.
  - Append attribute diagnostics from `getSysmonDiagnostics()`.

No schema constants or completion values should change.

---

### Task 1: Add Failing Attribute Diagnostic Tests

**Files:**
- Modify: `src/test/suite/extension.test.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Add invalid attribute diagnostics tests**

Add these tests inside `suite('Diagnostic Helpers', () => { ... })`, after the existing field diagnostics tests and before the comments/declarations test:

```ts
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

	test('reports invalid groupRelation attribute values', () => {
		const documentText = '<EventFiltering>\n<RuleGroup groupRelation="bad">\n</RuleGroup>\n</EventFiltering>';
		const diagnostics = getSysmonDiagnostics(documentText);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, 'Invalid Sysmon groupRelation value "bad".');
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		assert.strictEqual(diagnostics[0].start, documentText.indexOf('bad'));
		assert.strictEqual(diagnostics[0].end, documentText.indexOf('bad') + 'bad'.length);
	});
```

- [ ] **Step 2: Add valid and ignored attribute tests**

Add these tests after the invalid attribute tests:

```ts
	test('does not report valid current attribute values', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<RuleGroup groupRelation="or">\n<ProcessCreate onmatch="include">\n<Image condition="contains">cmd.exe</Image>\n</ProcessCreate>\n</RuleGroup>\n</EventFiltering>'),
			[]
		);
	});

	test('does not report TrustedSec condition spelling aliases', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<EventFiltering>\n<ProcessCreate>\n<Image condition="begins with">C:\\Users\\</Image>\n<CommandLine condition="not ends with">.tmp</CommandLine>\n</ProcessCreate>\n</EventFiltering>'),
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
```

- [ ] **Step 3: Run tests to verify expected failure**

Run:

```bash
npm test
```

Expected result: invalid attribute tests fail because `getSysmonDiagnostics()` currently does not validate attribute values.

---

### Task 2: Implement Attribute Value Diagnostics

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Add TrustedSec-compatible aliases**

Add this constant after `STRUCTURAL_TAGS`:

```ts
const CONDITION_ALIASES = [
	'begins with',
	'not begins with',
	'ends with',
	'not ends with'
];
```

- [ ] **Step 2: Add allowed value helper**

Add this helper before `getSysmonDiagnostics()`:

```ts
function getAllowedAttributeValues(attributeName: string): string[] | undefined {
	if (attributeName === 'condition') {
		return CONDITION_OPERATORS.concat(CONDITION_ALIASES);
	}

	if (attributeName === 'onmatch') {
		return ONMATCH_VALUES;
	}

	if (attributeName === 'groupRelation') {
		return GROUP_RELATION_VALUES;
	}

	return undefined;
}
```

- [ ] **Step 3: Add attribute diagnostic helper**

Add this helper before `getSysmonDiagnostics()`:

```ts
function getAttributeDiagnostics(documentText: string): SysmonDiagnostic[] {
	const diagnostics: SysmonDiagnostic[] = [];
	const attributePattern = /\b(condition|onmatch|groupRelation)="([^"]*)"/g;
	let match: RegExpExecArray | null;

	while ((match = attributePattern.exec(documentText)) !== null) {
		const attributeName = match[1];
		const attributeValue = match[2];
		const valueStart = match.index + attributeName.length + '="'.length;
		const valueEnd = valueStart + attributeValue.length;
		const allowedValues = getAllowedAttributeValues(attributeName);

		if (!allowedValues || allowedValues.indexOf(attributeValue) !== -1) {
			continue;
		}

		if (isInsideComment(documentText, match.index)) {
			continue;
		}

		diagnostics.push({
			message: `Invalid Sysmon ${attributeName} value "${attributeValue}".`,
			severity: vscode.DiagnosticSeverity.Warning,
			start: valueStart,
			end: valueEnd
		});
	}

	return diagnostics;
}
```

- [ ] **Step 4: Append attribute diagnostics**

At the end of `getSysmonDiagnostics()`, replace:

```ts
	return diagnostics;
```

With:

```ts
	return diagnostics.concat(getAttributeDiagnostics(documentText));
```

- [ ] **Step 5: Run tests**

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
git commit -m "feat: add invalid attribute diagnostics"
```

Expected result: a commit containing only invalid attribute diagnostic implementation and tests.

---

## Self-Review

Spec coverage:

- Invalid `condition`, `onmatch`, and `groupRelation` diagnostics are tested in Task 1 and implemented in Task 2.
- Valid current values and TrustedSec-compatible condition aliases are tested.
- Unknown attributes and comments are ignored.
- Existing event and field diagnostics are preserved.
- Completion constants are unchanged.
- Verification includes `npm audit`, `npm run compile`, and `npm test`.

Placeholder scan:

- No placeholder steps remain.

Type consistency:

- The new helper is consistently named `getAttributeDiagnostics`.
