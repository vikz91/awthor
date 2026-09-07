<p align="center">
  <a href="https://awthor.abhishekdeb.com">
    <img src="public/github-social-preview.png" alt="Awthor — a quieter place to write your novel" width="100%">
  </a>
</p>

<h1 align="center">Awthor</h1>

<p align="center">
  <strong>A calm, local-first studio for writing and reading novels in Markdown.</strong>
  <br>
  No account. No lock-in. Your words stay close.
</p>

<p align="center">
  <a href="https://awthor.abhishekdeb.com"><strong>Open Awthor ↗</strong></a>
  ·
  <a href="#quick-start">Run it locally</a>
  ·
  <a href="docs/product-guide.md">Product guide</a>
  ·
  <a href="#contributing">Contribute</a>
</p>

<p align="center">
  <a href="https://github.com/vikz91/awthor/actions/workflows/ci.yml"><img src="https://github.com/vikz91/awthor/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.3.3-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16.3.3"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.2.8-149ECA?logo=react&logoColor=white" alt="React 19.2.8"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4"></a>
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Bun-1.4.0-000000?logo=bun&logoColor=white" alt="Bun 1.4.0"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-24.x-5FA04E?logo=nodedotjs&logoColor=white" alt="Node.js 24"></a>
  <a href="https://biomejs.dev/"><img src="https://img.shields.io/badge/Biome-2.4.2-60A5FA?logo=biome&logoColor=white" alt="Biome 2.4.2"></a>
  <br>
  <a href="https://writewithharper.com/"><img src="https://img.shields.io/badge/Proofreading-Harper.js-D97706" alt="Harper.js proofreading"></a>
  <a href="https://clerk.com/"><img src="https://img.shields.io/badge/Optional_Accounts-Clerk-6C47FF?logo=clerk&logoColor=white" alt="Optional Clerk accounts"></a>
  <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/Optional_Sync-MongoDB-47A248?logo=mongodb&logoColor=white" alt="Optional MongoDB sync"></a>
  <a href="https://learn.chatgpt.com/docs/webmcp"><img src="https://img.shields.io/badge/WebMCP-Site_Tools-C2412D" alt="WebMCP Site Tools"></a>
  <a href="https://github.github.com/gfm/"><img src="https://img.shields.io/badge/Editor-GFM-000000?logo=markdown&logoColor=white" alt="GitHub Flavored Markdown editor"></a>
  <a href="https://www.w3.org/publishing/epub3/"><img src="https://img.shields.io/badge/Export-EPUB_3-4A8A08" alt="EPUB 3 export"></a>
  <br>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white" alt="Deployed with Vercel"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL_v3-4D7C0F?logo=gnu&logoColor=white" alt="AGPL v3 license"></a>
  <img src="https://img.shields.io/badge/Manuscript_Storage-Your_Device-5F6B4E" alt="Manuscripts stored on your device">
</p>

> [!NOTE]
> Awthor's default workspace is fully local-only. Books, chapters, characters, settings, and
> reading positions live in this browser. Sync is optional and begins only when you ask for it.

## A writing room, not a dashboard

Awthor keeps the machinery out of the way while you draft. Read and write the same chapter in one
workspace, move into Focus mode when the page needs your full attention, and take the entire book
with you whenever you want.

|  |  |
| --- | --- |
| **01 · WRITE**<br><br>Markdown editing with local autosave<br>Seamless reading, paginated previews, and notebook drafting<br>Read, Write, and distraction-free Focus modes | **02 · SHAPE**<br><br>On-device spelling, grammar, and style feedback<br>Character dossiers and chapter-arc planning<br>Live word counts and keyboard-first controls |
| **03 · FINISH**<br><br>Browser-generated PDF, EPUB 3, and Markdown<br>Complete-book exports—not chapter fragments<br>Unlisted, read-only publishing when enabled | **04 · STAY IN CONTROL**<br><br>Portable full-workspace backups<br>Optional event-driven multi-device sync<br>Local WebMCP and OAuth-protected remote MCP |

