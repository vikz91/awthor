# Contributing to Awthor

Thanks for helping make Awthor better. Awthor is a free, local-first writing app; every contribution should preserve that promise.

## Before you begin

1. Search existing issues and pull requests before opening a new one.
2. For a substantial change, open an issue first and describe the writer problem it solves.
3. Do not include manuscripts, backups, access tokens, account details, or other private data in issues, pull requests, screenshots, logs, or fixtures.
4. Follow the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md).

## Development setup

Requirements: Bun 1.4+ and Node.js 24 for production-build parity.

```bash
bun install
bun dev
```

Before opening a pull request, run:

```bash
bun run format
bun run lint
bun test
node node_modules/next/dist/bin/next build
git diff --check
```

`bun run format` may modify files. Include those formatting changes with your contribution.

## What makes a good contribution

- Keep pull requests focused: one user problem or one coherent maintenance task.
- Explain the behavior change, not only the implementation.
- Add or update focused tests for logic, migrations, security-sensitive behavior, or regressions.
- Use the existing repository boundary, semantic theme tokens, and accessible components.
- Check both Paper and Stone, and consider mobile widths for visible UI changes.
- Update documentation when a feature, privacy boundary, setup step, or public contract changes.

## Pull request expectations

By opening a pull request, you confirm that:

- you wrote the contribution or have the right to submit it under Awthor's AGPL-3.0 license;
- your submission contains no secrets, personal data, or unpublished writing you are not allowed to share;
- you tested the change as described in the pull-request template; and
- you will respond to maintainer questions and update the pull request when needed.

Maintainers may request changes, close inactive pull requests, or decline changes that broaden the product beyond its local-first and minimal-writing-workspace goals. A respectful, well-scoped contribution is always welcome.

## Reporting bugs and requesting features

Use the issue forms. Bug reports need reproducible steps and environment details. Feature requests need the writer problem, not only a proposed interface. Questions and support belong in [GitHub Discussions](https://github.com/vikz91/awthor/discussions), not the issue tracker.

## Security issues

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).

## Publishing a release

Stable releases are automated from semantic-version tags. Update `package.json` to the intended
version, commit and push the verified change to `main`, then tag that commit with the exact matching
version and push the annotated tag:

```bash
git tag -a v0.1.1 -m "Awthor v0.1.1"
git push origin v0.1.1
```

The release workflow checks the tag format and package version, installs frozen dependencies, runs
lint, tests, the production build, and `git diff --check`, then publishes a GitHub Release with
generated notes and the live Awthor URL. Ordinary pushes and merges to `main` continue to run CI
and deploy through Vercel, but do not create a release or invent a version number.
