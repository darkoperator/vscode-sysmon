# vscode-sysmon Roadmap Notes

Date: 2026-06-28

This file records pending feature ideas so work can resume cleanly after a session restart or model change.

## Current Baseline

Implemented recently:

- Windows Sysmon schema registry with checked-in schemas `4.90` and `4.91`.
- Default Windows schema version is `4.91`.
- Schema lookup is platform-aware, so future Linux schemas can share version numbers with Windows schemas without colliding.
- VS Code settings `sysmon.platform` and `sysmon.schemaVersion` select the active schema for completions and diagnostics.
- The only selectable platform today is `windows`; Linux should be exposed only after Linux schema data is added.
- Windows config snippet only offers `4.91` and `4.90`.
- Manifest-backed event, field, and condition data drives completions and diagnostics.
- Unknown event, unknown field, and invalid attribute diagnostics are present.

## Pending Features

### 1. Manifest Parser or Generator

Parse checked-in manifest XML files and generate schema data used by `src/sysmonSchema.ts`.

Why:

- Avoids manual drift between XML manifests and TypeScript schema data.
- Makes future schema additions safer.

Likely files:

- New script under `scripts/`, for example `scripts/generateSysmonSchema.ts` or `.js`.
- `schema/manifests/windows/*.xml` as inputs.
- `src/sysmonSchema.ts` or a generated data file as output.
- Tests that compare generated data against expected schema metadata.

### 2. Linux Schema Support

Add Linux Sysmon schemas as separate platform-scoped registry entries.

Why:

- Linux and Windows Sysmon can share schema version numbers while having different fields or configuration options.
- Platform-aware lookup is needed before Linux schema support is added.

Expected future layout:

```text
schema/manifests/windows/sysmon-4.91.xml
schema/manifests/windows/sysmon-4.90.xml
schema/manifests/linux/sysmon-4.91.xml
```

Expected future lookup behavior:

```ts
getSysmonSchema({ platform: 'windows', schemaVersion: '4.91' })
getSysmonSchema({ platform: 'linux', schemaVersion: '4.91' })
```

Those calls may return different schema data even though the version string is the same.

Likely files:

- `schema/manifests/linux/*.xml`.
- `src/sysmonSchema.ts` for Linux schema registry entries.
- `package.json` to expose `linux` in `sysmon.platform` once Linux data exists.
- `src/test/suite/sysmonSchema.test.ts`.
- `src/test/suite/extension.test.ts`.

### 3. User-Provided Schema File

Allow users to point the extension at a local Sysmon manifest XML file.

Why:

- Useful for users testing newer Sysmon releases before the extension ships a checked-in schema.

Risk:

- Higher complexity than checked-in schemas because it needs file loading, error handling, caching, and diagnostics refresh behavior.

Likely files:

- `package.json` for configuration contribution.
- `src/extension.ts` for configuration and refresh behavior.
- New schema loading/parsing module.
- Tests for missing files, invalid XML, and fallback behavior.

### 4. XML-Aware Parsing

Replace lightweight text scanning with XML-aware parsing for completions and diagnostics.

Why:

- Current logic can be fooled by malformed XML, unusual nesting, comments, or multiline structures.
- Parser-backed ranges and active-event detection would be more reliable.

Likely files:

- New parser/helper module under `src/`.
- `src/extension.ts` to use parsed document state.
- Existing completion and diagnostic tests, plus new malformed/nested XML cases.

### 5. Snippet and Schema Alignment

Generate or validate snippets from schema data.

Why:

- Prevents drift between `snippets/smc.json` and `src/sysmonSchema.ts`.
- Helps keep event and field snippets aligned with supported schemas.

Likely files:

- `snippets/smc.json`.
- New validation or generation script under `scripts/`.
- `src/test/suite/snippets.test.ts`.

### 6. Documentation Update

Update user-facing docs to reflect the current extension behavior.

Why:

- `README.md` still says the extension is based on Sysmon schema `4.30`.
- It should mention Windows schemas `4.90` and `4.91`, schema-backed completions, and diagnostics.

Likely files:

- `README.md`.
- `CHANGELOG.md`.

### 7. Schema-Aware Root Diagnostics

Validate the root `<Sysmon schemaversion="...">` value.

Why:

- The extension now has an explicit supported Windows schema list.
- It can warn when a Windows config uses unsupported versions outside `4.90` and `4.91`.

Likely files:

- `src/extension.ts` diagnostic helper.
- `src/sysmonSchema.ts` for supported schema version data if needed.
- `src/test/suite/extension.test.ts`.

## Recommended Next Feature

Start with **Manifest Parser or Generator** if the next goal is long-term schema maintainability.

Start with **Linux Schema Support** if the next goal is user-visible platform expansion. The platform-aware schema selection work is already in place, so Linux support can be added as separate platform-scoped schema data without changing the schema lookup model.
