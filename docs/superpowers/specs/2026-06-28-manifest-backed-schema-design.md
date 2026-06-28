# Manifest-Backed Schema Design

Date: 2026-06-28

## Goal

Use the Sysmon manifest schema pasted by the user as the source of truth for schema data used by completions and diagnostics.

This should replace the current snippet-curated event and field lists with manifest-backed values while preserving the existing runtime API in `src/sysmonSchema.ts`.

## Source of Truth

Add the pasted manifest to the repository as:

```text
schema/sysmon-4.91-manifest.xml
```

This file is authoritative for this slice:

- `schemaversion`: `4.91`
- `binaryversion`: `18`
- filter operators from `<filters>`
- event IDs from `<event value="">`
- event tags from `<event rulename="">`
- event field names from each event's `<data name="">`

The implementation should not download or invoke Sysmon. It should use the checked-in manifest content.

## Scope

In scope:

- Add the manifest XML file.
- Add schema metadata constants for schema version and binary version.
- Update `CONDITION_OPERATORS` to exactly match the manifest `<filters>` list.
- Update `SYSMON_EVENTS` to use manifest-backed events and fields.
- Keep only filterable event entries in `SYSMON_EVENTS`, meaning events with a manifest `rulename`.
- Merge fields for grouped rule names:
  - `RegistryEvent` from event IDs 12, 13, and 14
  - `PipeEvent` from event IDs 17 and 18
  - `WmiEvent` from event IDs 19, 20, and 21
- Preserve existing completions and diagnostics APIs.
- Update tests to assert manifest-backed metadata, filters, event coverage, and representative field lists.

Out of scope:

- Automatic manifest parser or generator script.
- Live schema download.
- Running Sysmon.
- Changing snippets.
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
export const SYSMON_SCHEMA_VERSION = '4.91';
export const SYSMON_BINARY_VERSION = '18';
```

The existing `getEventDefinition(name)` helper should keep matching by `name` or `tag`.

## Filter Operators

`CONDITION_OPERATORS` should exactly match the manifest filters list:

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

The ordering should match the manifest. TrustedSec spelling aliases can remain diagnostic-only aliases in `src/extension.ts`; they should not be added to `CONDITION_OPERATORS` in this slice.

## Event Coverage

`SYSMON_EVENTS` should include one entry per manifest `rulename`, in first-seen manifest order:

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

Events without `rulename`, such as error, service state, and configuration state events, should not be included in `SYSMON_EVENTS` because they are not filter tags.

## Field Lists

Field lists should come from each manifest event's `<data name="">` entries.

For grouped rule names, merge fields in manifest order and de-duplicate by field name:

- `RegistryEvent`: fields from event IDs 12, 13, and 14
- `PipeEvent`: fields from event IDs 17 and 18
- `WmiEvent`: fields from event IDs 19, 20, and 21

This means field completions and unknown-field diagnostics will include manifest runtime fields such as `RuleName`, `UtcTime`, `ProcessGuid`, and `ProcessId`.

## Tests

Update `src/test/suite/sysmonSchema.test.ts`.

Tests should verify:

- `SYSMON_SCHEMA_VERSION` equals `4.91`.
- `SYSMON_BINARY_VERSION` equals `18`.
- `CONDITION_OPERATORS` exactly matches the manifest filter order.
- Event tags match the manifest `rulename` order.
- `ProcessCreate` includes manifest fields including `RuleName`, `UtcTime`, `ProcessGuid`, `Image`, `CommandLine`, `ParentImage`, and `ParentUser`.
- `ImageLoad` includes `FileVersion`, `OriginalFileName`, and `User`.
- `RegistryEvent` includes merged fields `Details` and `NewName`.
- `PipeEvent` includes merged field `PipeName`.
- `WmiEvent` includes merged fields `EventNamespace`, `Destination`, `Consumer`, and `Filter`.
- `FileExecutableDetected` does not include `IsExecutable`, because the pasted manifest event ID 29 does not include that field.
- Existing completion and diagnostic tests still pass after expectation updates.

## Risks

The manifest is checked in manually in this slice, so it can drift if a newer manifest is pasted later. That is acceptable because this establishes one authoritative file and aligns runtime schema data to it. A future generator can parse the XML and produce `src/sysmonSchema.ts` automatically.

Expanding field lists to include runtime fields may make more field completions available than users normally filter on. This is acceptable because the manifest is now the source of truth, and later UX work can distinguish commonly filtered fields from all manifest fields.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.
