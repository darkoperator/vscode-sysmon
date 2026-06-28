# Sysmon Schema Module Design

Date: 2026-06-28

## Goal

Introduce a small TypeScript schema data module that becomes the shared source of truth for Sysmon completion values and a starter set of Sysmon event definitions.

This is a foundation step. It should not add new user-facing behavior beyond preserving the existing completion behavior from the small first milestone.

## Scope

In scope:

- Add a TypeScript schema module at `src/sysmonSchema.ts`.
- Move condition operator data into the schema module.
- Move `onmatch` values into the schema module.
- Add `groupRelation` values to the schema module for later completion work.
- Add a small curated starter set of Sysmon event definitions.
- Update `src/extension.ts` to read completion values from the schema module.
- Add schema-focused tests.
- Preserve current runtime completion behavior for `condition=""` and `onmatch=""`.

Out of scope:

- Schema file parsing or generation.
- Full coverage of every Sysmon event.
- Context-aware event tag completions.
- Field completions.
- Diagnostics.
- Snippet generation.
- README table generation.
- Tooling migration away from TSLint.

## Architecture

Create `src/sysmonSchema.ts` as a focused data module. It should define simple exported interfaces and constants. The module should have no dependency on the VS Code API, so it can be tested with ordinary extension tests and reused later by generators, diagnostics, snippets, or language-service code.

`src/extension.ts` remains responsible for VS Code integration. It should import the schema values and continue exporting `CONDITION_COMPLETIONS` and `ONMATCH_COMPLETIONS` for compatibility with the current tests and any internal callers.

## Data Model

The schema module should export these interfaces:

```ts
export interface SysmonFieldDefinition {
	name: string;
	description?: string;
}

export interface SysmonEventDefinition {
	name: string;
	eventId: number;
	tag: string;
	description?: string;
	fields: SysmonFieldDefinition[];
}
```

The schema module should export these constants:

- `CONDITION_OPERATORS`
- `ONMATCH_VALUES`
- `GROUP_RELATION_VALUES`
- `SYSMON_EVENTS`

`CONDITION_OPERATORS` should preserve the current completion list:

- `is`
- `is not`
- `is any`
- `contains`
- `contains any`
- `contains all`
- `excludes`
- `excludes any`
- `excludes all`
- `begin with`
- `not begin with`
- `end with`
- `not end with`
- `less than`
- `more than`
- `image`

`ONMATCH_VALUES` should be:

- `include`
- `exclude`

`GROUP_RELATION_VALUES` should be:

- `and`
- `or`

`SYSMON_EVENTS` should start with these representative events:

- `ProcessCreate`
- `NetworkConnect`
- `ImageLoad`

Each starter event should include a non-empty `fields` list based on the existing snippets and common Sysmon field names. The first implementation should keep the list intentionally small but useful.

## Lookup Helper

The schema module should export:

```ts
export function getEventDefinition(name: string): SysmonEventDefinition | undefined
```

The helper should match event definitions by `name` or `tag`. Matching should be case-sensitive for the first pass to keep behavior explicit and predictable.

## Extension Integration

`src/extension.ts` should import:

```ts
import { CONDITION_OPERATORS, ONMATCH_VALUES } from './sysmonSchema';
```

Then it should export:

```ts
export const CONDITION_COMPLETIONS = CONDITION_OPERATORS;
export const ONMATCH_COMPLETIONS = ONMATCH_VALUES;
```

`getAttributeCompletions()` should not change behavior. Existing completion tests should continue to pass.

## Tests

Add `src/test/suite/sysmonSchema.test.ts`.

Tests should verify:

- `CONDITION_OPERATORS` exactly matches the current operator list.
- `ONMATCH_VALUES` exactly matches `include` and `exclude`.
- `GROUP_RELATION_VALUES` exactly matches `and` and `or`.
- `SYSMON_EVENTS` includes `ProcessCreate`, `NetworkConnect`, and `ImageLoad`.
- Every starter event has a numeric `eventId`, a non-empty `tag`, and at least one field.
- `getEventDefinition('ProcessCreate')` returns the ProcessCreate event.
- `getEventDefinition('ImageLoad')` returns the ImageLoad event.
- `getEventDefinition('DoesNotExist')` returns `undefined`.

Existing `src/test/suite/extension.test.ts` should continue to verify the exported completion constants and helper behavior.

## Risks

The starter event list will be incomplete by design. It should not be used for diagnostics or field completion until later work expands coverage or introduces generation.

Static curated data can drift from the real Sysmon schema. This is acceptable for the foundation slice because the goal is to establish shape and integration points before adding generation.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.

## Follow-Up Work

After this slice, later features can build on the module:

1. Add context-aware `groupRelation` completions.
2. Add event tag completions inside `EventFiltering`.
3. Add field completions inside known event tags.
4. Expand `SYSMON_EVENTS` coverage.
5. Replace static data with generated data from Sysmon schema output.
6. Add diagnostics for invalid events, fields, and condition values.
