# Change Log

## [2.1.0] - 2026-09-25

### Added

- Added diagnostics for duplicate event filters when the same event tag declares more than one `onmatch="include"` or more than one `onmatch="exclude"`.
- Added a root diagnostic that warns when `<Sysmon schemaversion="...">` declares a version outside the supported set for the active platform.
- Added Linux Sysmon schema support: the `sysmon.platform` setting now offers `linux`, backed by a checked-in Linux `4.90` manifest. Linux-only events such as `eBPFEvent` are included, and Windows-only events are excluded per the manifest's `target` attribute.
- Added a `sysmon.customSchemaPath` setting that points the extension at a local Sysmon manifest XML. When loadable it overrides the built-in schema (filtered by `sysmon.platform`); missing or invalid files fall back to the built-in schema with a one-time warning. The file is watched and re-parsed (mtime-cached) so edits to it refresh completions and diagnostics live.
- Added Sysmon XML formatting support for `.smc` files, including Format Document and Format Selection, without claiming generic XML files.

### Changed

- Schema event, field, and condition data is now parsed from the checked-in manifest XML files at runtime instead of hand-maintained TypeScript arrays, removing drift between the manifests and the schema data.
- The manifest parser now understands the `target` attribute (`all`/`windows`/`linux`/`internal`) and the `<manifests>` wrapper, so a single target-tagged manifest produces the correct per-platform event surface.
- Aligned every snippet condition picker with the schema condition operators — added the missing `is any` operator and corrected operator ordering across the condition snippet and all field-filter snippets, and updated the Linux config snippet to declare schema version `4.90` instead of `4.81`. Snippet tests now derive their expectations from the schema so these can no longer drift.
- Replaced the line-scanning heuristics behind completions and diagnostics with a tolerant XML scanner (`src/xmlScanner.ts`). EventFiltering context and the active event are now resolved from proper tag nesting, comment regions are excluded structurally, and attribute values are validated only on real attributes. This fixes false positives and missed errors around commented-out tags, nested rule groups, multiline tags, and attribute-looking text content.
- Rewrote `README.md` to document schema-backed completions, diagnostics, the supported `4.90`/`4.91` schemas, and the `sysmon.platform` and `sysmon.schemaVersion` settings (it previously referenced only schema `4.30`).
- Updated dev tooling so the test suite runs against current VS Code releases: `@vscode/test-electron` 3.1, `@types/node` 22, and TypeScript 5. Running the tests now requires Node.js 22 or later.
- Added `fast-xml-parser` as a runtime dependency for manifest parsing.
- Excluded `docs/`, `graphify-out/`, and stray `.vsix` files from the packaged extension.

### Security

- Bumped `brace-expansion` to 1.1.18 / 2.1.4 and `js-yaml` to 4.3.2 (Dependabot #10, #11, #12).

## [2.0.0] - 2026-07-05

### Added

- Added a Windows Sysmon schema registry backed by checked-in `4.90` and `4.91` manifests.
- Added platform-aware schema lookup so future Linux schemas can share version numbers with Windows schemas without colliding.
- Added VS Code settings for selecting the active Sysmon platform and schema version: `sysmon.platform` and `sysmon.schemaVersion`.
- Added schema-backed completions for Sysmon event tags, field tags, and condition operators.
- Added diagnostics for unknown event tags, unknown field tags, and invalid `condition`, `onmatch`, and `groupRelation` attribute values.
- Added tests for manifest source files, snippets, schema lookup, configuration settings, and schema-aware completion and diagnostic helpers.

### Changed

- Updated the Windows config snippet to offer only supported Windows schema versions `4.91` and `4.90`.
- Updated condition operator completions to follow the manifest filter list.
- Changed extension activation to run only for Sysmon language files.
- Associated Sysmon language mode with `.smc` files without claiming all `.xml` files.

### Removed

- Removed older unsupported Windows schema choices from the Windows config snippet picker.

## [1.9.0] - 2023-07-13

### Added

- Support for Schema 4.90 with the Sysmon 15.0 version.
- Removed support for schema 4.60. 
- FileExecutableDetected event type support.

## [1.8.3] - 2022-10-10

### Added

- Fixed description typos.
- Added missing even type information for fileblockshredding.

## [1.8.2] - 2022-10-09

### Added

- FileBlockShredding event type support.
- Support for specifying 4.83 schema.
- Raise support level for VS Code version. 

## [1.8.1] - 2022-09-10

### Added

- FileBlockExe event type support.
- Support for specifying 4.82 schema .

## [1.8.0] - 2022-08-17

### Added

- Bump path-parse from 1.0.6 to 1.0.7.
- Bump ansi-regex from 3.0.0 to 3.0.1.

## [1.7.0] - 2021-08-17

### Added

- Support for specifying 4.81 schema for Linux Sysmon.
- Added initial config template for Linux Sysmon
- Added Field Length snippet for specifying the command and image filed length.
- Added ParentUser, User, TargetUser and SourceUser attribute field snippets for Linux Sysmon. 

## [1.2.0] - 2020-05-15

### Added

- Support for specifying 4.3 schema.
- Added snippets for DnsLookup and FileDelete.
- Fixed bug when creating initial config where intellisense for some fields was wrong.

## [1.1.0] - 2019-12-21

### Added

- Support for specifying 4.23 schema.
- Added new operators in the 4.23 schema (excludes all, excludes any)

## [1.0.0]

- Initial release
