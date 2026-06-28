# Windows Manifest Schema Registry Design

Date: 2026-06-28

## Goal

Use the Windows Sysmon manifest schemas pasted by the user as the source of truth for schema data used by snippets, completions, and diagnostics.

This replaces the earlier single-schema design. Sysmon schema `4.91` remains the default, and schema `4.90` is also supported because it gives the extension manifest-backed Windows coverage going back roughly three years.

## Source of Truth

Add the pasted Windows manifests to the repository as checked-in source files:

```text
schema/manifests/windows/sysmon-4.90.xml
schema/manifests/windows/sysmon-4.91.xml
```

These files are authoritative for this slice:

- platform: `windows`
- `schemaversion`
- `binaryversion`
- filter operators from `<filters>`
- event IDs from `<event value="">`
- event tags from `<event rulename="">`
- event field names from each event's `<data name="">`

The implementation should not download schemas, invoke Sysmon, or load arbitrary local schema files.

## Scope

In scope:

- Add both Windows manifest XML files.
- Add a schema registry data model in `src/sysmonSchema.ts`.
- Add `4.90` and `4.91` Windows schema entries to the registry.
- Make `4.91` the default schema.
- Preserve existing exports for low-risk compatibility.
- Update `CONDITION_OPERATORS` and `SYSMON_EVENTS` to reflect the default schema.
- Keep only filterable event entries, meaning events with a manifest `rulename`.
- Merge fields for grouped rule names:
  - `RegistryEvent` from event IDs 12, 13, and 14
  - `PipeEvent` from event IDs 17 and 18
  - `WmiEvent` from event IDs 19, 20, and 21
- Update the Windows config snippet schema version picker to support only `4.91` and `4.90`.
- Preserve the existing Linux snippet without adding Windows schema versions to it.
- Update tests to assert registry metadata, default schema behavior, snippet versions, filters, event coverage, and representative field lists.

Out of scope:

- User-configurable schema selection in VS Code settings.
- Runtime loading of arbitrary local XML schema files.
- Automatic manifest parser or generator script.
- Live schema download.
- Running Sysmon.
- README/CHANGELOG updates.
- Splitting grouped rule names into separate authoring tags.

## Data Model

`src/sysmonSchema.ts` should continue exporting:

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

Add:

```ts
export interface SysmonSchemaDefinition {
	platform: 'windows';
	schemaVersion: string;
	binaryVersion: string;
	conditionOperators: string[];
	events: SysmonEventDefinition[];
}

export const DEFAULT_SYSMON_SCHEMA_VERSION = '4.91';
export const SYSMON_SCHEMAS: SysmonSchemaDefinition[] = [/* 4.91, 4.90 */];
export function getSysmonSchema(version?: string): SysmonSchemaDefinition;
```

Preserve these compatibility exports by pointing them at the default schema:

```ts
export const SYSMON_SCHEMA_VERSION = DEFAULT_SYSMON_SCHEMA_VERSION;
export const SYSMON_BINARY_VERSION = getSysmonSchema().binaryVersion;
export const CONDITION_OPERATORS = getSysmonSchema().conditionOperators;
export const SYSMON_EVENTS = getSysmonSchema().events;
```

The existing `getEventDefinition(name)` helper should keep matching by `name` or `tag` against the default schema.

## Filter Operators

Both Windows manifests use the same filter operator list. `CONDITION_OPERATORS` should match the default manifest filter order:

- `is`
- `is not`
- `contains`
- `contains any`
- `is any`
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

TrustedSec spelling aliases can remain diagnostic-only aliases in `src/extension.ts`; they should not be added to `CONDITION_OPERATORS` in this slice.

## Event Coverage

The default `4.91` schema should include one entry per manifest `rulename`, in first-seen manifest order:

- `ProcessCreate`: event ID 1
- `FileCreateTime`: event ID 2
- `NetworkConnect`: event ID 3
- `ProcessTerminate`: event ID 5
- `DriverLoad`: event ID 6
- `ImageLoad`: event ID 7
- `CreateRemoteThread`: event ID 8
- `RawAccessRead`: event ID 9
- `ProcessAccess`: event ID 10
- `FileCreate`: event ID 11
- `RegistryEvent`: event ID 12, merged from IDs 12, 13, 14
- `FileCreateStreamHash`: event ID 15
- `PipeEvent`: event ID 17, merged from IDs 17, 18
- `WmiEvent`: event ID 19, merged from IDs 19, 20, 21
- `DnsQuery`: event ID 22
- `FileDelete`: event ID 23
- `ClipboardChange`: event ID 24
- `ProcessTampering`: event ID 25
- `FileDeleteDetected`: event ID 26
- `FileBlockExecutable`: event ID 27
- `FileBlockShredding`: event ID 28
- `FileExecutableDetected`: event ID 29

Events without `rulename`, such as error, service state, and configuration state events, should not be included in schema `events` because they are not filter tags.

Schema `4.90` should be represented as its own registry entry even if its filterable events and fields currently match `4.91`. This keeps the API ready for additional checked-in Windows schema versions later.

## Field Lists

Field lists should come from each manifest event's `<data name="">` entries.

For grouped rule names, merge fields in manifest order and de-duplicate by field name:

- `RegistryEvent`: fields from event IDs 12, 13, and 14
- `PipeEvent`: fields from event IDs 17 and 18
- `WmiEvent`: fields from event IDs 19, 20, and 21

This means field completions and unknown-field diagnostics will include manifest runtime fields such as `RuleName`, `UtcTime`, `ProcessGuid`, and `ProcessId`.

## Snippets

Update the Windows config snippet in `snippets/smc.json`.

The snippet body currently offers older schema versions. Replace that picker with only the checked-in Windows schema versions:

```text
${1|4.91,4.90|}
```

Do not change the Linux config snippet in this slice. It remains separate from the Windows schema registry because the pasted manifests are Windows Sysmon schemas.

## Tests

Update `src/test/suite/sysmonSchema.test.ts`.

Tests should verify:

- `DEFAULT_SYSMON_SCHEMA_VERSION` equals `4.91`.
- `SYSMON_SCHEMA_VERSION` equals `4.91`.
- `SYSMON_BINARY_VERSION` equals `18`.
- `SYSMON_SCHEMAS` contains only Windows schema versions `4.91` and `4.90`.
- `getSysmonSchema()` returns the `4.91` schema.
- `getSysmonSchema('4.90')` returns the `4.90` schema.
- Unknown schema versions fall back to the default schema.
- `CONDITION_OPERATORS` exactly matches the default manifest filter order.
- Default event tags match the manifest `rulename` order.
- `ProcessCreate` includes manifest fields including `RuleName`, `UtcTime`, `ProcessGuid`, `Image`, `CommandLine`, `ParentImage`, and `ParentUser`.
- `ImageLoad` includes `FileVersion`, `OriginalFileName`, and `User`.
- `RegistryEvent` includes merged fields `Details` and `NewName`.
- `PipeEvent` includes merged field `PipeName`.
- `WmiEvent` includes merged fields `EventNamespace`, `Destination`, `Consumer`, and `Filter`.
- `FileExecutableDetected` does not include `IsExecutable`, because the pasted manifests' event ID 29 does not include that field.
- Existing completion and diagnostic tests still pass after expectation updates.

Update or add snippet tests to verify:

- The Windows config snippet schema picker contains only `4.91` and `4.90`.
- The Linux config snippet remains unchanged.

## Risks

The manifests are checked in manually in this slice, so schema data can drift if a newer manifest is pasted later. That is acceptable because this establishes a registry structure and two authoritative Windows schemas. A future generator can parse the XML and produce `src/sysmonSchema.ts` automatically.

Expanding field lists to include runtime fields may make more field completions available than users normally filter on. This is acceptable because the manifest is now the source of truth, and later UX work can distinguish commonly filtered fields from all manifest fields.

The registry does not yet let users choose a schema version for completions or diagnostics. That is intentional for this slice; it keeps the work low risk while creating the foundation for a future `sysmon.schemaVersion` setting.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.
