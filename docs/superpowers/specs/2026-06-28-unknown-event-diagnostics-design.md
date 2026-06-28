# Unknown Event Diagnostics Design

Date: 2026-06-28

## Goal

Add basic diagnostics for unknown Sysmon event tags inside `EventFiltering`.

This should be the first diagnostics slice. It should reuse the expanded schema data and stay deliberately lightweight, avoiding full XML parsing, field validation, and attribute validation.

## Scope

In scope:

- Add a pure diagnostic helper exported from `src/extension.ts`.
- Report an unknown-event diagnostic when a tag inside an open `EventFiltering` block is not in `SYSMON_EVENTS`.
- Register a VS Code diagnostic collection for `smc` documents.
- Update diagnostics when an `smc` document is opened, changed, or saved.
- Clear diagnostics when an `smc` document is closed.
- Add tests for the pure diagnostic helper.

Out of scope:

- Unknown field diagnostics.
- Attribute value diagnostics.
- XML parser integration.
- Quick fixes.
- Code actions.
- Diagnostics for generic XML files that are not in the `smc` language mode.

## Behavior

The helper should scan document text for XML-like opening tags inside an open `EventFiltering` block.

For this slice, a tag is considered inside `EventFiltering` when the latest `<EventFiltering` opening tag appears after the latest `</EventFiltering>` closing tag at that point in the document.

The helper should ignore:

- closing tags such as `</ProcessCreate>`
- declaration and processing tags such as `<?xml ...?>`
- comments such as `<!-- ... -->`
- known structural tags:
  - `EventFiltering`
  - `RuleGroup`
  - `Rule`
- known Sysmon event tags from `SYSMON_EVENTS`

If a remaining tag name is unknown, the helper should produce a warning-level diagnostic-like object with:

- `message`: `Unknown Sysmon event tag "BadEvent".`
- `severity`: `vscode.DiagnosticSeverity.Warning`
- a range covering the tag name, not the surrounding `<` or attributes

The first implementation should report one diagnostic per unknown opening tag occurrence.

## Architecture

`src/extension.ts` remains the VS Code integration point.

Add an exported interface so tests do not need VS Code diagnostic objects directly:

```ts
export interface SysmonDiagnostic {
	message: string;
	severity: vscode.DiagnosticSeverity;
	start: number;
	end: number;
}
```

Add:

```ts
export function getSysmonDiagnostics(documentText: string): SysmonDiagnostic[]
```

The helper should return offsets rather than line/character positions. The VS Code integration should convert offsets to `vscode.Range` with `document.positionAt(offset)`.

Add a small conversion helper inside `src/extension.ts`:

```ts
function toDiagnostic(document: vscode.TextDocument, diagnostic: SysmonDiagnostic): vscode.Diagnostic
```

Register one diagnostic collection in `activate()`:

```ts
const diagnosticCollection = vscode.languages.createDiagnosticCollection('sysmon');
```

Hook document lifecycle events:

- run diagnostics on currently open `smc` documents during activation
- run diagnostics on `vscode.workspace.onDidOpenTextDocument`
- run diagnostics on `vscode.workspace.onDidChangeTextDocument`
- run diagnostics on `vscode.workspace.onDidSaveTextDocument`
- clear diagnostics on `vscode.workspace.onDidCloseTextDocument`

The integration should only diagnose documents whose `languageId` is `smc`.

## Tests

Update `src/test/suite/extension.test.ts`.

Tests should verify:

- `getSysmonDiagnostics('<EventFiltering>\\n<BadEvent>\\n</EventFiltering>')` returns one warning with message `Unknown Sysmon event tag "BadEvent".`
- the diagnostic range offsets cover only `BadEvent`.
- known events such as `ProcessCreate` produce no diagnostics.
- unknown tags outside `EventFiltering` produce no diagnostics.
- structural tags such as `RuleGroup` and `Rule` inside `EventFiltering` produce no diagnostics.
- comments and XML declarations produce no diagnostics.

Existing completion tests should continue to pass.

## Risks

This remains a text-based scanner, so malformed XML, multiline attributes, or unusual nesting can produce imperfect diagnostics. That is acceptable for this first diagnostics slice because the goal is useful feedback with low implementation risk.

A future XML-aware parser can replace the scanner while keeping the same schema data and test intent.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.
