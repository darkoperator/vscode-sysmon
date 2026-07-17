# Small First Extension Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve activation, Sysmon file association, condition/onmatch completions, tests, and documentation without changing the snippet-generation architecture.

**Architecture:** Keep the extension lightweight. Move completion values and prefix matching into exported helpers in `src/extension.ts` so existing extension-host tests can validate behavior without adding a new build/test framework. Register completion providers from those helpers in `activate()`.

**Tech Stack:** VS Code extension API, TypeScript 3.3, Mocha, Node `assert`, existing `vscode-test` runner.

---

## File Structure

- `package.json`: extension activation and language contribution metadata.
- `src/extension.ts`: exported completion constants/helpers plus VS Code provider registration.
- `src/test/suite/extension.test.ts`: focused tests for helper behavior and package metadata.
- `README.md`: usage guidance for `.smc` and manual XML language selection.
- `CHANGELOG.md`: release-note entry for this milestone if the existing changelog format supports it cleanly.

No new runtime dependencies are required.

---

### Task 1: Package Metadata

**Files:**
- Modify: `package.json`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Write package metadata tests**

Replace the generated sample test block in `src/test/suite/extension.test.ts` with metadata assertions. Keep imports at the top:

```ts
import * as assert from 'assert';
import * as path from 'path';

const packageJson = require(path.join(__dirname, '../../../package.json'));

suite('Extension Metadata', () => {
	test('activates only for the Sysmon language', () => {
		assert.deepStrictEqual(packageJson.activationEvents, ['onLanguage:smc']);
	});

	test('associates .smc files without claiming generic XML files', () => {
		const language = packageJson.contributes.languages.find((entry: any) => entry.id === 'smc');

		assert.ok(language, 'Expected smc language contribution');
		assert.deepStrictEqual(language.extensions, ['.smc']);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test
```

Expected: tests fail because `activationEvents` is currently `["*"]` and language extensions are currently `["smc", "xml"]`.

- [ ] **Step 3: Update `package.json` metadata**

In `package.json`, change:

```json
"activationEvents": [
	"*"
],
```

to:

```json
"activationEvents": [
	"onLanguage:smc"
],
```

In `package.json`, change the `contributes.languages[0].extensions` value from:

```json
"extensions": [
	"smc",
	"xml"
],
```

to:

```json
"extensions": [
	".smc"
],
```

- [ ] **Step 4: Run tests to verify package metadata passes**

Run:

```bash
npm test
```

Expected: metadata tests pass, or later completion tests are not present yet.

- [ ] **Step 5: Compile**

Run:

```bash
npm run compile
```

Expected: TypeScript compilation succeeds.

- [ ] **Step 6: Commit package metadata task**

Run:

```bash
git add package.json src/test/suite/extension.test.ts
git commit -m "fix: scope sysmon extension activation"
```

---

### Task 2: Completion Helper Tests

**Files:**
- Modify: `src/test/suite/extension.test.ts`
- Modify later: `src/extension.ts`

- [ ] **Step 1: Add completion helper imports**

At the top of `src/test/suite/extension.test.ts`, add:

```ts
import {
	CONDITION_COMPLETIONS,
	ONMATCH_COMPLETIONS,
	getAttributeCompletions
} from '../../extension';
```

The full import block should be:

```ts
import * as assert from 'assert';
import * as path from 'path';
import {
	CONDITION_COMPLETIONS,
	ONMATCH_COMPLETIONS,
	getAttributeCompletions
} from '../../extension';
```

- [ ] **Step 2: Add completion value tests**

Append this suite to `src/test/suite/extension.test.ts`:

