# Contributing

Contributions to `@sasjs/lint` are very welcome. This repo is a TypeScript library with no SAS dependency - it reads `.sas` files as text - so you can work on every rule, the formatter and the JSON schema with Node alone.

Please fill in the pull request template and make sure your changes are covered by tests.

## Quick start

Node 22 or later (the `engines` field), and no lifecycle scripts:

```bash
git clone https://github.com/sasjs/lint.git
cd lint
npm ci                        # .npmrc sets ignore-scripts=true, so nothing runs on install
git config core.hooksPath ./.git-hooks   # the prepare script is one of those scripts
```

Then:

```bash
npm test           # jest WITH the coverage gate - this is the one CI runs
npm run lint       # prettier --check over src and test
npx tsc --noEmit   # type check
npm run build      # emit ./build, needed by anything that requires the built library
```

`npx jest` alone does not apply the coverage threshold, so a change can look green locally and fail CI. Use `npm test`.

## Where things live

- `src/rules/file/`, `src/rules/line/`, `src/rules/path/` - one module per rule, `<name>.ts` plus `<name>.spec.ts`, each re-exported from its folder's `index.ts`.
- `src/lint/` - `lintText`, `lintFile`, `lintFolder`, `lintProject`, and `shared.ts` (`processText`, `processFile`, `processLine`).
- `src/format/` - `formatText`, `formatFile`, `formatFolder`, `formatProject`, and `shared.ts`.
- `src/types/` - `LintConfig.ts` (the rule registry and defaults), `LintRule.ts` (the File/Line/Path interfaces), `Diagnostic.ts`, `Severity.ts`, `LineEndings.ts`.
- `src/utils/` - shared helpers: `splitText`, `splitLines`, `getHeaderLinesCount`, `parseMacros`, `parseMacroCalls`, `headerMacros`, `mergeLintConfig`, `parseLintOverride`, `sasMacros`.
- `sasjslint-schema.json` and `README.md` - the public contract for every setting.

## Architecture

There are three types of rule:

- File rules - run once against the whole file
- Line rules - run once per line
- Path rules - run against a file path or name

A rule exports an object conforming to the `LintRule` interface: `type`, `name`, `description` and `message` at minimum. File, line and path rules also have `test`, a function returning `Diagnostic[]` for the consuming application to display. Rules that can repair what they find also have `fix`, which takes the original content - a line or the whole file - and returns it transformed. Path rules have no `fix`.

`test` reports positions as `lineNumber`, `startColumnNumber` and `endColumnNumber`. Severity comes from `config.severityLevel[name] || Severity.Warning`, so a rule must read its own name key.

## Adding a rule

Moving the check into an existing rule versus adding a new one is a design call. A rule that must be separately switchable cannot be folded into another, because `severityLevel` is per rule NAME - one name means one opt-out. Check what the neighbouring rule's registration condition is first: a rule that only registers when a key is an explicit non-`off` value drags its whole remit along with any check folded in.

When a new rule is the right answer:

1. Add `src/rules/<type>/X.ts` and `X.spec.ts`.
2. Export it from `src/rules/<type>/index.ts`.
3. Register it in `src/types/LintConfig.ts`, choosing the default posture:
   - `if (json?.X !== false)` pushes a rule that is ON by default;
   - `if (json?.X)` pushes one that is OFF by default.
   A rule whose `fix` must run during autoformat has to be ON, because the fix only runs for rules present in the config.
4. Add the key to the README config block and a `### X` section in alphabetical position, with `Default:` and `Severity:`.
5. Add the schema entries in `sasjslint-schema.json`: the `default` object, the `examples` object, a `properties.X` block, and a `severityLevel.properties.X` entry.
6. Add specs for both the default-on and the default-off path.

There is no "warn but do not fix" state. A rule with a `fix` either has both warning and repairing active, or is absent and does neither. If your `fix` rewrites files, defaulting it ON changes the output of `sasjs lint fix` and format-on-save for every existing user, so say so in the PR and mark the commit accordingly.

## The three documents that must agree

`DefaultLintConfiguration` (`src/utils/getLintConfig.ts`), the fenced config block in `README.md`, and the `default` object in `sasjslint-schema.json` state the same thing, and they drift. Treat them as one artifact: complete the default object first, then mirror it into both documents. `src/utils/getLintConfig.spec.ts` fails if any of the three disagree, and also enumerates the settings the constructor reads, so a setting added to `LintConfig` but not to the defaults is caught. An absent key must mean the documented default - a project with no `.sasjslint` and a project whose file omits the key must get the same rule set.

