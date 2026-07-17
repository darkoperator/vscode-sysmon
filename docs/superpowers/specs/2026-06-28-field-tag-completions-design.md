# Field Tag Completions Design

Date: 2026-06-28

## Goal

Add Sysmon field tag completions when editing inside a known Sysmon event block, using the field definitions already stored in the schema data module.

This should be the next small feature after event tag completions. It should make the new schema-backed event data directly useful while keeping the implementation lightweight and testable.

## Scope

In scope:

- Export field tag completion behavior from `src/extension.ts`.
- Add a lightweight `getFieldCompletions()` helper.
- Return event-specific field tags when the current line prefix ends with `<` and the document appears to be inside an open known Sysmon event tag.
- Preserve existing completions for `condition=""`, `onmatch=""`, `groupRelation=""`, and event tags inside `EventFiltering`.
- Add tests for field tag completions.

Out of scope:

- XML parser integration.
- Field snippets or automatic closing tag insertion.
- Diagnostics for invalid events or fields.
- Expanding the schema beyond the current starter events.
- README or snippet changes.

## Behavior

The extension should suggest event-specific fields from `SYSMON_EVENTS` when both conditions are true:

1. The line prefix before the cursor ends with:

```ts
'<'
```

2. The full document text appears to be inside an open known Sysmon event tag.

For this first slice, "inside an open known Sysmon event tag" means:

- for each event in `SYSMON_EVENTS`, find the last opening tag matching `<${event.tag}`.
- find the last closing tag matching `</${event.tag}>`.
- the active event is the known event with the latest opening tag whose opening tag appears after its latest closing tag.

If an active event is found, the completion values should be:

```ts
activeEvent.fields.map(field => field.name)
```

With the current starter schema data:

- `ProcessCreate` returns `Image`, `CommandLine`, `ParentImage`, `ParentCommandLine`, `User`, `IntegrityLevel`, `CurrentDirectory`, and `Hashes`.
- `NetworkConnect` returns `Image`, `DestinationIp`, `DestinationHostname`, `DestinationPort`, `DestinationPortName`, `SourceIp`, `SourceHostname`, `SourcePort`, `Protocol`, and `User`.
- `ImageLoad` returns `Image`, `ImageLoaded`, `Hashes`, `Signed`, `Signature`, `SignatureStatus`, `Company`, `Description`, and `Product`.

If either condition is false, the helper should return `undefined`.

## Completion Priority

The provider should keep the current completion order:

1. `getAttributeCompletions(linePrefix)`
2. `getFieldCompletions(document.getText(), linePrefix)`
3. `getElementCompletions(document.getText(), linePrefix)`
4. `undefined`

This means existing attribute completions remain unchanged. Field completions must run before event tag completions because an event block is normally nested inside an open `EventFiltering` block. At the direct `EventFiltering` level, no active event exists, so event tag completions still appear.

## Architecture

`src/extension.ts` should import and reuse `SYSMON_EVENTS`.

It should export:

```ts
export function getFieldCompletions(documentText: string, linePrefix: string): string[] | undefined
```

The helper should remain independent of VS Code APIs so it can be tested directly.

No new schema data is required for this slice. `src/sysmonSchema.ts` already owns the event field definitions.

## Tests

Update `src/test/suite/extension.test.ts`.

Tests should verify:

- `getFieldCompletions('<ProcessCreate>\\n<', '<')` returns the `ProcessCreate` field names.
- `getFieldCompletions('<NetworkConnect>\\n<', '<')` returns the `NetworkConnect` field names.
- `getFieldCompletions('<Sysmon>\\n<', '<')` returns `undefined`.
- `getFieldCompletions('<ProcessCreate>\\n</ProcessCreate>\\n<', '<')` returns `undefined`.
- `getFieldCompletions('<ProcessCreate>\\n', '')` returns `undefined`.
- Existing attribute and event tag completion tests continue to pass.

## Risks

This feature continues the lightweight text-based approach. It can be fooled by comments, malformed XML, nested invalid event tags, or repeated event tags in unusual shapes. That is acceptable for this slice because it keeps the behavior small and builds on the current completion architecture.

A future XML-aware parser can replace the active-event detection helper without changing the schema data model.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.
