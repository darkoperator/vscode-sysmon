# Schema Platform and Version Selection Design

Date: 2026-06-28

## Goal

Allow users to choose which checked-in Sysmon schema the extension uses for completions and diagnostics, using both platform and schema version.

This replaces the earlier version-only design because Windows and Linux Sysmon can share version numbers while having different options, fields, and event details.

The first implemented platform remains Windows:

- platform: `windows`
- versions: `4.91`, `4.90`

The default remains Windows schema `4.91`.

## Scope

In scope:

- Add a VS Code setting named `sysmon.platform`.
- Add a VS Code setting named `sysmon.schemaVersion`.
- Contribute allowed platform value `windows` for this slice.
- Contribute allowed schema version values `4.91` and `4.90` for this slice.
- Read both settings when providing completions.
- Read both settings when updating diagnostics.
- Resolve schemas by platform and version, not version alone.
- Fall back to Windows schema `4.91` when either setting is missing or invalid.
- Keep existing exported constants default-schema based for compatibility.
- Add tests for platform/version metadata and schema-aware helper behavior.

Out of scope:

- Adding Linux manifest files.
- Enabling Linux as a selectable setting value before Linux schema data exists.
- Loading user-provided XML schema files.
- Manifest parser or generator work.
- Auto-detecting schema platform or version from the open document.
- Root `<Sysmon schemaversion="">` diagnostics.
- README or CHANGELOG updates.

## Configuration

Add these settings in `package.json`:

```json
"sysmon.platform": {
	"type": "string",
	"default": "windows",
	"enum": ["windows"],
	"description": "Sysmon platform used for completions and diagnostics."
},
"sysmon.schemaVersion": {
	"type": "string",
	"default": "4.91",
	"enum": ["4.91", "4.90"],
	"description": "Sysmon schema version used for completions and diagnostics."
}
```

The settings should be read from the `sysmon` configuration section:

```ts
const configuration = vscode.workspace.getConfiguration('sysmon');
const platform = configuration.get<string>('platform');
const schemaVersion = configuration.get<string>('schemaVersion');
```

Linux should not be listed as an enum value until at least one Linux schema is checked in and represented in the schema registry.

## Schema API

`src/sysmonSchema.ts` currently stores platform and version on each schema entry. Make schema lookup platform-aware.

Add explicit platform and lookup types:

```ts
export type SysmonSchemaPlatform = 'windows';

export interface SysmonSchemaLookup {
	readonly platform?: string;
	readonly schemaVersion?: string;
}
```

Update `SysmonSchemaDefinition.platform` to use `SysmonSchemaPlatform`.

Change schema lookup to accept platform and version:

```ts
export function getSysmonSchema(lookup?: SysmonSchemaLookup): SysmonSchemaDefinition
```

The lookup should:

1. Use the default platform `windows` when `lookup.platform` is missing or unknown.
2. Use the default version `4.91` when `lookup.schemaVersion` is missing or unknown for the resolved platform.
3. Return the schema matching resolved platform and version.

Add these helpers:

```ts
export function getSysmonSchemaPlatforms(): readonly SysmonSchemaPlatform[]
export function getSysmonSchemaVersions(platform?: string): readonly string[]
```

Current helper results:

```ts
getSysmonSchemaPlatforms() // ['windows']
getSysmonSchemaVersions('windows') // ['4.91', '4.90']
getSysmonSchemaVersions('linux') // []
```

Preserve current constants:

```ts
DEFAULT_SYSMON_SCHEMA_VERSION
SYSMON_SCHEMA_VERSION
SYSMON_BINARY_VERSION
CONDITION_OPERATORS
SYSMON_EVENTS
```

Add:

```ts
DEFAULT_SYSMON_SCHEMA_PLATFORM
SYSMON_SCHEMA_PLATFORM
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

1. Read selected platform and schema version from VS Code configuration.
2. Resolve them with `getSysmonSchema({ platform, schemaVersion })`.
3. Pass the schema to attribute, field, and event completion helpers.

During diagnostics:

1. Read selected platform and schema version from VS Code configuration.
2. Resolve them with `getSysmonSchema({ platform, schemaVersion })`.
3. Pass the schema to `getSysmonDiagnostics()`.

When configuration changes:

- If the changed setting affects `sysmon.platform` or `sysmon.schemaVersion`, refresh diagnostics for currently open `smc` documents.

## Future Linux Support

Linux schemas should be added as separate platform-scoped schema entries, not as alternate Windows versions.

Expected future manifest layout:

```text
schema/manifests/windows/sysmon-4.91.xml
schema/manifests/windows/sysmon-4.90.xml
schema/manifests/linux/sysmon-4.91.xml
```

Expected future registry behavior:

```ts
getSysmonSchema({ platform: 'windows', schemaVersion: '4.91' })
getSysmonSchema({ platform: 'linux', schemaVersion: '4.91' })
```

Those two calls may return different field lists even though the schema version string is the same.

## Tests

Update or add tests to verify:

- `package.json` contributes `sysmon.platform`.
- `sysmon.platform` default is `windows`.
- `sysmon.platform` enum is `['windows']`.
- `package.json` contributes `sysmon.schemaVersion`.
- `sysmon.schemaVersion` default is `4.91`.
- `sysmon.schemaVersion` enum is `['4.91', '4.90']`.
- `getSysmonSchemaPlatforms()` returns `['windows']`.
- `getSysmonSchemaVersions('windows')` returns `['4.91', '4.90']`.
- `getSysmonSchemaVersions('linux')` returns `[]`.
- `getSysmonSchema({ platform: 'windows', schemaVersion: '4.90' })` returns Windows `4.90`.
- Unknown platform values fall back to Windows `4.91`.
- Unknown schema version values fall back to Windows `4.91`.
- Existing default helper behavior remains unchanged.
- Schema-aware helpers accept an explicit `getSysmonSchema({ platform: 'windows', schemaVersion: '4.90' })` argument.

Because current Windows `4.90` and `4.91` filterable event surfaces are equivalent, tests should focus on plumbing and fallback behavior instead of inventing false behavioral differences.

## Risks

The selected schema will not visibly change completions yet because Windows `4.90` and `4.91` currently have equivalent filterable event surfaces. This is acceptable because the feature establishes platform-aware runtime plumbing for future Linux schema differences.

Configuration is read at completion/diagnostic time rather than cached. This is simple and avoids stale state. If this becomes expensive later, a small cache can be added.

Only `windows` is exposed as a selectable platform initially. That is intentional; exposing `linux` before Linux schema data exists would imply support the extension does not yet have.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```
