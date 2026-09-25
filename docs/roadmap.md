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

### 1. Manifest Parser or Generator — DONE

Status: Completed via runtime XML parsing (chose Option A over a build-time generator).

What shipped:

- `src/parseManifest.ts` parses a Sysmon manifest XML into a `SysmonSchemaDefinition` (events, fields, condition operators, schema/binary versions). It deduplicates shared-tag events (RegistryEvent, PipeEvent, WmiEvent) by `rulename`, merging their field sets.
- `src/sysmonSchema.ts` auto-discovers and parses `schema/manifests/{platform}/*.xml` at module load time. The hand-maintained event/field/condition arrays were removed.
- `fast-xml-parser` added as a runtime dependency.
- `src/test/suite/parseManifest.test.ts` covers version parsing, condition operators, shared-tag dedup/field merge, tag uniqueness, and frozen output.

Why (satisfied):

- Removes manual drift between XML manifests and schema data — the manifests are now the single source of truth.
- Adding a new schema is now just dropping an XML file into `schema/manifests/{platform}/` with no TypeScript changes.

### 2. Linux Schema Support — DONE

Status: Completed, using a real Linux Sysmon manifest provided from an actual Linux install.

Key design correction: Sysmon does **not** ship a separate Linux manifest with different schema data. Microsoft uses one manifest per version where each event/option carries a `target` attribute (`all`, `windows`, `linux`, or `internal`). The only Linux-distinguished event in schema `4.90` is `eBPFEvent` (`target="linux"`, ID 100); everything else is `target="all"`. So a platform's event surface is derived by filtering on `target`, not by maintaining duplicate per-platform data.

What shipped:

- `schema/manifests/linux/sysmon-4.90.xml` — the authoritative Linux manifest (a `<manifests>`-wrapped, `target`-tagged document).
- `parseManifest` now handles the `<manifests>` wrapper and filters events by `target`: a platform includes events with no target, `target="all"`, or `target="<platform>"`, and always excludes `target="internal"`.
- `sysmonSchema.ts`: `SysmonSchemaPlatform` is now `'windows' | 'linux'` and `KNOWN_PLATFORMS` discovers the `linux` manifest directory.
- `package.json`: `sysmon.platform` now offers `linux`.
- Tests: parser target-filtering (Linux includes `eBPFEvent`, Windows excludes it), platform/version registry, and the updated `sysmon.platform` enum.

Result: `getSysmonSchema({ platform: 'linux', schemaVersion: '4.90' })` returns the shared event surface plus `eBPFEvent`; the Windows schemas are unaffected.

### 3. User-Provided Schema File — DONE

Status: Completed.

What shipped:

- `sysmon.customSchemaPath` setting (`package.json`). Relative paths resolve against the first workspace folder.
- `loadSysmonSchemaFromFile(filePath, platform)` in `src/sysmonSchema.ts` — reads and parses a manifest, returning `undefined` for a missing file or one that does not parse into a manifest. Reuses the `target`-aware `parseManifest`, so a custom manifest is filtered by the configured `sysmon.platform`.
- `src/extension.ts` integration: when `customSchemaPath` is set and loadable it overrides the built-in schema; otherwise it falls back to the built-in schema and shows a one-time warning (no spam on every keystroke). Loads are mtime-cached so the file is not re-parsed on every edit, and a `FileSystemWatcher` (re-created when the setting changes) refreshes diagnostics when the custom file changes on disk.
- Tests: loader behavior (valid Windows manifest, target-filtered Linux manifest, missing file, non-manifest file) and the new setting contribution.

Design choices: a loadable custom schema overrides rather than augments the registry (predictable single source while testing a new release); errors fall back silently-with-one-warning rather than blocking; refresh is driven by both the config change and a file watcher.

### 4. XML-Aware Parsing — DONE

Status: Completed with a tolerant scanner (not a strict parser, because completions run on incomplete mid-edit input).

What shipped:

