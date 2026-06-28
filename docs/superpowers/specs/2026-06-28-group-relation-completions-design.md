# Group Relation Completions Design

Date: 2026-06-28

## Goal

Add Sysmon `groupRelation` attribute completions using the schema data module introduced in the previous feature.

This should be a small runtime feature that proves the schema module can support additional completion behavior without changing the extension architecture.

## Scope

In scope:

- Add `groupRelation=""` attribute completions.
- Source completion values from `GROUP_RELATION_VALUES` in `src/sysmonSchema.ts`.
- Preserve existing `condition=""` and `onmatch=""` completion behavior.
- Add tests for exported group relation completions and helper behavior.

Out of scope:

- Context-aware XML parsing.
- Restricting completion to only `<RuleGroup>` tags.
- Event tag completions.
- Field completions.
- Diagnostics.
- Changes to snippets or README.

## Behavior

When the text before the cursor ends with:

```ts
'groupRelation="'
```

`getAttributeCompletions()` should return:

```ts
['and', 'or']
```

This deliberately follows the same prefix-based approach used for `condition=""` and `onmatch=""`.

## Architecture

`src/sysmonSchema.ts` already exports:

```ts
export const GROUP_RELATION_VALUES = [
	'and',
	'or'
];
```

`src/extension.ts` should import that value alongside the existing schema completion values and re-export:

```ts
export const GROUP_RELATION_COMPLETIONS = GROUP_RELATION_VALUES;
```

`getAttributeCompletions()` should check `groupRelation=""` after `condition=""` and `onmatch=""`, then return `undefined` for unsupported prefixes.

## Tests

Update `src/test/suite/extension.test.ts`.

Tests should verify:

- `GROUP_RELATION_COMPLETIONS` exactly equals `['and', 'or']`.
- `getAttributeCompletions('<RuleGroup groupRelation="')` returns `GROUP_RELATION_COMPLETIONS`.
- Existing unsupported-prefix tests still return `undefined`.
- Existing condition and onmatch tests still pass.

No schema-data tests are required because `GROUP_RELATION_VALUES` is already covered in `src/test/suite/sysmonSchema.test.ts`.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.

## Risks

This feature is prefix-based, not XML-aware. It will offer group relation completions anywhere the current line prefix ends with `groupRelation=""`, even outside a `RuleGroup` tag. That is consistent with current completion behavior and keeps this slice intentionally small. Context-aware completions can be added later.