## Main features

- **Local-first book library:** Create, search, organize, and delete books without an account. The
  default workspace stays in this browser's IndexedDB.
- **One Read/Write workspace:** Move between rendered GitHub Flavored Markdown and the editable
  source without changing chapters or routes.
- **Three ways to meet the page:** Read seamlessly or as paginated pages; draft on the classic
  canvas or a per-book ruled Notebook; use Focus mode when only the manuscript should remain.
- **On-device proofreading:** Harper checks spelling, grammar, and style in a browser worker, with
  an English dialect and custom vocabulary saved for each book.
- **Story planning beside the prose:** Maintain character dossiers and chapter arcs without turning
  the writing view into a project-management dashboard.
- **Complete-book output:** Copy combined Markdown or download browser-generated PDF and EPUB 3
  files without uploading the manuscript for conversion.
- **Portable backups:** Export and restore the local workspace as a `.awthor.zip` archive, with
  backward-compatible import for supported JSON backups.
- **Optional connected features:** Explicitly opt into private multi-device sync, unlisted
  publishing, page-local WebMCP, or OAuth-protected remote MCP when those capabilities are useful.
- **Keyboard- and theme-aware interface:** Use visible shortcuts, accessible controls, and the
  semantic Paper or Stone theme across mobile and desktop layouts.

## Your manuscript has a simple path

```text
you write
   └── browser workspace
       ├── autosave ───────→ IndexedDB on this device
       ├── proofread ──────→ Harper, running on this device
       ├── export ─────────→ PDF · EPUB 3 · Markdown
       ├── back up ────────→ portable .awthor.zip archive
       └── opt in ─────────→ private sync · unlisted publishing · remote MCP
```

The local path needs no account, API key, or database. Creating an account still does not upload a
workspace; the first **Sync** is the explicit consent boundary. Read the
[data, privacy, and sync guide](docs/data-privacy-sync.md) for the full model and its remote-image
caveats.

## Why Awthor stands apart

Awthor is not trying to win by having the largest feature catalog. It is the strongest fit for a
writer whose non-negotiables are **no purchase, auditable source, no required account, a
device-local default, and portable manuscript formats**. Competitor details below link to each
vendor's own product pages.

