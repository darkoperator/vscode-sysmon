# Small First Extension Improvements Design

Date: 2026-06-27

## Goal

Improve the Sysmon VS Code extension with a small, low-risk first milestone before starting the larger schema-driven generator work.

This milestone focuses on extension activation, language association, completion quality, and baseline tests. It does not change the snippet architecture or introduce schema generation.

## Scope

In scope:

- Activate the extension only for the Sysmon language.
- Correct the Sysmon file extension contribution to use `.smc`.
- Stop automatically claiming all `.xml` files as Sysmon files.
- Expand `condition=""` completions with the current Sysmon condition operators.
- Keep `onmatch=""` completions as `include` and `exclude`.
- Refactor completion values into testable constants/helpers.
- Replace the generated sample test with focused tests for completion behavior.
- Update README guidance for `.smc` files and manual language selection for XML files.

Out of scope:

- Schema-driven snippet generation.
- Full XML/Sysmon diagnostics.
- Language server protocol implementation.
- Tooling modernization beyond what is needed for these tests.
- Refreshing screenshots or GIFs.

## Files

Expected files to edit:

- `package.json`
- `src/extension.ts`
- `src/test/suite/extension.test.ts`
- `README.md`
- `CHANGELOG.md`, only if release-note tracking is desired for this change

No new runtime dependencies are expected.

## Package Metadata Changes

`package.json` should change activation from global startup to language-scoped activation:

```json
"activationEvents": [
  "onLanguage:smc"
]
```

The contributed language extension should use `.smc` instead of `smc`.

The `xml` extension should be removed from the Sysmon language contribution so generic XML files are not automatically treated as Sysmon files. Users can still manually switch XML Sysmon configuration files to the Sysmon language mode through VS Code.

## Completion Behavior

`src/extension.ts` currently registers two completion providers inline:

- `condition=""` values
- `onmatch=""` values

The implementation should keep that behavior but make the lists explicit and testable.

Condition completions should include at least:

- `is`
- `is not`
- `is any`
- `contains`
- `contains any`
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

`onmatch` completions remain:

- `include`
- `exclude`

Completions should only appear when the text before the cursor ends with the matching attribute prefix:

- `condition="`
- `onmatch="`

They should return no completions in unrelated attributes or normal text.

## README Updates

The README should explain:

- `.smc` files are associated with the Sysmon language automatically.
- Existing `.xml` Sysmon config files can be switched manually to the Sysmon language mode.
- Generic XML files are no longer automatically associated with Sysmon.

Small typo fixes in touched README lines are acceptable, but broad documentation rewrites belong to later milestones.

## Testing

Automated tests should cover:

- The condition completion list contains the expected values.
- The onmatch completion list contains `include` and `exclude`.
- Completion logic returns condition values only after `condition="`.
- Completion logic returns onmatch values only after `onmatch="`.
- Completion logic returns no values outside those contexts.

Verification commands:

```bash
npm run compile
npm test
```

Manual verification:

1. Open a `.smc` file and confirm the Sysmon language is selected automatically.
2. Open a generic `.xml` file and confirm it is not automatically treated as Sysmon.
3. Manually switch an XML Sysmon config file to Sysmon language mode.
4. Confirm snippets still appear for Sysmon language files.
5. Confirm completions appear inside `condition=""` and `onmatch=""`.

## Risks

Removing automatic `.xml` association is a user-visible behavior change. It avoids hijacking generic XML files, but users who relied on automatic XML association will need to manually select the Sysmon language mode or use `.smc`.

The condition operator list may still drift as Sysmon evolves. The later schema-driven milestone should make these values generated or derived from schema data.

## Later Milestones

After this milestone, the next recommended work is:

1. Add a schema data model and generator.
2. Generate snippets and language configuration from schema data.
3. Add context-aware completions for event tags and field tags.
4. Add diagnostics for invalid events, fields, and conditions.
5. Modernize VS Code extension tooling and linting.
