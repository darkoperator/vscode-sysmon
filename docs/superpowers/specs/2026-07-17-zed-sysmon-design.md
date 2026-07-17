# Zed Sysmon Extension — Design

**Date:** 2026-07-17
**Status:** Approved
**Goal:** Provide in the Zed editor the same Sysmon configuration authoring capability as the `vscode-sysmon` VS Code extension (v2.0.0), plus hover documentation.

## Background

The VS Code extension provides, for `.smc` Sysmon XML configuration files:

- Syntax highlighting (TextMate grammar), tag auto-closing, snippets.
- Schema-backed completions: event tags inside `<EventFiltering>`, field tags inside a known event, and allowed values for the `condition`, `onmatch`, and `groupRelation` attributes.
- Diagnostics: unknown event tags, unknown field tags, invalid attribute values, unsupported root `schemaversion`.
- An XML document formatter.
- Settings: `platform` (windows/linux), `schemaVersion` (4.91/4.90), `customSchemaPath` (custom manifest override with fallback to built-in).

All intelligence is driven by bundled Sysmon manifest XML files (Windows 4.91 and 4.90, Linux 4.90) parsed at runtime. The smart logic is ~1,200 lines of TypeScript (`extension.ts`, `formatter.ts`, `parseManifest.ts`, `sysmonSchema.ts`, `xmlScanner.ts`).

Zed's extension model differs fundamentally from VS Code's: extensions are Rust compiled to WebAssembly plus static assets. They can contribute a language definition (Tree-sitter grammar, query files, file suffixes), snippets, and register a language server. There is **no in-extension API** for completions, diagnostics, or formatting — those must come from a language server, which the extension must download or locate on the user's machine (Zed forbids shipping server binaries inside the extension package).

## Decisions made

| Decision | Choice |
|---|---|
| Capability scope | Full parity with the VS Code extension |
| Server implementation | Rust, distributed as prebuilt binaries via GitHub Releases |
| Repo layout | Two repositories: `sysmon-lsp` and `zed-sysmon` |
| V1 features | All parity features **plus** hover documentation (new) |

Alternatives considered and rejected:

- **Static-only extension** (highlighting + snippets, no LSP): too far below parity.
- **Reuse lemminx (generic XML LSP) with generated XSDs**: avoids writing a server but yields weaker diagnostics, awkward platform/version switching, and an XSD generation pipeline to maintain.
- **TypeScript/Node LSP reusing the existing code**: fastest path, but the user prefers a dependency-free native binary; Rust is idiomatic for the Zed ecosystem.

## Architecture

```
┌────────────────────┐         ┌──────────────────────────────┐
│ zed-sysmon (repo)  │ spawns  │ sysmon-lsp (repo)            │
│  Zed extension     │────────▶│  Rust LSP server (stdio)     │
│  - language config │  LSP    │  - embedded Sysmon manifests │
│  - ts-xml grammar  │◀────────│  - completions/diagnostics/  │
│  - queries         │         │    hover/formatting          │
│  - snippets        │         │  GitHub Releases binaries    │
│  - WASM glue       │         └──────────────────────────────┘
└────────────────────┘
```

The VS Code extension remains unchanged. `sysmon-lsp` is a clean-room Rust port of its logic and is editor-agnostic (usable from Neovim, Helix, Sublime, etc.).

## Component 1: `sysmon-lsp` (Rust language server)

