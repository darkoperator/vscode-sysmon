# Schema Version Selection Design

Date: 2026-06-28

## Goal

Allow users to choose which checked-in Windows Sysmon schema version the extension uses for completions and diagnostics.

The first supported setting should choose between the existing Windows schemas:

- `4.91`
- `4.90`

The default remains `4.91`.

## Scope

In scope:

- Add a VS Code setting named `sysmon.schemaVersion`.
- Contribute allowed setting values `4.91` and `4.90`.
- Read the setting when providing completions.
- Read the setting when updating diagnostics.
- Fall back to schema `4.91` when the setting is missing or invalid.
- Keep existing exported constants default-schema based for compatibility.
- Add tests for schema version metadata and schema-aware helper behavior.

Out of scope:

- Loading user-provided XML schema files.
- Manifest parser or generator work.
- Auto-detecting schema version from the open document.
- Root `<Sysmon schemaversion="">` diagnostics.
- README or CHANGELOG updates.

## Configuration

Add this setting in `package.json`:

```json
"sysmon.schemaVersion": {
	"type": "string",
	"default": "4.91",
	"enum": ["4.91", "4.90"],
	"description": "Windows Sysmon schema version used for completions and diagnostics."
}
```

The setting should be read from the `sysmon` configuration section:

```ts
vscode.workspace.getConfiguration('sysmon').get<string>('schemaVersion')
```

## Schema API

`src/sysmonSchema.ts` already exposes:

```ts
getSysmonSchema(version?: string): SysmonSchemaDefinition
```

Add this helper:

```ts
export function getSysmonSchemaVersions(): readonly string[]
```

This helper should return supported schema versions in registry order:

```ts
['4.91', '4.90']
```

## Extension Helpers

The existing exported completion and diagnostic helpers currently use default schema constants. Preserve their current public behavior.

Add optional schema parameters to the existing helpers so tests and VS Code integration can pass a selected schema without duplicating logic:

```ts
export function getAttributeCompletions(
	linePrefix: string,
	schema: SysmonSchemaDefinition = getSysmonSchema()
): readonly string[] | undefined

export function getElementCompletions(
	documentText: string,
	linePrefix: string,
	schema: SysmonSchemaDefinition = getSysmonSchema()
): readonly string[] | undefined

export function getFieldCompletions(
	documentText: string,
	linePrefix: string,
	schema: SysmonSchemaDefinition = getSysmonSchema()
): readonly string[] | undefined

export function getSysmonDiagnostics(
	documentText: string,
	schema: SysmonSchemaDefinition = getSysmonSchema()
): SysmonDiagnostic[]
```

The defaults preserve current tests and callers.

## Runtime Flow

During completion:

1. Read selected schema version from VS Code configuration.
2. Resolve it with `getSysmonSchema(version)`.
3. Pass the schema to attribute, field, and event completion helpers.

During diagnostics:

1. Read selected schema version from VS Code configuration.
2. Resolve it with `getSysmonSchema(version)`.
3. Pass the schema to `getSysmonDiagnostics()`.

When configuration changes:

- If the changed setting affects `sysmon.schemaVersion`, refresh diagnostics for currently open `smc` documents.

## Tests

Update or add tests to verify:

- `package.json` contributes `sysmon.schemaVersion`.
- The setting default is `4.91`.
- The setting enum is `['4.91', '4.90']`.
- `getSysmonSchemaVersions()` returns `['4.91', '4.90']`.
- Existing default helper behavior remains unchanged.
- Schema-aware helpers accept an explicit `getSysmonSchema('4.90')` argument.
- Unknown schema setting values resolve through `getSysmonSchema()` fallback to `4.91`.

Because the current `4.90` and `4.91` filterable event surfaces are equivalent, tests should focus on plumbing and fallback behavior instead of inventing false behavioral differences.

## Risks

The selected schema will not visibly change completions yet because `4.90` and `4.91` currently have equivalent filterable event surfaces. This is acceptable because the feature establishes the runtime plumbing for future schema differences.

Configuration is read at completion/diagnostic time rather than cached. This is simple and avoids stale state. If this becomes expensive later, a small cache can be added.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```
