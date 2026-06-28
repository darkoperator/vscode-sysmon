# Event Tag Completions Design

Date: 2026-06-28

## Goal

Add Sysmon event tag completions when editing inside an `EventFiltering` block, using event definitions from the schema data module.

This should be the next small feature after schema data and `groupRelation` completions. It should add useful authoring behavior without introducing a full XML parser or diagnostics system.

## Scope

In scope:

- Export event tag completion values from `src/extension.ts`.
- Add a lightweight `getElementCompletions()` helper.
- Return Sysmon event tags when the current line prefix ends with `<` and the document appears to be inside an open `EventFiltering` block.
- Preserve existing attribute completions for `condition=""`, `onmatch=""`, and `groupRelation=""`.
- Add tests for event tag completions.

Out of scope:

- XML parser integration.
- Field completions inside event tags.
- Event snippets or automatic closing tag insertion.
- Diagnostics.
- Schema expansion beyond the current starter events.
- Changes to snippets or README.

## Behavior

The extension should suggest event tags from `SYSMON_EVENTS` when both conditions are true:

1. The line prefix before the cursor ends with:

```ts
'<'
```

2. The full document text appears to be inside an open `EventFiltering` block.

For this first slice, "inside an open `EventFiltering` block" means:

- the last `<EventFiltering` opening tag appears after the last `</EventFiltering>` closing tag in the document text.

The event tag completion values should be:

```ts
SYSMON_EVENTS.map(event => event.tag)
```

With the current starter schema data, that means:

- `ProcessCreate`
- `NetworkConnect`
- `ImageLoad`

If either condition is false, the element completion helper should return `undefined`.

## Architecture

`src/extension.ts` should import `SYSMON_EVENTS` from `src/sysmonSchema.ts`.

It should export:

```ts
export const EVENT_TAG_COMPLETIONS = SYSMON_EVENTS.map(event => event.tag);
```

It should also export:

```ts
export function getElementCompletions(documentText: string, linePrefix: string): string[] | undefined
```

The existing provider should continue checking attribute completions first:

1. `getAttributeCompletions(linePrefix)`
2. `getElementCompletions(document.getText(), linePrefix)`
3. `undefined`

This preserves existing behavior and adds event tag completions only when attribute completions do not apply.

## Tests

Update `src/test/suite/extension.test.ts`.

Tests should verify:

- `EVENT_TAG_COMPLETIONS` exactly equals `['ProcessCreate', 'NetworkConnect', 'ImageLoad']`.
- `getElementCompletions('<EventFiltering>\\n<', '<')` returns `EVENT_TAG_COMPLETIONS`.
- `getElementCompletions('<Sysmon>\\n<', '<')` returns `undefined`.
- `getElementCompletions('<EventFiltering>\\n</EventFiltering>\\n<', '<')` returns `undefined`.
- `getElementCompletions('<EventFiltering>\\n', '')` returns `undefined`.
- Existing attribute completion tests continue to pass.

## Risks

This approach is deliberately lightweight and text-based. It can be fooled by comments, strings, malformed XML, or multiple blocks with unusual formatting. That is acceptable for this slice because the goal is useful completion behavior with a small implementation. A future XML-aware parser can replace the helper without changing schema data.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.