- `src/xmlScanner.ts` — a single-pass, tolerant scanner that emits tags (with name and attribute-value offsets) and comment ranges, and exposes `openElementsBefore(scan, offset)` for nesting-aware "open elements at a point". It degrades gracefully: an unterminated trailing tag or unterminated attribute value is simply not emitted.
- `src/extension.ts` now resolves EventFiltering context and the active event from the scanner's open-element stack, excludes comment regions structurally, and validates attribute values only on real attributes.
- Removed the `lastIndexOf`-based heuristics (`isInsideOpenEventFiltering`, `getActiveEvent`, regex tag/attribute scanning).

Bugs this fixed (covered by new tests):

- A commented-out event no longer hijacks active-event resolution.
- Attribute-looking text in element content is no longer falsely flagged.
- The active event resolves correctly through nested `RuleGroup` structure.
- Multiline tags are validated correctly.

Tests: `src/test/suite/xmlScanner.test.ts` (scanner units) plus new malformed/nested/comment/multiline cases in `src/test/suite/extension.test.ts`.

### 5. Snippet and Schema Alignment — DONE

Status: Completed via schema-derived validation tests (chose validation over a generation script).

Drift found and fixed in `snippets/smc.json`:

- The condition picker was missing the `is any` operator and ordered several operators differently from the schema. This wrong list was duplicated across the standalone condition snippet **and all 65 field-filter snippets**; every one is now aligned with `CONDITION_OPERATORS`.
- The Linux config snippet declared schema version `4.81`; it now declares `4.90`, matching the checked-in Linux schema.

What guards it going forward (`src/test/suite/snippets.test.ts`):

- Config snippet version pickers are asserted against `getSysmonSchemaVersions('windows')` / `('linux')`.
- Every `condition="${n|...|}"` picker in the snippets is asserted equal to `CONDITION_OPERATORS`.
- Event-type snippets are checked for a one-to-one mapping with Windows schema event tags.

These tests derive their expectations from the schema, so future schema changes that aren't mirrored in the snippets fail the suite.

### 6. Documentation Update — DONE

Status: Completed.

What shipped:

- Rewrote the `README.md` Features section to describe schema-backed completions, diagnostics, automatic tag closing, and the supported `4.90`/`4.91` Windows schemas (it previously referenced only schema `4.30`).
- Added "IntelliSense and Diagnostics" and "Settings" sections covering the completion/diagnostic behavior and the `sysmon.platform` / `sysmon.schemaVersion` settings.
- Added a `2.0.0` entry to the README Release Notes with a pointer to `CHANGELOG.md`.

### 7. Schema-Aware Root Diagnostics — DONE

Status: Completed.

What shipped:

- `getRootSchemaDiagnostics()` in `src/extension.ts` scans for `<Sysmon schemaversion="...">` and warns when the declared version is outside the supported set for the active platform (e.g. anything other than `4.91`/`4.90` on Windows). The warning range covers the version value, and declarations inside comments are ignored.
- Supported versions come from `getSysmonSchemaVersions(schema.platform)`, so the rule stays in sync with the manifest registry automatically.
- `src/test/suite/extension.test.ts` adds cases for unsupported versions, supported versions, a root tag with no version attribute, and commented-out declarations.

## Recommended Next Feature

All seven roadmap features are now done (#1 Manifest Parser, #2 Linux Schema Support, #3 User-Provided Schema File, #4 XML-Aware Parsing, #5 Snippet and Schema Alignment, #6 Documentation Update, #7 Schema-Aware Root Diagnostics).

Possible follow-on work beyond this roadmap:

- ~~Cut the `2.0.0` release~~ — 2.0.0 released 2026-07-05; roadmap features #1–#7 ship in `2.1.0`.
- Expose configuration `<option>` validation (the manifests carry `<options>` the extension does not yet use).
- Surface Linux-only events more prominently, or add more Linux schema versions as manifests become available.
