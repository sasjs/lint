# CONTRIBUTING

Contributions are very welcome! Feel free to raise an issue or start a discussion, for help in getting started.

## Git hooks

The repo ships its own git hooks in [`.git-hooks/`](./.git-hooks):

- `pre-commit` - scans staged changes for secrets with gitleaks, and requires the `@nogoo9/gitleaks` devDependency to be installed
- `commit-msg` - verifies the commit message follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) standard

The repo `.npmrc` sets `ignore-scripts=true`, so the `prepare` script that would normally set `core.hooksPath` during `npm i` never runs. After cloning (or if your commits are not being checked), activate the hooks with a one-time command, run from the repo root:

```bash
git config core.hooksPath ./.git-hooks
```

The pre-commit hook runs the gitleaks binary provided by the `@nogoo9/gitleaks` devDependency, so make sure `npm i` has run in the repo root before your first commit.

## CI is the enforcement point

The [build workflow](./.github/workflows/build.yml) scans the full history for secrets with gitleaks, audits dependencies with the [audit script](./scripts/audit.mjs), checks code style and runs the tests. The local hooks are convenience - CI is what a red finding must fail.
