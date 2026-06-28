# Invalid Attribute Diagnostics Design

Date: 2026-06-28

## Goal

Add diagnostics for invalid Sysmon attribute values in `condition`, `onmatch`, and `groupRelation`.

This should build on the existing diagnostics helper and schema constants. It should stay focused on value validation and should not introduce XML parsing, code actions, or operator hover help.

## Source Context

The TrustedSec Sysmon Community Guide configuration chapter documents filter operators such as `is any`, `contains`, `contains all`, `contains any`, `excludes`, `excludes all`, `excludes any`, `image`, `begins with`, `not begins with`, `ends with`, `not ends with`, `less than`, and `more than`.

The current extension constants already include most operator values, but use `begin with`, `not begin with`, `end with`, and `not end with`. This feature should not rename completions yet. It should avoid warning on the TrustedSec spellings while preserving current completion behavior for a later compatibility decision.

## Scope

In scope:

- Extend `getSysmonDiagnostics(documentText)` in `src/extension.ts`.
- Report invalid `condition=""` values.
- Report invalid `onmatch=""` values.
- Report invalid `groupRelation=""` values.
- Keep current completion lists unchanged.
- Add tests for invalid and valid attribute values.

Out of scope:

- Renaming condition completions.
- Operator hover help.
- Performance hints for expensive operators.
- Quick fixes or code actions.
- Full XML parser integration.
- Attribute validation outside quoted string values.

## Behavior

The diagnostic helper should scan XML-like attributes in document text and validate only these attributes:

- `condition`
- `onmatch`
- `groupRelation`

For invalid values, it should produce warning diagnostics with ranges covering the attribute value only, not the quote characters.

Expected messages:

- `Invalid Sysmon condition value "bad".`
- `Invalid Sysmon onmatch value "bad".`
- `Invalid Sysmon groupRelation value "bad".`

Valid values:

- `condition`: values from `CONDITION_OPERATORS`, plus TrustedSec-compatible spelling aliases:
  - `begins with`
  - `not begins with`
  - `ends with`
  - `not ends with`
- `onmatch`: values from `ONMATCH_VALUES`
- `groupRelation`: values from `GROUP_RELATION_VALUES`

The helper should ignore:

- unknown attributes
- unquoted attribute values
- attributes inside comments
- XML declarations

The helper should still run across the whole document, not only inside `EventFiltering`, because `groupRelation` can appear on structural elements and `condition` appears on field elements.

Existing unknown event and unknown field diagnostics should continue to work.

## Architecture

Keep the implementation in `src/extension.ts`.

The existing helper:

```ts
export function getSysmonDiagnostics(documentText: string): SysmonDiagnostic[]
```

should be extended to append attribute diagnostics after tag diagnostics.

Add a small internal helper:

```ts
function getAttributeDiagnostics(documentText: string): SysmonDiagnostic[]
```

This helper should:

- use a regular expression to find quoted attribute values for `condition`, `onmatch`, and `groupRelation`
- skip matches inside comments
- select allowed values from the existing schema constants
- return `SysmonDiagnostic[]`

The `SysmonDiagnostic` interface should not change.

The VS Code diagnostic collection wiring should not change, because it already maps `getSysmonDiagnostics()` results into editor diagnostics.

## Tests

Update `src/test/suite/extension.test.ts`.

Tests should verify:

- invalid `condition="bad"` reports `Invalid Sysmon condition value "bad".`
- invalid `onmatch="bad"` reports `Invalid Sysmon onmatch value "bad".`
- invalid `groupRelation="bad"` reports `Invalid Sysmon groupRelation value "bad".`
- valid current condition values produce no diagnostics.
- TrustedSec spellings such as `condition="begins with"` and `condition="ends with"` produce no diagnostics.
- unknown attributes such as `name="anything"` produce no diagnostics.
- attributes inside comments produce no diagnostics.
- existing event and field diagnostic tests continue to pass.

## Risks

This remains a lightweight text scanner. It can miss malformed XML or unusual multiline attribute cases. That is acceptable for this slice because it adds practical validation without changing the extension architecture.

The condition operator spelling mismatch should be handled as a separate compatibility decision. This slice accepts both current extension values and TrustedSec spellings to avoid false warnings.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.