| Tool | Strongest fit | Product and data model | Where Awthor differs |
| --- | --- | --- | --- |
| **Awthor** | Private, focused novel drafting with portable formats | Free AGPL software; browser-local by default; cloud features are optional | Combines account-free local writing, on-device proofreading, open Markdown, portable backups, and self-hosting |
| [Scrivener](https://www.literatureandlatte.com/scrivener/overview) | Deep research, outlining, snapshots, and mature compile options | Proprietary desktop licences; local projects with optional Dropbox or device transfer for cross-platform work | Awthor removes the purchase and platform-licence boundary and keeps the complete implementation open |
| [Atticus](https://www.atticus.io/) | Polished print and ebook formatting for publication | Proprietary one-time purchase; automatic cloud saving with an offline-capable desktop app | Awthor prioritizes free local-first drafting and open Markdown; Atticus prioritizes production-ready typesetting |
| [Reedsy Studio](https://reedsy.com/studio/write-a-book/) | Free online writing with automatic PDF and EPUB typesetting | Free core with paid add-ons; an account and online browser access are required | Awthor requires no account for local writing and keeps the default manuscript outside a hosted service |
| [LivingWriter](https://livingwriter.com/pricing) | Cloud collaboration, templates, goals, and integrated AI features | Cloud-hosted service with a limited free tier and paid plans | Awthor has no mandatory cloud or subscription layer and does not put prose generation in the ordinary writing loop |

That makes Awthor a particularly good choice for privacy-conscious writers, open-source users,
Markdown authors, self-hosters, and anyone who wants the cloud to remain a choice. Writers who need
advanced print typesetting, real-time collaboration, or a large research database may prefer one
of the specialized alternatives above.

## Inside the workspace

[![Awthor Read mode showing a novel chapter in the local-first writing workspace](public/screenshots/awthor-read-mode.jpg)](public/screenshots/awthor-read-mode.jpg)

<details>
<summary><strong>Explore more of Awthor</strong></summary>
<br>
<table>
  <tr>
    <td width="50%">
      <img src="public/screenshots/awthor-library-current.jpg" alt="Awthor book library">
      <br><sub><strong>Your library</strong> — search, browse, and manage books by cover.</sub>
    </td>
    <td width="50%">
      <img src="public/screenshots/awthor-writing.jpg" alt="Awthor Markdown writing mode">
      <br><sub><strong>Writing mode</strong> — a quiet Markdown canvas with local autosave.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="public/screenshots/awthor-chapter-chooser.jpg" alt="Awthor chapter chooser">
      <br><sub><strong>Chapter navigation</strong> — keep the manuscript ordered and within reach.</sub>
    </td>
    <td width="50%">
      <img src="public/screenshots/awthor-spell-check.jpg" alt="Awthor on-device proofreading">
      <br><sub><strong>Local proofreading</strong> — review language without sending the manuscript away.</sub>
    </td>
  </tr>
</table>
</details>

## Quick start

### With Docker

The shortest route to a fully local Awthor instance:

```bash
git clone https://github.com/vikz91/awthor.git
cd awthor
docker compose up --build
```

### From source

Install [Bun 1.4+](https://bun.sh/docs/installation) and [Node.js 24](https://nodejs.org/), then:

```bash
git clone https://github.com/vikz91/awthor.git
cd awthor
bun install
bun dev
```

Open [localhost:3000](http://localhost:3000). To load the bundled demo manuscript, visit
`/test` and choose **Seed or replace**.

For environment variables, Docker details, architecture, and the full command reference, continue
to the [development guide](docs/development.md).

## Find what you need

| I want to… | Start here |
| --- | --- |
| Learn the writing workflow, tools, shortcuts, and themes | [Product guide](docs/product-guide.md) |
| Understand what stays local and when data can leave the browser | [Data, privacy, and sync](docs/data-privacy-sync.md) |
| Connect Awthor to browser-local or remote AI tools | [AI integrations](docs/ai-integrations.md) |
| Configure and validate the OAuth-protected MCP server | [Remote MCP](docs/remote-mcp.md) |
| Set up, test, understand, or deploy the codebase | [Development guide](docs/development.md) |
| Explore the planned bring-your-own-key AI insights feature | [AI insights BYOK PRD](docs/AI_INSIGHTS_BYOK_PRD.md) |
| Get help or report a problem safely | [Support](SUPPORT.md) · [Security](SECURITY.md) |

## Built deliberately

Awthor uses Next.js 16, React 19, TypeScript, Tailwind CSS, IndexedDB, and Bun. Product data stays
behind a repository boundary, exports are assembled in the browser, and the Paper and Stone themes
share accessible semantic tokens. The [architecture overview](docs/development.md#architecture)
maps the codebase's routes, data boundaries, integrations, and major components.

## Contributing

Focused contributions are welcome—especially changes that make the writing experience calmer,
more portable, or more trustworthy. Before opening a pull request:

```bash
bun run lint
bun test
node node_modules/next/dist/bin/next build
git diff --check
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Use
[GitHub Discussions](https://github.com/vikz91/awthor/discussions) for questions and early ideas.
Never post manuscripts, backups, credentials, or personal data in an issue. If you would rather
support the work directly, see [FUNDING.md](FUNDING.md).

## License

Awthor is free software released under the
[GNU Affero General Public License v3.0](LICENSE).

<p align="center"><sub>Made for long stories and quiet attention.</sub></p>
