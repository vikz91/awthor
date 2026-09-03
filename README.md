# Awthor

> A free, open-source, local-first novel writing app.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-4D7C0F?logo=gnu&logoColor=white)](LICENSE)

Awthor is a calm workspace for writing and reading novels in Markdown. Books, chapters,
characters, settings, and reading positions stay in the current browser by default, so no account
is required to write. Writers can explicitly enable private account sync for multi-device access,
remote AI tools, and unlisted publishing.

[![Awthor Read mode showing a novel chapter in the local-first writing workspace](public/screenshots/awthor-read-mode.jpg)](public/screenshots/awthor-read-mode.jpg)

## Highlights

- Unified Read and Write modes with autosave, Focus mode, and continuous or paginated layouts
- On-device proofreading, character dossiers, chapter arcs, live counts, and keyboard controls
- Browser-generated PDF, EPUB 3, and combined Markdown exports
- Portable workspace backups and optional, event-driven multi-device sync
- Local WebMCP tools and an optional OAuth-protected remote MCP endpoint
- Free software licensed under the GNU Affero General Public License v3.0

## Quick start

Run Awthor locally with Docker:

```bash
docker compose up --build
```

Or start the source development server with Bun 1.4+:

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000). The default setup is fully local-only and
does not require an account, API key, or database. See the
[development guide](docs/development.md) for requirements, configuration, scripts, Docker usage,
and architecture notes.

## Documentation

| Guide | What it covers |
| --- | --- |
| [Product guide](docs/product-guide.md) | App screens, writing workflow, exports, Focus mode, tools, shortcuts, and themes |
| [Data, privacy, and sync](docs/data-privacy-sync.md) | Browser storage, backups, migration, optional accounts, cloud sync, remote MCP, and publishing |
| [AI integrations](docs/ai-integrations.md) | Local WebMCP Site Tools, remote MCP boundaries, capabilities, and trust considerations |
| [Development](docs/development.md) | Source and Docker setup, commands, stack, architecture, configuration, and deployment |
| [AI insights BYOK PRD](docs/AI_INSIGHTS_BYOK_PRD.md) | Product requirements for the planned bring-your-own-key AI insights feature |

## Contributing and support

Contributions and focused feature proposals are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md),
follow the [Code of Conduct](CODE_OF_CONDUCT.md), and use
[GitHub Discussions](https://github.com/vikz91/awthor/discussions) for questions. Report security
issues privately as described in [SECURITY.md](SECURITY.md), and never post manuscripts, backups,
credentials, or personal data.

See [SUPPORT.md](SUPPORT.md) for help and [FUNDING.md](FUNDING.md) for ways to support the project.

## License

Awthor is free and open-source software licensed under the
[GNU Affero General Public License v3.0](LICENSE).
