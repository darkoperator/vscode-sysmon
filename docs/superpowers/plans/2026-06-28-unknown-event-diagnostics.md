# Unknown Event Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add warning diagnostics for unknown Sysmon event tags inside `EventFiltering`.

**Architecture:** Add an exported pure scanner in `src/extension.ts` so tests can verify diagnostic behavior without depending on VS Code UI state. Convert scanner results to `vscode.Diagnostic` objects only at the integration boundary, then register a diagnostic collection for `smc` documents during activation.

**Tech Stack:** TypeScript, VS Code Extension API, Mocha, Node `assert`.

---

## File Structure

- Modify `src/test/suite/extension.test.ts`
  - Import `getSysmonDiagnostics`.
  - Add pure helper tests for unknown event tags, known event tags, outside-`EventFiltering` context, structural tags, comments, and XML declarations.
- Modify `src/extension.ts`
  - Add `SysmonDiagnostic`.
  - Add `getSysmonDiagnostics(documentText)`.
  - Add a diagnostic conversion helper.
  - Register and maintain a VS Code diagnostic collection for `smc` documents.

No schema data changes are needed.

---

### Task 1: Add Failing Diagnostic Helper Tests

**Files:**
- Modify: `src/test/suite/extension.test.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Import `vscode` and the diagnostic helper**

At the top of `src/test/suite/extension.test.ts`, add:

```ts
import * as vscode from 'vscode';
```

Change the extension import to include `getSysmonDiagnostics`:

```ts
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
```

- [ ] **Step 2: Add diagnostic helper tests**

Add this suite after the existing `Completion Helpers` suite:

```ts
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

	test('does not report comments or XML declarations', () => {
		assert.deepStrictEqual(
			getSysmonDiagnostics('<?xml version="1.0"?>\n<EventFiltering>\n<!-- <BadEvent> -->\n</EventFiltering>'),
			[]
		);
	});
});
```

- [ ] **Step 3: Run tests to verify the expected failure**

Run:

```bash
npm test
```

Expected result: TypeScript compilation fails because `getSysmonDiagnostics` is not exported from `src/extension.ts`.

---

### Task 2: Implement the Pure Diagnostic Helper

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Add the diagnostic interface**

Add this interface after the exported completion constants:

```ts
export interface SysmonDiagnostic {
	message: string;
	severity: vscode.DiagnosticSeverity;
	start: number;
	end: number;
}
```

- [ ] **Step 2: Add helper constants**

Add these constants after the diagnostic interface:

```ts
const STRUCTURAL_TAGS = [
	'EventFiltering',
	'RuleGroup',
	'Rule'
];
```

- [ ] **Step 3: Add `getSysmonDiagnostics`**

Add this exported helper before `toCompletionItems()`:

```ts
export function getSysmonDiagnostics(documentText: string): SysmonDiagnostic[] {
	const diagnostics: SysmonDiagnostic[] = [];
	const knownEventTags = new Set(SYSMON_EVENTS.map(event => event.tag));
	const structuralTags = new Set(STRUCTURAL_TAGS);
	const tagPattern = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>/g;
	let match: RegExpExecArray | null;

	while ((match = tagPattern.exec(documentText)) !== null) {
		const tagName = match[1];
		const tagStart = match.index;
		const tagNameStart = tagStart + 1;
		const tagNameEnd = tagNameStart + tagName.length;

		if (!isInsideOpenEventFiltering(documentText, tagStart)) {
			continue;
		}

		if (structuralTags.has(tagName) || knownEventTags.has(tagName)) {
			continue;
		}

		diagnostics.push({
			message: `Unknown Sysmon event tag "${tagName}".`,
			severity: vscode.DiagnosticSeverity.Warning,
			start: tagNameStart,
			end: tagNameEnd
		});
	}

	return diagnostics;
}
```

- [ ] **Step 4: Add the EventFiltering context helper**

Add this non-exported helper before `getSysmonDiagnostics()`:

```ts
function isInsideOpenEventFiltering(documentText: string, offset: number): boolean {
	const textBeforeOffset = documentText.slice(0, offset);
	const lastEventFilteringOpen = textBeforeOffset.lastIndexOf('<EventFiltering');
	const lastEventFilteringClose = textBeforeOffset.lastIndexOf('</EventFiltering>');

	return lastEventFilteringOpen !== -1 && lastEventFilteringOpen > lastEventFilteringClose;
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test
```

Expected result: all tests pass.

---

### Task 3: Wire VS Code Diagnostics

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Add conversion and update helpers**

Add these helpers before `activate()`:

```ts
function toDiagnostic(document: vscode.TextDocument, diagnostic: SysmonDiagnostic): vscode.Diagnostic {
	return new vscode.Diagnostic(
		new vscode.Range(
			document.positionAt(diagnostic.start),
			document.positionAt(diagnostic.end)
		),
		diagnostic.message,
		diagnostic.severity
	);
}

function updateDiagnostics(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
	if (document.languageId !== 'smc') {
		return;
	}

	diagnosticCollection.set(
		document.uri,
		getSysmonDiagnostics(document.getText()).map(diagnostic => toDiagnostic(document, diagnostic))
	);
}
```

- [ ] **Step 2: Register the diagnostic collection in `activate()`**

Inside `activate()`, after registering completion provider and before pushing subscriptions, add:

```ts
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('sysmon');

	for (const document of vscode.workspace.textDocuments) {
		updateDiagnostics(document, diagnosticCollection);
	}
```

- [ ] **Step 3: Register document lifecycle handlers**

Replace:

```ts
	context.subscriptions.push(attributeCompletions);
```

With:

```ts
	context.subscriptions.push(
		attributeCompletions,
		diagnosticCollection,
		vscode.workspace.onDidOpenTextDocument(document => updateDiagnostics(document, diagnosticCollection)),
		vscode.workspace.onDidChangeTextDocument(event => updateDiagnostics(event.document, diagnosticCollection)),
		vscode.workspace.onDidSaveTextDocument(document => updateDiagnostics(document, diagnosticCollection)),
		vscode.workspace.onDidCloseTextDocument(document => {
			if (document.languageId === 'smc') {
				diagnosticCollection.delete(document.uri);
			}
		})
	);
```

- [ ] **Step 4: Run tests**

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
git commit -m "feat: add unknown event diagnostics"
```

Expected result: a commit containing only the unknown-event diagnostics implementation and tests.

---

## Self-Review

Spec coverage:

- Pure diagnostic helper is added and exported in Task 2.
- Unknown event tags inside `EventFiltering` are tested in Task 1.
- Known events, structural tags, comments, declarations, and outside-`EventFiltering` context are tested in Task 1.
- VS Code diagnostic collection is registered and maintained in Task 3.
- Verification includes `npm audit`, `npm run compile`, and `npm test`.

Placeholder scan:

- No placeholder steps remain.

Type consistency:

- The helper is consistently named `getSysmonDiagnostics`.
- The interface is consistently named `SysmonDiagnostic`.