```ts
suite('Completion Helpers', () => {
	test('condition completions include current Sysmon operators', () => {
		assert.deepStrictEqual(CONDITION_COMPLETIONS, [
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

	test('onmatch completions include include and exclude', () => {
		assert.deepStrictEqual(ONMATCH_COMPLETIONS, [
			'include',
			'exclude'
		]);
	});

	test('returns condition completions after condition attribute prefix', () => {
		assert.deepStrictEqual(
			getAttributeCompletions('<Image condition="'),
			CONDITION_COMPLETIONS
		);
	});

	test('returns onmatch completions after onmatch attribute prefix', () => {
		assert.deepStrictEqual(
			getAttributeCompletions('<ProcessCreate onmatch="'),
			ONMATCH_COMPLETIONS
		);
	});

	test('returns no completions outside supported attribute prefixes', () => {
		assert.strictEqual(getAttributeCompletions('<Image name="'), undefined);
		assert.strictEqual(getAttributeCompletions('<Image condition="value'), undefined);
		assert.strictEqual(getAttributeCompletions('<Image>'), undefined);
	});
});
```

- [ ] **Step 3: Run tests to verify helper exports are missing**

Run:

```bash
npm test
```

Expected: compile/test fails because `CONDITION_COMPLETIONS`, `ONMATCH_COMPLETIONS`, and `getAttributeCompletions` are not exported from `src/extension.ts`.

- [ ] **Step 4: Add exported constants and helper**

At the top of `src/extension.ts`, below the VS Code import, add:

```ts
export const CONDITION_COMPLETIONS = [
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

export const ONMATCH_COMPLETIONS = [
	'include',
	'exclude'
];

export function getAttributeCompletions(linePrefix: string): string[] | undefined {
	if (linePrefix.endsWith('condition="')) {
		return CONDITION_COMPLETIONS;
	}

	if (linePrefix.endsWith('onmatch="')) {
		return ONMATCH_COMPLETIONS;
	}

	return undefined;
}
```

- [ ] **Step 5: Run tests to verify helper behavior**

Run:

```bash
npm test
```

Expected: helper tests pass, or provider integration tests are not present yet.

- [ ] **Step 6: Compile**

Run:

```bash
npm run compile
```

Expected: TypeScript compilation succeeds.

- [ ] **Step 7: Commit completion helper task**

Run:

```bash
git add src/extension.ts src/test/suite/extension.test.ts
git commit -m "test: cover sysmon completion helpers"
```

---

### Task 3: Completion Provider Integration

**Files:**
- Modify: `src/extension.ts`
- Test: `src/test/suite/extension.test.ts`

- [ ] **Step 1: Add helper to create VS Code completion items**

In `src/extension.ts`, below `getAttributeCompletions`, add:

```ts
function toCompletionItems(values: string[]): vscode.CompletionItem[] {
	return values.map(value => new vscode.CompletionItem(value, vscode.CompletionItemKind.Method));
}
```

- [ ] **Step 2: Replace duplicate provider logic**

Replace the body of `activate()` in `src/extension.ts` with:

```ts
export function activate(context: vscode.ExtensionContext) {
	const attributeCompletions = vscode.languages.registerCompletionItemProvider(
		'smc',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const linePrefix = document.lineAt(position).text.substr(0, position.character);
				const values = getAttributeCompletions(linePrefix);

				if (!values) {
					return undefined;
				}

				return toCompletionItems(values);
			}
		},
		'"'
	);

	context.subscriptions.push(attributeCompletions);
}
```

Leave `deactivate()` unchanged:

```ts
export function deactivate() {}
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm test
```

Expected: all metadata and helper tests pass.

- [ ] **Step 4: Compile**

Run:

```bash
npm run compile
```

Expected: TypeScript compilation succeeds.

- [ ] **Step 5: Commit provider integration**

Run:

```bash
git add src/extension.ts src/test/suite/extension.test.ts
git commit -m "refactor: share sysmon attribute completions"
```

---

### Task 4: README and Changelog

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update README introduction**

In `README.md`, replace:

```md
This Visual Studio Code extension is for heping in the writting of Sysmon XML configuration files.
```

with:

```md
This Visual Studio Code extension helps with writing Microsoft Sysinternals Sysmon XML configuration files.
```

- [ ] **Step 2: Update README feature copy**

In `README.md`, replace:

