# Awthor

> A free, open-source, local-first novel writing app.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Bun](https://img.shields.io/badge/Bun-1.4.0-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Biome](https://img.shields.io/badge/Biome-2.4.2-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev/)
[![Harper](https://img.shields.io/badge/Proofreading-Harper.js-D97706)](https://writewithharper.com/)
[![Clerk](https://img.shields.io/badge/Optional_Accounts-Clerk-6C47FF?logo=clerk&logoColor=white)](https://clerk.com/)
[![MongoDB](https://img.shields.io/badge/Optional_Sync-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![WebMCP](https://img.shields.io/badge/WebMCP-Site_Tools-C2412D)](https://learn.chatgpt.com/docs/webmcp)
[![Markdown](https://img.shields.io/badge/Editor-GFM-000000?logo=markdown&logoColor=white)](https://github.github.com/gfm/)
[![EPUB](https://img.shields.io/badge/Export-EPUB_3-4A8A08)](https://www.w3.org/publishing/epub3/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-4D7C0F?logo=gnu&logoColor=white)](LICENSE)
![Storage](https://img.shields.io/badge/Manuscript_Storage-Your_Device-5F6B4E)

Awthor is a deliberately minimal writing workspace. Books, chapters, characters, settings, and
reading positions stay in the current browser by default. IndexedDB stores book-domain records
while localStorage is limited to small bootstrap and global-preference values. An authenticated
writer can explicitly choose Sync to copy that workspace to their private MongoDB account for
multi-device access or remote MCP use.

Awthor is local-first by default: no account is required to write. Signing in does not upload any
books, profile details, settings, or manuscript content. Selecting **Sync** is the explicit action
that copies the full writing workspace to the signed-in account for use on another device.

After that first manual sync, Awthor keeps the workspace current in the background after a real
local change, when the browser reconnects, or when a previously synced workspace is reopened.
Per-record SHA-256 fingerprints mean ordinary runs upload only changed records, not every chapter.
It does not poll or continuously push data. Sync is intentionally event-driven and remains optional.

There is no pricing tier. Awthor is completely free and distributed under the
[GNU Affero General Public License v3.0](LICENSE).

## Highlights

- **One calm workspace** — read and write the same Markdown chapter without a route change,
  with seamless or paginated document layouts and a distraction-free Focus mode.
- **Local writing tools** — on-device Harper proofreading, character dossiers, chapter arcs,
  selection formatting, live counts, and keyboard-first controls.
- **Portable work** — export a complete book as PDF, EPUB 3, or combined Markdown; export and
  import full local-workspace backups whenever you need them.
- **Optional multi-device sync** — Clerk identity and MongoDB sync are opt-in. The first Sync is
  explicit; later sync runs only after meaningful events and transfers changed records only.
- **Two MCP boundaries** — browser-scoped WebMCP works with the local device; an optional,
  OAuth-protected remote MCP works with the writer's already-synced cloud workspace.
- **Unlisted sharing** — publish a separate, read-only snapshot of a synced book at an unlisted
  URL, then republish or turn it off without changing the private manuscript.

## Four private app screens

| Route | Purpose |
| --- | --- |
| `/` | Minimal landing page with product, privacy, and open-source positioning |
| `/books` | Searchable, cover-first local library with book and author settings dialogs |
| `/books/[bookId]` | Unified Markdown reader/writer with chapters and in-place writing tools |
| `/test` | Local repository diagnostics for seeding, clearing, importing, and exporting data |

`/stories/[publicId]` is intentionally outside the private app: it is the read-only, unlisted
public snapshot created only when a signed-in writer publishes a synced book.

Retired URLs remain compatible through temporary redirects:

- `/onboarding` → `/books?settings=open`
- `/books/:bookId/chapters` → `/books/:bookId?chooser=chapters`
- `/books/:bookId/characters` → `/books/:bookId?tool=characters`
- `/books/:bookId/plots` → `/books/:bookId?tool=chapter-arc`
- `/books/:bookId/notes` → `/books/:bookId`

## Writing workspace

Books always open in Read mode at the last chapter and saved reading position. Write mode edits the
same chapter as Markdown source and autosaves through `AwthorRepository`; switching modes does not
navigate or load another page. Read mode supports GitHub Flavored Markdown, including headings,
lists, task lists, tables, links, quotes, code, strikethrough, and remote images. Raw HTML is not
rendered. The leading `# Heading` is the editable chapter title and stays synchronized with chapter
navigation and metadata. Longer chapters receive a subtle desktop progress rail with clickable
viewport-sized reading positions; the manuscript remains a continuous document and reduced-motion
preferences are respected.

In Write mode, selecting text opens a compact contextual formatter above the selection. Bold,
italic, strikethrough, and line-aware quote actions edit the Markdown source directly, preserve the
selection, and follow the normal local autosave path. No permanent formatting toolbar is shown.

The top-bar Export menu works on the complete book. **Copy Markdown** combines the title matter,
optional preface, and every chapter into one clipboard-ready Markdown manuscript. **Export as PDF**
generates and downloads a paginated PDF directly in the browser, including on mobile—no desktop
print dialog required. **Download EPUB** creates a cover-free, reflowable EPUB 3 with a table of
contents, title page, preface, and ordered chapters. All export content is assembled entirely in
the browser and is never uploaded.

The Focus icon beside Read/Write enters a temporary distraction-free workspace. Awthor requests
browser fullscreen when available and falls back to an in-page full-viewport layout when it is not;
both variants hide the top bar, writing tools, progress rail, page scrollbar, and chapter controls
while preserving the current mode, manuscript position, and editor caret. A brief notice explains
that `Escape` exits Focus mode. The subtle bottom exit control then hides completely—with no cue—and
returns only when the pointer approaches the bottom edge or a touch user taps the bottom zone. Focus
mode is never persisted.

The existing floating toolbar contains four in-place controls:

- **Spell check** — local spelling, grammar, and style feedback from Harper.js, with a per-book
  English dialect and custom vocabulary for names and transliterated words
- **Characters** — searchable character list and editable dossier
- **Chapter arc** — per-chapter stage, tension, goal, conflict, and outcome
- **Counts** — toggles a live word and character count for the current chapter

On desktop the toolbar reveals near the bottom edge, remains available while focused or a tool is
open, and automatically collapses to a visible Tools cue. Moving near the bottom edge, clicking the
cue, or using the keyboard shortcut reveals it again. Touch users receive a persistent compact
control above the safe area. Reduced-motion preferences are respected.

The workspace also supports **Focus mode** for distraction-free reading and writing, plus a
document-layout control for a continuous Google Docs-style canvas or paginated pages. Both
preferences stay on-device and preserve the current chapter, scroll position, and editor caret
while you switch.

Keyboard shortcuts:

| Shortcut | Action |
| --- | --- |
| `Alt/Option + W` | Enter Write mode |
| `Alt/Option + R` | Return to Read mode |
| `Alt/Option + T` | Reveal and focus the writing tools |
| Hold `Alt/Option` | Show numbered toolbar shortcuts |
| `Alt/Option + 1–4` | Activate Spell check, Characters, Chapter arc, or Counts |
| `Ctrl/Cmd + B` | Bold the current text selection |
| `Ctrl/Cmd + I` | Italicize the current text selection |
| `Ctrl/Cmd + S` | Save the current manuscript immediately |
| `Escape` | Exit Focus mode first; otherwise close the active overlay or return to Read |

Every shortcut has a visible control.

## Local-first data and privacy

`AwthorRepository` is the only product data boundary; pages and components never access browser
storage directly. Storage schema v3 keeps each book, chapter, and character as an IndexedDB record;
book-scoped reading and proofreading settings live there as well. Author details, global editor
preferences, and the Paper/Stone bootstrap stay in localStorage. `/test` exports those logical
stores together as an unencrypted `.awthor.zip` archive; supported v1 and v2 JSON backups remain
importable for backwards compatibility.

A safe migration preserves supported v1/v2 books, chapters, characters, profile, theme, and
settings, and deletes the large localStorage collections only after IndexedDB commits successfully.
Legacy Notes and Plot records are intentionally discarded. If migration fails, the previous
browser records remain available and the interface offers Retry.

Harper proofreading loads only when requested and runs inside the browser. Author settings define
the default American, British, Australian, Canadian, or Indian English dialect; books inherit that
choice until given a book-specific override. Each book also keeps a local custom dictionary for
names, invented terms, and Bengali transliterations. Manuscript, profile, and dictionary text are
never sent to Harper or Awthor servers.

Remote cover and Markdown image URLs are optional. Loading one contacts that image host, so the host
can receive normal request metadata such as the visitor's IP address even though the manuscript and
profile remain on-device. Images are protocol-restricted, lazy-loaded, responsive, and requested
without a referrer. Character dossiers also use deterministic default portraits from
`i.pravatar.cc` until the author supplies another image URL, so opening Characters contacts that
host under the same rules.

Because data belongs to one browser origin, export backups regularly before clearing site data,
changing browsers, or moving devices.

### Optional accounts and sync

Awthor uses [Clerk](https://clerk.com/) for the optional account foundation. It supports email
verification codes only; passwords and social providers are intentionally not enabled. Creating an
account is voluntary and enables multi-device sync. It does not connect an account email to the
separate author-profile email. Sign-in alone changes nothing in browser storage; the first explicit
Sync merges this device with the account workspace.

To enable account-backed sync in a deployment, configure Clerk and MongoDB in the deployment
environment. When the account or database configuration is absent, Awthor remains fully functional
and local-only.

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
MONGODB_URI=mongodb+srv://...
MONGODB_DB=awthor
```

In the Clerk dashboard, keep only **Email verification code** enabled. MongoDB records are scoped by
Clerk's immutable user ID. Sync chooses the newest edit for each matching record, using device ID as
a deterministic tie-breaker, so simultaneous edits to the same item may replace the older copy.

The first click on **Sync** is deliberate consent to upload the current full workspace. Thereafter,
Awthor schedules background sync only for a meaningful local mutation, browser reconnect/focus, or
one refresh when reopening an already-synced workspace—never on a timer. The visible Sync control
always provides the current status and last successful sync time, and can be used to retry. Each
record has a SHA-256 content fingerprint, so unchanged chapters are not uploaded again. Sync pulls
cloud changes before pushing local work, and a delayed or empty device cannot turn absent local
records into deletions; deletions are sent only from explicit local delete events.

### Private remote MCP and unlisted stories

When Clerk and MongoDB are configured, Awthor also exposes an authenticated remote MCP endpoint at
`/api/mcp`. It reads and writes only the workspace already synced to the authenticated Clerk user;
it cannot access a browser's IndexedDB directly. Remote tools include books, chapters, characters,
chapter arcs, author/workspace settings, portable export/import, and publishing controls. Requests
or results containing Markdown, character dossiers, or full backups are sent to the connected MCP
client, so connect only an AI client you trust.

Remote MCP authorization uses Clerk OAuth scopes: `awthor.read`, `awthor.write`, and
`awthor.publish`. ChatGPT/custom-MCP availability depends on the user plan and workspace having
custom MCP apps enabled; the endpoint remains compatible with other standards-based MCP clients.
OAuth consent is the write authorization boundary—no extra confirmation flags are required by the
server, though an MCP client may still ask for approval before a tool call.

`awthor_publish_book` creates or refreshes an unlisted public reader URL at `/stories/[publicId]`.
That URL is not indexed or listed, but anyone who has it can read the published snapshot.
Republishing refreshes the snapshot at the same URL; ordinary private edits do not alter it.
`awthor_unpublish_book` disables the link without deleting the private synced book.

Signed-in writers can also publish from an open book in Awthor. Publishing explicitly syncs that
book, then writes the same unlisted, read-only snapshot to the separate `publishedStories`
collection. It does not expose the live private book. The public page shows the selected cover,
book and series metadata, author name, and author email from the writer's local profile. It offers
word count, an estimated reading time, the same chapter-position rail used by the private reader,
seamless/page layouts, and full screen. Writers can republish at the stable link or turn public
access off at any time.

#### Remote MCP setup

Remote MCP is optional and requires the existing Clerk and MongoDB sync configuration, plus a
Clerk OAuth application/resource configured for the deployed `/api/mcp` URL. Give the OAuth client
the `awthor.read`, `awthor.write`, and `awthor.publish` scopes, then set
`CLERK_OAUTH_AUTHORIZATION_SERVER_URL` to Clerk's OAuth issuer. Set
`MCP_ALLOWED_ORIGINS` only for additional browser-based MCP clients; native MCP clients use the
OAuth Bearer flow. Deployments without this configuration keep remote MCP disabled while local
writing, Sync, and page-local WebMCP continue to work.

## WebMCP Site Tools

Awthor exposes a deliberately narrow set of local [WebMCP Site
Tools](https://learn.chatgpt.com/docs/webmcp) when it is opened in a compatible top-level AI
browser. WebMCP is separate from the authenticated remote MCP server: page tools execute inside the
open page and reuse `AwthorRepository` against that browser's IndexedDB data. They need no account,
API key, or cloud workspace. Ordinary browsers feature-detect the API and continue without
registering anything.

### Using Awthor with ChatGPT

Use **ChatGPT Work** or **Codex** in the latest ChatGPT desktop app—not ordinary Chat mode. Select
GPT-5.6 Sol or Terra, enable **Site tools** under **Settings → Browser → Permissions**, and open
Awthor in the built-in browser. Keep the page open while working: choose **Site tools** in the
address bar to inspect the available actions. The WebMCP host may apply its own safety review before
each tool invocation.

For local development, run `bun dev` and open `http://localhost:3000` in that same built-in
browser; a public deployment or tunnel is not required. Browser storage is intentionally scoped to
the current origin and browser profile, so local-development data, deployed-site data, and regular
browser data are separate. Export and import a backup when moving between them.

WebMCP is page-scoped browser integration, not a direct MCP connection. Regular ChatGPT on the web
or mobile cannot invoke these site tools, and neither ChatGPT Work nor Codex can use them after the
Awthor page is closed or navigated away. For page-independent, account-backed workflows, use the
authenticated remote MCP endpoint instead.

The registered tools can:

- list local books, inspect a book's ordered chapter metadata, and read a specifically requested
  chapter's Markdown source
- create a book with optional author, series, and remote cover metadata
- add a chapter and update an existing book or Markdown chapter
- download a complete unencrypted JSON backup or import one after explicit replacement confirmation
- go back, go home, open the library, or visit a validated local book and chapter
- move to the previous or next chapter, open the chapter list, or scroll the open manuscript or
  chapter-list dialog

Every book/chapter route is built from repository-validated immutable IDs; no tool accepts an
arbitrary URL. An open draft is flushed through the existing autosave path before data changes or
navigation, and mounted library/workspace screens refresh after an agent-side mutation. Export
returns only counts and download metadata to the assistant—not manuscript text. Import necessarily
passes the supplied backup text through the tool call, so use it only in a trusted AI session.
`awthor_get_chapter` is the explicit exception: it returns the requested chapter's Markdown source
to the assistant, so it is available only when the AI host invokes that named tool.

This first version intentionally has no delete, character, proofreading, arbitrary navigation, or
general storage tool. WebMCP support and availability depend on the browser or AI host implementing
the evolving API. It remains page-scoped and local-only; it does not use the optional cloud-sync service.

## Themes

Awthor supports two token-driven themes:

- **Paper** — warm, bright paper for drafting and reading
- **Stone** — a dark paper theme for relaxed low-light reading

Components use semantic CSS tokens for surfaces, text, borders, focus, accent, and destructive
states so both themes retain the same layout and accessible interaction states.

## Tech stack

| Area | Technology | Use |
| --- | --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) App Router | Routes, metadata, redirects, server/client boundaries, and builds |
| UI runtime | [React 19](https://react.dev/) | Component rendering and client workspace state |
| Language | [TypeScript 5](https://www.typescriptlang.org/) | Strict application, repository, and service contracts |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) | Responsive utilities and semantic design tokens |
| Components | [shadcn](https://ui.shadcn.com/) + [Base UI](https://base-ui.com/) | Accessible, locally owned primitives and drawers/dialogs |
| Markdown | [`react-markdown`](https://github.com/remarkjs/react-markdown) + [`remark-gfm`](https://github.com/remarkjs/remark-gfm) | Safe Markdown and GFM rendering without raw HTML |
| PDF export | [`@react-pdf/renderer`](https://react-pdf.org/) + Noto Serif Bengali | Client-generated, downloadable paginated PDFs with Bengali text support |
| EPUB export | [`fflate`](https://github.com/101arrowz/fflate) | Client-generated, reflowable EPUB 3 archives with a navigation document |
| Proofreading | [Harper.js](https://writewithharper.com/) | Lazy, worker-backed, on-device writing feedback |
| Optional accounts | [Clerk](https://clerk.com/) | Email-code identity and opt-in sync ownership |
| Sync storage | [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/) | Server-only, account-scoped multi-device workspace records |
| AI browser tools | [WebMCP Site Tools](https://learn.chatgpt.com/docs/webmcp) | Feature-detected local book, chapter, backup, navigation, and scroll actions |
| Remote AI tools | [Model Context Protocol](https://modelcontextprotocol.io/) | Clerk OAuth-protected cloud workspace, publishing, and full authoring tools |
| Validation | [Zod 4](https://zod.dev/) | Runtime validation and backup/migration parsing |
| Backup archives | [`fflate`](https://github.com/101arrowz/fflate) | Client-only ZIP creation and extraction for portable local backups |
| Icons | [Lucide React](https://lucide.dev/) + [Motion Icons](https://www.npmjs.com/package/motion-icons-react) | Interface iconography |
| Class composition | [CVA](https://cva.style/), `clsx`, and `tailwind-merge` | Reusable variants and conflict-safe classes |
| Compiler | [React Compiler](https://react.dev/learn/react-compiler) | Automatic component optimization |
| Local tooling | [Bun](https://bun.sh/) | Dependency installation, dev scripts, and unit tests |
| Production runtime | [Node.js 24](https://nodejs.org/) | Stable Vercel production builds |
| Quality | [Biome](https://biomejs.dev/) | Formatting, linting, accessibility, React, and Next.js checks |
| Deployment | [Vercel](https://vercel.com/) | Static/application hosting through `vercel.json` |

## Getting started

Requirements:

- [Bun 1.4+](https://bun.sh/docs/installation)
- [Node.js 24](https://nodejs.org/) for production-build parity

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Visit `/test` and choose **Seed or replace** to
load the bundled Markdown demo workspace.

## Scripts

| Command | Description |
| --- | --- |
| `bun dev` | Start the Next.js development server with Bun |
| `bun run format` | Format supported files with Biome |
| `bun run lint` | Run Biome checks across the project |
| `bun test` | Run repository, migration, Markdown, autosave, and proofreading unit tests |
| `bun run build` | Create the standard optimized production build |
| `node node_modules/next/dist/bin/next build` | Run the Node 24 Vercel-equivalent build |
| `bun start` | Serve a completed production build |

Recommended local verification:

```bash
bun run format
bun run lint
bun test
bun run build
node node_modules/next/dist/bin/next build
git diff --check
```

## Architecture

```text
src/
├── app/
│   ├── books/[bookId]/       # Unified Read/Write workspace and tool composition
│   ├── books/                # Repository-backed local library
│   ├── stories/[publicId]/    # Unlisted, read-only published-story reader
│   ├── api/                  # Authenticated sync, publishing, and remote MCP handlers
│   ├── test/                 # Repository diagnostics, storage migration, and backup controls
│   ├── globals.css           # Paper/Stone semantic tokens
│   └── page.tsx              # Landing screen
├── components/
│   ├── book-tools/           # Spell check, Characters, and Chapter arc drawers
│   └── ui/floating-toolbar.tsx
└── lib/
    ├── backup/               # ZIP archive creation, validation, and legacy backup detection
    ├── markdown/             # Counting and URL-safety helpers
    ├── proofreading/         # Engine-neutral service plus Harper adapter
    ├── repository/           # Product contract, IndexedDB v3, migration, autosave, and seed data
    ├── sync/                 # Client sync metadata, record reconciliation, and sync transport
    ├── database/             # Server-only MongoDB sync records and published-story snapshots
    ├── mcp/                  # OAuth-scoped remote MCP transport, auth, and tool registry
    └── webmcp/               # Site-tool schemas, registration lifecycle, and workspace bridge
```

`next.config.ts` owns legacy redirects, `biome.json` owns formatting and lint rules,
`vercel.json` pins the frozen Bun install and Node production build, and `AGENTS.md` records local
development and theme requirements for coding agents.

Set `NEXT_PUBLIC_SITE_URL` to the deployed origin so social metadata uses the correct absolute URL.
MongoDB is required only for the optional account sync feature; no pricing configuration is required.

## License

Awthor is free and open-source software licensed under the
[GNU Affero General Public License v3.0](LICENSE).