## Reading a file: one split for line endings

Readers must not split content on the ending CONFIGURED in `lineEndings`. That value says what the project wants, not what the file contains, and the lint path does not normalise - so a `crlf` split over an LF file returns one string holding the whole file, and column lookups then throw. Use `splitLines` (`src/utils/splitLines.ts`), which splits on `\r\n` or `\n` and drops the carriage returns. Writers still join with the configured ending.

The formatter currently survives the mismatch because `lineEndings.fix` runs before the later rules, but that is not a licence for a reader to assume it: `formatFile` lints before it formats.

## Formatter rules

Only file and line rules that carry a `fix` run during formatting, in the order they were pushed onto the config. `hasDoxygenHeader` is pushed first, so with the default config a `fix` may assume a Doxygen header exists - but it must still return the text unchanged when there is none.

A `fix` must be idempotent: format the same file twice and the second pass must change nothing. Formatting a corpus twice and comparing is the quickest way to prove it. A non-idempotent fix shows up as churn and an inflated `fixedDiagnosticsCount`.

Two rules can reconcile the same header from opposite sides - `noUndeclaredMacros` adds used-but-undeclared names and `noUnusedMacros` removes declared-but-unused ones - so a removal helper must keep the `<h4> SAS Macros </h4>` heading when the list empties, or the add side loses its place to write.

## Testing

Most of the code is pure functions, so there is little to mock and no excuse for not testing a rule. When adding a rule, test the positive and negative scenarios in separate cases; when changing one, run the suite to prove nothing else moved.

Two habits catch the failures that plain coverage does not:

- **Mutation-check your assertions.** Revert the behaviour one piece at a time and confirm a test fails. An assertion that passes on the broken code is documenting nothing. Watch for vacuous cases: for example, a "does not throw" test over a mis-split file passes while the mis-split still contains the string being searched for, so the fixture has to be shaped to fail.
- **A negative test must fail for the reason it names.** Assert on the specific message or error, never a bare `toThrow()`.

### Mutation testing

The habit above is automated, because the mutant you think to try is rarely the
one that matters. Stryker rewrites the source in small ways (an operator, a
string, a branch) and runs the tests; a mutant that survives is behaviour no
test asserts.

```bash
npm run mutation:changed     # only the files this branch changed, vs the baseline
MUTATION_FILES=src/utils/parseMacroCalls.ts npm run mutation:changed   # one file
npm run mutation             # whatever stryker.conf.json selects
npm run mutation:watch       # the whole tree; prints a refreshed baseline
```

The gate compares each file with `mutation-baseline.json` and fails when a file
carries MORE surviving mutants than the baseline records, so it asks "did this
branch add an untested behaviour?", not "is the repo perfect yet". A file with no
baseline must reach 80%. `mutation-pr.yml` runs the changed-file gate on every
pull request; `mutation-weekly.yml` runs the whole tree and fails if anything
regressed, which is how the baseline is refreshed (the run prints the new JSON to
paste in).

Two things to know before running it:

- the dev tree needs Node 22.18 or newer: `@stryker-mutator/core` pulls `@babel/*` 8,
  whose `engines` start at 22.18. `package.json` records that in `devEngines` (dev installs
  warn, published installs are unaffected - the tarball carries no devDependencies).


- `jest.stryker.config.js` differs from `jest.config.js` in switching coverage
  off, and in nothing else: a skipped spec records the mutants it covers as
  legitimate survivors, and the weekly refresh writes them into the baseline.
  `isIgnored` therefore derives its path with `path.relative(root, file)` and
  returns false for a path outside the root, and `isIgnored.spec.ts` pins
  `getProjectRoot()` with a jest mock - the `ignore` package rejects an absolute
  or `..`-prefixed path, which is what a sandbox run produced before.
- a run mutates the file(s) in a sandbox under `.stryker-tmp`, and `jest.config.js`
  ignores that directory by a `<rootDir>`-anchored pattern - an unanchored one
  makes Stryker's own dry run collect nothing.

A surviving mutant is either a missing test or an EQUIVALENT mutant (a change
that cannot alter behaviour, such as dropping a check the following regular
expression repeats). Add the spec that fails on it, or say in the PR body why it
is equivalent - do not lower the baseline.

## Regenerating the shipped macro list

The macros SAS ships are language data, owned by `@sasjs/sas-language`. Do not hand-write them here. `npm run generate:macros` reads its `macroStatements` and `macroFunctions` groups and writes `src/utils/sasMacros.generated.ts`, which is committed so the published package carries no runtime dependency. `sasMacros.spec.ts` reads the same data independently and fails when the committed list differs, which is the drift guard. Extending that vocabulary is a PR to `@sasjs/sas-language`.

