# Sysmon Event Coverage Expansion Design

Date: 2026-06-28

## Goal

Expand `SYSMON_EVENTS` so existing event tag and field tag completions cover the event types already represented by the extension's snippets.

This should be a data-only feature. It should improve completions immediately without changing completion provider behavior, adding diagnostics, or introducing schema generation.

## Scope

In scope:

- Add more `SysmonEventDefinition` entries to `src/sysmonSchema.ts`.
- Use existing `snippets/smc.json` event snippets and filter-set snippets as the local source for event tags and field names.
- Preserve the current event IDs, tags, and fields for `ProcessCreate`, `NetworkConnect`, and `ImageLoad`.
- Add schema tests for expanded event coverage and selected field lists.
- Keep existing completion helper tests passing.

Out of scope:

- New VS Code provider behavior.
- XML parsing.
- Diagnostics.
- Hover providers.
- Snippet generation.
- README table generation.
- Downloading, invoking, or scraping a live/current Sysmon binary or schema.

## Event Coverage

The expansion should cover the Sysmon event tag snippets currently present in `snippets/smc.json`:

- `ProcessCreate`
- `FileCreateTime`
- `NetworkConnect`
- `ProcessTerminate`
- `DriverLoad`
- `ImageLoad`
- `CreateRemoteThread`
- `RawAccessRead`
- `ProcessAccess`
- `FileCreate`
- `RegistryEvent`
- `FileCreateStreamHash`
- `PipeEvent`
- `WmiEvent`
- `DnsQuery`
- `FileDelete`
- `FileBlockExecutable`
- `FileExecutableDetected`
- `FileBlockShredding`
- `FileDeleteDetected`
- `ClipboardChange`
- `ProcessTampering`

The existing snippet key named `Sysmon EventType FileBlockExecutableDetected` emits the tag `FileExecutableDetected`; the schema data should use the emitted tag, `FileExecutableDetected`.

## Event IDs

Use common Sysmon event IDs for the covered events:

- `ProcessCreate`: 1
- `FileCreateTime`: 2
- `NetworkConnect`: 3
- `ProcessTerminate`: 5
- `DriverLoad`: 6
- `ImageLoad`: 7
- `CreateRemoteThread`: 8
- `RawAccessRead`: 9
- `ProcessAccess`: 10
- `FileCreate`: 11
- `RegistryEvent`: 12
- `FileCreateStreamHash`: 15
- `PipeEvent`: 17
- `WmiEvent`: 19
- `DnsQuery`: 22
- `FileDelete`: 23
- `ClipboardChange`: 24
- `ProcessTampering`: 25
- `FileDeleteDetected`: 26
- `FileBlockExecutable`: 27
- `FileBlockShredding`: 28
- `FileExecutableDetected`: 29

`RegistryEvent`, `PipeEvent`, and `WmiEvent` intentionally represent grouped Sysmon event families in the existing snippet model. The schema should keep these grouped tags for now because completion tags must match the current snippets.

## Fields

Field lists should be curated from the local filter-set snippets in `snippets/smc.json`.

The implementation should add fields for every expanded event. Field lists do not need to include runtime-only values that users normally do not filter on unless they already appear in the local filter-set snippets.

The initial expanded field lists should include at least:

- `FileCreateTime`: `Image`, `TargetFilename`, `PreviousCreationUtcTime`, `User`
- `ProcessTerminate`: `Image`, `User`
- `DriverLoad`: `ImageLoaded`, `Hashes`, `Signed`, `Signature`, `SignatureStatus`
- `CreateRemoteThread`: `SourceImage`, `TargetImage`, `StartAddress`, `StartModule`, `StartFunction`, `SourceUser`, `TargetUser`
- `RawAccessRead`: `Image`, `Device`, `User`
- `ProcessAccess`: `SourceThreadId`, `SourceImage`, `TargetImage`, `GrantedAccess`, `CallTrace`, `SourceUser`, `TargetUser`
- `FileCreate`: `Image`, `TargetFilename`, `User`
- `RegistryEvent`: `EventType`, `Image`, `TargetObject`, `Details`, `NewName`, `User`
- `FileCreateStreamHash`: `Image`, `TargetFilename`, `Hash`, `User`
- `PipeEvent`: `EventType`, `PipeName`, `Image`, `User`
- `WmiEvent`: `EventType`, `Operation`, `User`, `EventNamespace`, `Name`, `Query`, `Type`, `Destination`, `Consumer`, `Filter`
- `DnsQuery`: `QueryName`, `QueryStatus`, `QueryResults`, `Image`, `User`
- `FileDelete`: `User`, `Image`, `TargetFilename`, `Hashes`, `IsExecutable`
- `ClipboardChange`: `ProcessGuid`, `ProcessId`, `Image`, `Session`, `Hashes`, `ClientInfo`, `Archived`, `User`
- `ProcessTampering`: `ProcessGuid`, `ProcessId`, `Image`, `Type`, `User`
- `FileBlockExecutable`: `User`, `Image`, `TargetFilename`, `Hashes`
- `FileBlockShredding`: `User`, `Image`, `TargetFilename`, `Hashes`, `IsExecutable`
- `FileExecutableDetected`: `User`, `Image`, `TargetFilename`, `Hashes`, `IsExecutable`
- `FileDeleteDetected`: `User`, `Image`, `TargetFilename`, `Hashes`, `IsExecutable`

`ProcessCreate`, `NetworkConnect`, and `ImageLoad` can be expanded with additional fields already represented in local filter-set snippets, but their existing field names must remain in the same relative order where practical.

## Architecture

Keep the schema module as the only code file changed:

- `src/sysmonSchema.ts` owns the expanded `SYSMON_EVENTS` array.
- `src/extension.ts` should not change.

The existing completion constants derive from `SYSMON_EVENTS`, so event tag and field tag completions will pick up the expanded data automatically.

## Tests

Update `src/test/suite/sysmonSchema.test.ts`.

Tests should verify:

- The schema includes all expected expanded event tags.
- Every event has a unique tag.
- Every event has a unique numeric event ID.
- Selected expanded events have the expected field list:
  - `FileCreateTime`
  - `ProcessAccess`
  - `RegistryEvent`
  - `DnsQuery`
  - `FileExecutableDetected`
- Existing lookup tests still pass.

Update `src/test/suite/extension.test.ts` only to adjust existing assertions that directly depend on the full event tag list. Provider behavior should not change.

## Risks

The main risk is data accuracy. This slice uses local snippets as the source of truth, not a live Sysmon schema. That keeps implementation risk low but means coverage may still drift from current Sysmon releases.

Grouped tags such as `RegistryEvent`, `PipeEvent`, and `WmiEvent` are intentionally preserved from the existing snippet model. A future generated schema can split those into more precise event types if the extension decides to change its authoring model.

## Verification

Required commands:

```bash
npm audit
npm run compile
npm test
```

All three should pass before implementation is considered complete.
