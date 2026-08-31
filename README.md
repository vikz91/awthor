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
[![WebMCP](https://img.shields.io/badge/WebMCP-Site_Tools-C2412D)](https://learn.chatgpt.com/docs/webmcp)
[![Markdown](https://img.shields.io/badge/Editor-GFM-000000?logo=markdown&logoColor=white)](https://github.github.com/gfm/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-4D7C0F?logo=gnu&logoColor=white)](LICENSE)
![Storage](https://img.shields.io/badge/Manuscript_Storage-Your_Device-5F6B4E)

Awthor is a deliberately minimal writing workspace. The hosted application does not store
manuscripts in an Awthor server database: books, chapters, characters, settings, and reading
positions remain in the current browser. IndexedDB stores book-domain records while localStorage
is limited to small bootstrap and global-preference values.

Awthor is local-first by default: no account is required to write. An optional email account
foundation is available for the future sync release, but signing in today does not upload any books,
profile details, settings, or manuscript content.

There is no pricing tier. Awthor is completely free and distributed under the
[GNU Affero General Public License v3.0](LICENSE).

## Four screens

| Route | Purpose |
| --- | --- |
| `/` | Minimal landing page with product, privacy, and open-source positioning |
| `/books` | Searchable, cover-first local library with book and author settings dialogs |
| `/books/[bookId]` | Unified Markdown reader/writer with chapters and in-place writing tools |
| `/test` | Local repository diagnostics for seeding, clearing, importing, and exporting data |

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
opens the browser's local print dialog with a dedicated light, paginated book layout; choose Save as
PDF to create the file. Export content is assembled entirely in the browser and is never uploaded.

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

### Optional accounts and future sync

Awthor uses [Clerk](https://clerk.com/) for the optional account foundation. It supports email
verification codes only; passwords and social providers are intentionally not enabled. Creating an
account is voluntary and prepares identity for a future multi-device sync and authenticated remote
MCP service. It does not change `AwthorRepository`, upload local data, or connect an account email
to the separate author-profile email.

To enable the account controls in a deployment, configure both values below in the deployment
environment. When either one is absent, Awthor remains fully functional and local-only.

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

In the Clerk dashboard, keep only **Email verification code** enabled. The future sync service will
use Clerk's immutable user ID to isolate each author's cloud workspace; it will be introduced only
with explicit sync consent and a separate privacy update.

## WebMCP Site Tools

Awthor exposes a deliberately narrow set of local [WebMCP Site
Tools](https://learn.chatgpt.com/docs/webmcp) when it is opened in a compatible top-level AI
browser. There is no MCP server, API key, Awthor account, or remote data bridge: the tools execute
inside the open page and reuse `AwthorRepository` against that browser's IndexedDB data. Ordinary
browsers feature-detect the API and continue without registering anything.

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
Awthor page is closed or navigated away. A standalone local MCP server would be needed for that
different, page-independent workflow.

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
the evolving API. It remains page-scoped and local-only; a future remote MCP service requires the
separate optional cloud-sync release.

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
| Proofreading | [Harper.js](https://writewithharper.com/) | Lazy, worker-backed, on-device writing feedback |
| Optional accounts | [Clerk](https://clerk.com/) | Email-code identity foundation for future opt-in sync |
| AI browser tools | [WebMCP Site Tools](https://learn.chatgpt.com/docs/webmcp) | Feature-detected local book, chapter, backup, navigation, and scroll actions |
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
    └── webmcp/               # Site-tool schemas, registration lifecycle, and workspace bridge
```

`next.config.ts` owns legacy redirects, `biome.json` owns formatting and lint rules,
`vercel.json` pins the frozen Bun install and Node production build, and `AGENTS.md` records local
development and theme requirements for coding agents.

Set `NEXT_PUBLIC_SITE_URL` to the deployed origin so social metadata uses the correct absolute URL.
No server-side manuscript database or pricing configuration is required.

## License

Awthor is free and open-source software licensed under the
[GNU Affero General Public License v3.0](LICENSE).