## Code style

The repo uses `Prettier`. In VS Code, install the Prettier extension and set `editor.formatOnSave` (and `editor.formatOnPaste`) to `true`. Otherwise run `npm run lint:fix` before committing, and `npm run lint` to check.

## Git hooks

The repo ships its own hooks in [`.git-hooks/`](../.git-hooks):

- `pre-commit` - scans staged changes for secrets with gitleaks, and requires the `@nogoo9/gitleaks` devDependency to be installed
- `commit-msg` - verifies the commit message follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) standard

The repo `.npmrc` sets `ignore-scripts=true`, so the `prepare` script that would normally set `core.hooksPath` during `npm i` never runs. After cloning (or if your commits are not being checked), activate the hooks with a one-time command, run from the repo root:

```bash
git config core.hooksPath ./.git-hooks
```

The pre-commit hook runs the gitleaks binary provided by the `@nogoo9/gitleaks` devDependency, so make sure `npm i` has run in the repo root before your first commit.

If you use the [pre-commit](https://pre-commit.com) framework, the repo also ships a [`.pre-commit-config.yaml`](../.pre-commit-config.yaml) that pins the upstream gitleaks hook to an exact release tag. Activate it with `pre-commit install`.

## Commit messages and releases

Merging to `main` runs semantic-release: the commit type decides the version, and a release publishes to npm. Only `feat:`, `fix:` and `perf:` cut a release - a `chore:` or `docs:` PR publishes nothing, which is correct rather than a failure.

For a squash merge the PR TITLE drives the version, so keep it conventional. Judge the type by what users see: a new diagnostic message, or a formatter that now rewrites files it used to leave alone, is new behaviour and belongs in `feat:` even when it also fixes a defect. Warnings do not move the exit code of `sasjs lint` - only `noEncodedPasswords` ships as an error - so a new warning does not break CI for consumers; a rewritten file might surprise them, and the release notes are where to say so.

Mark a genuinely breaking change with `BREAKING CHANGE:` in the commit body, and name the config key that restores the old behaviour.

The `version` field in `package.json` is a placeholder (`0.0.0-semantically-released`), not a record of the release. semantic-release computes the version from the tags and commits, and `prepareCmd` writes it into the workspace before the tarball is packed, so the published package and its tag are correct whatever the file says. Do not bump it in a PR, and do not read it to learn what is published - `npm view @sasjs/lint version` and the git tags are the answers.

## The audit gate

`build.yml` runs `npm audit --omit=dev --audit-level=low`, scoped to production dependencies because the dev tree carries one advisory nothing here can fix (`sprintf-js` through the jest transform chain, with no patched release). A weekly `audit-watch.yml` runs the FULL audit and fails when that exemption stops matching reality - a new dev-tree advisory, the exempted one disappearing, or a watched package publishing a newer version.

Do not add a dev-tree advisory to the exemption to get a build green. Prefer removing the dependency; if an exemption is genuinely unavoidable, it needs the reachability argument written down and a guard that closes it, not an allowlist.

## CI is the enforcement point

The [build workflow](./workflows/build.yml) scans the full history for secrets with gitleaks, runs `npm audit`, checks code style and runs the tests. The local hooks are convenience - CI is what a red finding must fail.

## The release toolchain lives in the workflow

semantic-release is not a project dependency. Every `@semantic-release` plugin declares a `semantic-release` peer, so adding one to `devDependencies` makes npm auto-install semantic-release along with the `npm` package it bundles - and that bundled npm carries advisories this repo cannot fix.

Instead, [publish.yml](./workflows/publish.yml) installs semantic-release, `@semantic-release/exec` and `@semantic-release/git` on the fly, pinned to exact versions. When you add or remove an entry in `release.plugins` (package.json), update that command to match.

## What to work on

The formatter applies these fixes today: `%mend` macro names, a Doxygen header template, adding undeclared macros to the `<h4> SAS Macros </h4>` section, removing unused macros from it, trailing spaces, and line endings (including a missing final newline) when [`lineEndings`](../README.md#lineendings) is configured.

Fixes not yet implemented, roughly in order of usefulness:

- Change tabs to spaces
- Remove gremlin characters
- Convert single asterisk comments to block comments

Harder, and still under investigation: automatic indentation and code layout.

Rules without a fix are equally welcome - a rule that reports something real is worth more than one that silently repairs it wrong. Open an issue describing the SAS construct and what a false positive would look like before you build it, so the heuristic can be argued about cheaply.