```md
This extensions offers a series of snippets for helping in building a Microsofty Sysinternals Sysmon XML configuration. The extension is based on the 4.30 version of the Sysinternals Sysmon schema. It also provide automatic closing of element tags for the filter fields.
```

with:

```md
This extension offers snippets for building Microsoft Sysinternals Sysmon XML configurations. The extension is based on the 4.30 version of the Sysinternals Sysmon schema. It also provides automatic closing of element tags for filter fields.
```

- [ ] **Step 3: Update README usage language**

In `README.md`, replace:

```md
Change the language to Sysmon on a existing XML file or use the extension ".smc".
```

with:

```md
Files with the `.smc` extension open in Sysmon language mode automatically. For existing `.xml` Sysmon configuration files, use VS Code's language selector to change the language mode to Sysmon.
```

- [ ] **Step 4: Add changelog entry**

At the top of `CHANGELOG.md`, below the title, add:

```md
### Unreleased

* Changed extension activation to run only for Sysmon language files.
* Associated Sysmon language mode with `.smc` files without claiming all `.xml` files.
* Added current Sysmon condition completion operators.
```

If `CHANGELOG.md` already has an unreleased section at the top, merge these bullets into that section instead of creating a duplicate.

- [ ] **Step 5: Run verification**

Run:

```bash
npm run compile
npm test
```

Expected: both commands pass.

- [ ] **Step 6: Commit docs**

Run:

```bash
git add README.md CHANGELOG.md
git commit -m "docs: clarify sysmon language association"
```

---

### Task 5: Final Verification

**Files:**
- Verify all modified files

- [ ] **Step 1: Check git status**

Run:

```bash
git status --short
```

Expected: no unexpected tracked-file changes. `graphify-out/` may remain untracked from prior graph generation and should not be committed as part of this feature.

- [ ] **Step 2: Run full automated verification**

Run:

```bash
npm run compile
npm test
```

Expected: both commands pass.

- [ ] **Step 3: Inspect final diff**

Run:

```bash
git log --oneline -5
git diff HEAD~4..HEAD -- package.json src/extension.ts src/test/suite/extension.test.ts README.md CHANGELOG.md
```

Expected: changes match the approved design:

- `activationEvents` is `["onLanguage:smc"]`.
- Sysmon language extensions are `[".smc"]`.
- `CONDITION_COMPLETIONS`, `ONMATCH_COMPLETIONS`, and `getAttributeCompletions()` exist and are tested.
- `activate()` registers one attribute completion provider for `smc`.
- README explains `.smc` automatic association and manual XML language selection.

- [ ] **Step 4: Manual smoke test**

Run the extension in VS Code from this repo using the existing launch configuration.

Manual expected results:

1. Opening a `.smc` file selects Sysmon language mode.
2. Opening a generic `.xml` file does not select Sysmon language mode automatically.
3. Manually switching an XML Sysmon config file to Sysmon language mode works.
4. In a Sysmon file, typing `<Image condition="` offers the condition completions.
5. In a Sysmon file, typing `<ProcessCreate onmatch="` offers `include` and `exclude`.
6. Existing Sysmon snippets still appear.

- [ ] **Step 5: Final commit if manual smoke test required changes**

If manual testing required any fixes, commit them:

```bash
git add package.json src/extension.ts src/test/suite/extension.test.ts README.md CHANGELOG.md
git commit -m "fix: address sysmon completion smoke test findings"
```

If no fixes were required, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Activation scoped to Sysmon language: Task 1.
- `.smc` extension and XML behavior: Task 1 and Task 4.
- Expanded condition completions: Task 2 and Task 3.
- `onmatch` completions retained: Task 2 and Task 3.
- Testable completion helpers: Task 2.
- README guidance: Task 4.
- Verification commands and manual checks: Task 5.

No placeholders remain in this plan. Function names are consistent across tasks:

- `CONDITION_COMPLETIONS`
- `ONMATCH_COMPLETIONS`
- `getAttributeCompletions`
- `toCompletionItems`
