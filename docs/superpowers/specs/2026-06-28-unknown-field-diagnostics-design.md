# Unknown Field Diagnostics Design

Date: 2026-06-28

## Goal

Add diagnostics for unknown Sysmon field tags inside known Sysmon event blocks.

This should build on the unknown event diagnostics slice and reuse the expanded `SYSMON_EVENTS` field data. It should remain lightweight and should not introduce a full XML parser or attribute validation.

## Scope

In scope:

- Extend `getSysmonDiagnostics(documentText)` in `src/extension.ts`.
- Report an unknown-field diagnostic when a tag appears inside a known event block and is not one of that event's fields.
- Preserve existing unknown event diagnostics.
- Preserve all completion behavior.
- Add tests for unknown field diagnostics.

Out of scope:

- Attribute value diagnostics.
- Unknown field quick fixes.
- Code actions.
- Full XML parser integration.
- Diagnostics for generic XML files that are not in the `smc` language mode.

## Behavior

When scanning a document, the helper should detect whether a tag appears inside an open known Sysmon event block.

For this slice, "inside a known event block" means:

- for each event in `SYSMON_EVENTS`, find the latest opening tag matching `<${event.tag}` before the tag being inspected.
- find the latest closing tag matching `</${event.tag}>` before the tag being inspected.
- the active event is the known event with the latest opening tag whose opening tag appears after its latest closing tag.

If a tag appears inside a known event block:

- closing tags should be ignored.
- comments and XML declarations should be ignored.
- fields listed on the active event should be ignored.
- unknown tags should produce a warning-level diagnostic-like object with:
  - `message`: `Unknown Sysmon field tag "BadField" for event "ProcessCreate".`
  - `severity`: `vscode.DiagnosticSeverity.Warning`
  - a range covering the field tag name, not the surrounding `<` or attributes.

If a tag appears outside a known event block, this field diagnostic should not report it.

The existing unknown event diagnostic behavior should remain:

- unknown event-like tags directly inside `EventFiltering` still report as unknown events.
- known event tags do not report as unknown fields.
- structural tags such as `EventFiltering`, `RuleGroup`, and `Rule` do not report as unknown fields.

## Architecture

Keep the implementation in `src/extension.ts`.

The existing helper:

```ts
export function getSysmonDiagnostics(documentText: string): SysmonDiagnostic[]
```

should be extended to include field diagnostics.

To keep the logic testable and avoid duplicating scan state, add or adapt a helper that returns the active event definition for a given offset:

```ts
function getActiveEvent(documentText: string, offset: number)
```

The active event helper can return `undefined` when the offset is not inside a known event block.

The `SysmonDiagnostic` interface should not change.

The VS Code diagnostic collection wiring should not change, because it already maps `getSysmonDiagnostics()` results into editor diagnostics.

## Tests

Update `src/test/suite/extension.test.ts`.

Tests should verify:

- `getSysmonDiagnostics('<EventFiltering>\\n<ProcessCreate>\\n<BadField>\\n</ProcessCreate>\\n</EventFiltering>')` returns one warning with message `Unknown Sysmon field tag "BadField" for event "ProcessCreate".`
- the diagnostic range offsets cover only `BadField`.
- known fields such as `Image` inside `ProcessCreate` produce no diagnostics.
- unknown fields outside known events produce no field diagnostics.
- a field valid in one event but invalid in another reports for the active event. For example, `DestinationIp` inside `ProcessCreate` should report as unknown for `ProcessCreate`.
- existing unknown event diagnostic tests continue to pass.
- existing completion tests continue to pass.

## Risks

This continues the lightweight text-based approach. Malformed XML, comments with unusual formatting, or nested invalid event structures can still produce imperfect results. That is acceptable for this slice because it adds useful feedback while preserving the current architecture.

A future XML-aware parser can replace the active-event detection without changing schema data or the diagnostic messages.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.