**Framework:** `tower-lsp` or `lsp-server` (rust-analyzer's crate) — final pick during implementation. **XML parsing:** `quick-xml`. **Transport:** stdio.

**Manifests:** the same manifest XML files as vscode-sysmon (`schema/manifests/windows/{4.91,4.90}.xml`, `schema/manifests/linux/4.90.xml`) copied into the repo and embedded in the binary with `include_str!`.

**Modules**, mirroring the TypeScript sources:

| Module | Ports | Responsibility |
|---|---|---|
| `manifest.rs` | `parseManifest.ts` | Parse a Sysmon manifest into a schema model: events → fields, rule default names, event IDs, supported schema versions. |
| `schema.rs` | `sysmonSchema.ts` | Resolve active schema from settings (platform + version); load a custom manifest from `customSchemaPath` when set, falling back to built-in on any load/parse failure. |
| `scanner.rs` | `xmlScanner.ts` | Error-tolerant XML token scanner producing cursor context: inside `<EventFiltering>`? inside which event element? inside which attribute of which tag? |
| `features/completion.rs` | `extension.ts` | Event-tag completions inside `EventFiltering`; field-tag completions inside a known event; value completions for `condition`, `onmatch`, `groupRelation`. |
| `features/diagnostics.rs` | `extension.ts` | Warnings: unknown event tag, unknown field tag for the surrounding event, invalid `condition`/`onmatch`/`groupRelation` value, unsupported root `schemaversion` for the active platform. Published on open/change. |
| `features/hover.rs` | *(new)* | Hover on an event tag shows event ID, rule name, and template description from the manifest; hover on a field tag shows the field's metadata. |
| `features/formatting.rs` | `formatter.ts` | `textDocument/formatting` reproducing the VS Code formatter's output. |

**Settings** via LSP `workspace/configuration`, same keys, defaults, and semantics as VS Code:

- `sysmon.platform`: `"windows"` (default) or `"linux"`.
- `sysmon.schemaVersion`: `"4.91"` (default) or `"4.90"`; Linux supports `"4.90"`.
- `sysmon.customSchemaPath`: path to a custom manifest; empty by default; relative paths resolve against the workspace root; invalid/missing files fall back to the built-in schema.

Settings changes (`workspace/didChangeConfiguration`) rebuild the active schema and re-publish diagnostics for open documents.

## Component 2: `zed-sysmon` (Zed extension)

**`extension.toml`:** extension id `sysmon`, declares the grammar, the language, `snippets`, and `[language_servers.sysmon-lsp]` with `languages = ["Sysmon"]`.

**`languages/sysmon/config.toml`:** `name = "Sysmon"`, `grammar = "xml"`, `path_suffixes = ["smc"]`, XML brackets/auto-close pairs, `<!-- -->` block comments, 2-space soft tabs.

**Grammar and queries:** reuse the community Tree-sitter XML grammar pinned to the same `repository`/`rev` as the existing Zed XML extension, and start from that extension's `highlights.scm` / `brackets.scm` / `indents.scm` / `outline.scm` so `.smc` files highlight consistently with Zed's XML. (The TextMate grammar from VS Code cannot be reused; Zed only supports Tree-sitter. Exact repo/rev/query provenance is verified at implementation time against the current Zed XML extension.)

**`snippets/sysmon.json`:** mechanical conversion of `snippets/smc.json`. Zed snippet JSON uses the same `prefix`/`body`/`description` shape and LSP snippet syntax (including `${1|a,b|}` choices), keyed by the lowercase language name. All existing snippets carry over, including the `!EventName` and `!FieldName` filter snippets.

**`src/lib.rs` (WASM glue),** standard Zed language-server extension pattern:

1. If `sysmon-lsp` is on `$PATH`, use it.
2. Otherwise query the latest `sysmon-lsp` GitHub release, download the asset matching the user's OS/arch into the extension's work directory, mark it executable, and cache it (re-download only on new release).
3. Return the launch command.
4. Implement `language_server_workspace_configuration` to forward the user's Zed settings block to the server:

```jsonc
// Zed settings.json
"lsp": {
  "sysmon-lsp": {
    "settings": {
      "sysmon": { "platform": "windows", "schemaVersion": "4.91", "customSchemaPath": "" }
    }
  }
}
```

**Existing `.xml` configs:** Zed users select the Sysmon language via the language selector or map paths with Zed's `file_types` setting (e.g., `"Sysmon": ["sysmonconfig*.xml"]`); documented in the README.

## Distribution and CI

- **`sysmon-lsp`:** GitHub Actions release workflow on tag push building binaries for `macos-arm64`, `macos-x64`, `linux-x64`, `linux-arm64`, `windows-x64`, attached to the GitHub Release with predictable asset names the extension glue can construct.
- **`zed-sysmon`:** usable immediately as a Zed *dev extension* (install from local directory); published to the Zed extension registry via PR to `zed-industries/extensions` once v1 is verified.

## Testing

- **Rust unit tests** porting the VS Code extension's test intent: manifest parsing for each bundled platform/version; scanner context detection cases; each diagnostic rule (positive and negative); completion sets at representative cursor positions; formatter snapshot tests against known input/output pairs.
- **Integration test:** drive the compiled server over stdio — initialize, open a sample `.smc` document, assert published diagnostics; request completions and hover at fixed positions; request formatting.
- **Manual checklist in Zed:** install as dev extension, open a real-world Sysmon config (e.g., SwiftOnSecurity-style), verify highlighting, snippets, completions, diagnostics, hover, formatting, and settings switching (platform/version/custom schema).

## Error handling

- The scanner is error-tolerant: malformed XML never panics the server; features degrade to "no result" and diagnostics reflect only what can be understood.
- Invalid or missing `customSchemaPath` silently falls back to the built-in schema (matching VS Code behavior), with a note in the LSP trace log.
- Unrecognized settings values fall back to defaults.
- Binary download failure surfaces Zed's standard language-server install error; the README documents the manual fallback of installing `sysmon-lsp` onto `$PATH` (which the glue prefers anyway).

## Out of scope for v1

- Publishing `sysmon-lsp` to package managers (Homebrew, cargo-binstall, etc.).
- Editor integrations other than Zed (the LSP enables them but they're not deliverables).
- Any change to the VS Code extension.
