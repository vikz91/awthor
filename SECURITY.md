# Security Policy

## Supported versions

Security fixes are applied to the latest version on the `main` branch.

## Reporting a vulnerability

Please do **not** create a public issue for a suspected vulnerability.

Use [GitHub's private vulnerability reporting](https://github.com/vikz91/awthor/security/advisories/new) instead. Include a clear impact description, affected route/component/API/dependency, safe reproduction steps or proof of concept, and any suggested mitigation.

Do not include real manuscript text, backups, access tokens, Clerk credentials, MongoDB connection strings, or other secrets. Use redacted or synthetic data only.

The maintainers will acknowledge a valid report as soon as practical, investigate privately, and coordinate a fix before public disclosure when possible.

## Scope reminders

Awthor has local browser storage, optional Clerk/MongoDB sync, remote MCP, and unlisted publishing. Reports involving data access, cross-account authorization, publication exposure, OAuth, import/export parsing, or client-side data loss are especially valuable.
