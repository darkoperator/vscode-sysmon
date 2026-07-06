# Change Log

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

## [1.0.0]

- Initial release

## [1.1.0] - 2019-12-21

### Added

- Support for specifying 4.23 schema.
- Added new operators in the 4.23 schema (excludes all, excludes any)

## [1.2.0] - 2020-05-15

### Added

- Support for specifying 4.3 schema.
- Added snippets for DnsLookup and FileDelete.
- Fixed bug when creating initial config where intellisense for some fields was wrong.

## [1.7.0] - 2021-08-17

### Added

- Support for specifying 4.81 schema for Linux Sysmon.
- Added initial config template for Linux Sysmon
- Added Field Length snippet for specifying the command and image filed length.
- Added ParentUser, User, TargetUser and SourceUser attribute field snippets for Linux Sysmon. 

## [1.8.0] - 2022-08-17

### Added

- Bump path-parse from 1.0.6 to 1.0.7.
- Bump ansi-regex from 3.0.0 to 3.0.1.


## [1.8.1] - 2022-09-10

### Added

- FileBlockExe event type support.
- Support for specifying 4.82 schema .


## [1.8.2] - 2022-10-09

### Added

- FileBlockShredding event type support.
- Support for specifying 4.83 schema.
- Raise support level for VS Code version. 

## [1.8.3] - 2022-10-10

### Added

- Fixed description typos.
- Added missing even type information for fileblockshredding.

## [1.9.0]
- Support for Schema 4.90 with the Sysmon 15.0 version.
- Removed support for schema 4.60. 
- FileExecutableDetected event type support.
