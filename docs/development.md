# Development

This guide covers running, verifying, and deploying Awthor. For contribution scope, pull-request
expectations, release instructions, and the project's local-first design boundaries, read
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Run from source

Install:

- [Bun 1.4+](https://bun.sh/docs/installation) for dependency management, development, and tests
- [Node.js 24](https://nodejs.org/) for parity with production builds

From the repository root:

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000). To load the bundled Markdown demo workspace,
visit **System** at `/test` and choose **Seed or replace**.

## Run locally with Docker

Docker is the simplest way to run Awthor without installing Node.js or Bun. Install Docker Desktop,
or Docker Engine with the Compose plugin, then run:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The default container is fully local-only and
does not require an account, API key, or database. Manuscripts remain in this browser's IndexedDB,
so removing or rebuilding the container does not remove them; clearing browser data does. Export
backups regularly.

To run in the background, follow logs, or stop the app:

```bash
docker compose up --build --detach
docker compose logs --follow awthor
docker compose down
```

Optional accounts, sync, publishing, and remote MCP use the variables documented in
[`.env.example`](../.env.example). Copy it to `.env`, fill in only the services you want, and rebuild
the image. `NEXT_PUBLIC_` values are embedded by Next.js during the image build, while server-only
values are supplied to the running container.

The image uses Bun 1.4 for a frozen dependency install, Node 24 for the production build and runtime,
and Next.js standalone output. Compose publishes the app on port `3000`.

## Scripts and verification

| Command | Purpose |
| --- | --- |
| `bun dev` | Start the Next.js development server with Bun |
| `bun run format` | Format supported files with Biome; this command modifies files |
| `bun run lint` | Run Biome checks across the project |
| `bun run lint:staged` | Format and check staged supported files with Biome |
| `bun test` | Run the Bun test suite |
| `bun run build` | Create an optimized production build using Bun |
| `node node_modules/next/dist/bin/next build` | Run the Node 24 build used by Vercel and Docker |
| `bun start` | Serve a completed production build |
| `bun run release` | Validate and push the package-version release tag from a clean, synchronized `main` branch |

Run the checks appropriate to the change. The complete local verification sequence is:

```bash
bun run format
bun run lint
bun test
bun run build
node node_modules/next/dist/bin/next build
git diff --check
```

The Node build overlaps with `bun run build`, but catches differences from the production build
path. Include intentional formatting changes in the contribution.

## Tech stack

| Area | Technology | Role |
| --- | --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) App Router | Routes, metadata, redirects, server/client boundaries, and builds |
| UI runtime | [React 19](https://react.dev/) | Component rendering and client workspace state |
| Language | [TypeScript 5](https://www.typescriptlang.org/) | Strict application, repository, and service contracts |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) | Responsive utilities and semantic Paper/Stone theme tokens |
| Components | [shadcn](https://ui.shadcn.com/) and [Base UI](https://base-ui.com/) | Accessible, locally owned primitives and drawers/dialogs |
| Markdown | [`react-markdown`](https://github.com/remarkjs/react-markdown) and [`remark-gfm`](https://github.com/remarkjs/remark-gfm) | GFM rendering without raw HTML |
| PDF export | [`@react-pdf/renderer`](https://react-pdf.org/) and Noto Serif Bengali | Client-generated paginated PDFs with Bengali text support |
| EPUB and backups | [`fflate`](https://github.com/101arrowz/fflate) | Client-generated EPUB 3 and portable ZIP archives |
| Proofreading | [Harper.js](https://writewithharper.com/) | Lazy, worker-backed, on-device writing feedback |
| Optional accounts | [Clerk](https://clerk.com/) | Email-code identity and opt-in sync ownership |
| Optional sync storage | [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/) | Server-only, account-scoped workspace records |
| AI integrations | [WebMCP Site Tools](https://learn.chatgpt.com/docs/webmcp) and [Model Context Protocol](https://modelcontextprotocol.io/) | Page-local browser tools and an OAuth-protected remote endpoint |
| Validation | [Zod 4](https://zod.dev/) | Runtime validation and backup/migration parsing |
| Icons | [Lucide React](https://lucide.dev/) and [Motion Icons](https://www.npmjs.com/package/motion-icons-react) | Interface iconography |
| Class composition | [CVA](https://cva.style/), `clsx`, and `tailwind-merge` | Reusable variants and conflict-safe classes |
| Compiler | [React Compiler](https://react.dev/learn/react-compiler) | Automatic component optimization |
| Local tooling | [Bun](https://bun.sh/) | Installs, scripts, development, and tests |
| Production runtime | [Node.js 24](https://nodejs.org/) | Vercel, Docker builds, and container runtime |
| Quality | [Biome](https://biomejs.dev/) | Formatting, linting, accessibility, React, and Next.js checks |
| Deployment | [Vercel](https://vercel.com/) | Application hosting configured through `vercel.json` |

## Architecture

Awthor keeps product data behind `AwthorRepository`. UI code should use that contract instead of
accessing IndexedDB or localStorage directly.

```text
src/
├── app/
│   ├── .well-known/                     # OAuth authorization-server and protected-resource metadata
│   ├── api/
│   │   ├── mcp/                         # Compatibility handler shared with the canonical /mcp route
│   │   ├── publish/[bookId]/            # Authenticated publish, refresh, and unpublish operations
│   │   └── sync/{access,pull,push}/     # Hosted-access check and workspace synchronization
│   ├── books/[bookId]/                  # Unified Read/Write workspace and tool composition
│   ├── books/                           # Repository-backed local library
│   ├── mcp/                             # Canonical OAuth-protected remote MCP endpoint
│   ├── open-source-novel-writing-app/   # Public open-source product page
│   ├── private-local-first-writing-app/ # Public local-first and privacy product page
│   ├── scrivener-alternative/           # Public comparison product page
│   ├── stories/[publicId]/              # Unlisted reader and published-cover response
│   ├── test/                            # Repository diagnostics, migration, and backup controls
│   ├── robots.ts, sitemap.ts            # Generated crawler policy and marketing-page sitemap
│   ├── site.webmanifest                 # Static web application manifest
│   ├── globals.css                      # Paper/Stone semantic tokens
│   └── page.tsx                         # Public landing screen
├── components/
│   ├── book-tools/           # Spell check, Characters, and Chapter arc drawers
│   └── ui/                   # Shared interface primitives
├── lib/
│   ├── backup/               # Archive creation, validation, and legacy detection
│   ├── markdown/             # Markdown counting and URL-safety helpers
│   ├── proofreading/         # Engine-neutral contract and Harper adapter
│   ├── repository/           # Product contract, IndexedDB, migrations, autosave, and seed data
│   ├── sync/                 # Client metadata, reconciliation, scheduling, and transport
│   ├── database/             # MongoDB workspace records and published snapshots
│   ├── mcp/                  # OAuth-scoped remote MCP transport, auth, and tools
│   └── webmcp/               # Page-local tool schemas, registration, and workspace bridge
└── proxy.ts                  # Conditional Clerk middleware for hosted endpoint route families
```

### Route inventory

| Group | Route | Purpose |
| --- | --- | --- |
| Public marketing | `/` | Landing page |
| Public marketing | `/open-source-novel-writing-app` | Open-source product page |
| Public marketing | `/private-local-first-writing-app` | Local-first and privacy product page |
| Public marketing | `/scrivener-alternative` | Scrivener-alternative product page |
| Local workspace | `/books` | Browser-local book library |
| Local workspace | `/books/[bookId]` | Unified Read/Write workspace |
| Diagnostics | `/test` | Repository migration, seed, and backup diagnostics |
| Published story | `/stories/[publicId]` | Unlisted, read-only public story |
| Published story | `/stories/[publicId]/cover` | Published cover image or external-image redirect |
| Remote MCP | `/mcp` | Canonical Streamable HTTP endpoint supporting `GET`, `POST`, and `DELETE` |
| Remote MCP | `/api/mcp` | Compatibility alias for existing clients; new clients use `/mcp` |
| Hosted sync | `/api/sync/access` | `GET` the signed-in account's hosted-access status |
| Hosted sync | `/api/sync/pull` | `GET` the account-scoped remote workspace |
| Hosted sync | `/api/sync/push` | `POST` workspace changes to account-scoped storage |
| Publishing | `/api/publish/[bookId]` | `GET`, `POST`, or `DELETE` a book's published snapshot |
| OAuth discovery | `/.well-known/oauth-authorization-server` | Authorization-server metadata for remote MCP clients |
| OAuth discovery | `/.well-known/oauth-protected-resource` | Canonical protected-resource metadata for `/mcp` |
| OAuth discovery | `/.well-known/oauth-protected-resource/mcp` | Path-qualified alias for canonical `/mcp` metadata |
| OAuth discovery | `/.well-known/oauth-protected-resource/api/mcp` | Compatibility metadata for the `/api/mcp` alias |
| Generated metadata | `/robots.txt` | Crawler policy |
| Generated metadata | `/sitemap.xml` | Canonical public marketing URLs |
| Static metadata | `/site.webmanifest` | Web application manifest |

The redirects in `next.config.ts` preserve earlier product URLs: `/onboarding` opens library
settings; `/books/:bookId/chapters` opens the chapter chooser;
`/books/:bookId/characters` and `/books/:bookId/plots` select their corresponding workspace tools;
and `/books/:bookId/notes` returns to the book workspace.

Important repository configuration and workflow files:

| File | Role |
| --- | --- |
| `package.json` and `bun.lock` | Runtime versions, dependencies, and Bun scripts/lockfile |
| `next.config.ts` | Standalone output, React Compiler, and legacy route redirects |
| `tsconfig.json` | Strict TypeScript configuration and the `@/*` source alias |
| `biome.json` | Formatting, lint, accessibility, React, and Next.js rules |
| `postcss.config.mjs` | Tailwind/PostCSS integration |
| `components.json` | Local shadcn component configuration |
| `Dockerfile` and `compose.yaml` | Multi-stage production image and local container orchestration |
| `vercel.json` | Frozen Bun install, Node production build, and Vercel commands |
| `.github/workflows/ci.yml` | Pull-request and `main` verification |
| `.github/workflows/release.yml` | Tag verification and GitHub Release publication |
| `.env.example` | Documented public and optional server environment variables |
| `AGENTS.md` | Repository-specific development, validation, and theme rules for coding agents |
| `scripts/release-tag.sh` | Preflight checks and annotated-tag push used by `bun run release` |

## Deployment environment

Set `NEXT_PUBLIC_SITE_URL` to the deployed origin when enabling remote MCP. It supplies the
canonical `/mcp` resource URL, OAuth protected-resource metadata URLs, and the deployment origin
included in the MCP origin allowlist. It does not currently configure Open Graph, X, sitemap, or
robots URLs; those use the `SITE_URL` constant in `src/lib/seo.tsx`.

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is the only other documented browser-exposed variable. All
remaining account, allowlist, database, and remote MCP values in `.env.example` are server-only and
must never use the `NEXT_PUBLIC_` prefix.

MongoDB and Clerk are optional; without them Awthor remains a fully functional local-only app. See
[Data, privacy, sync, and remote MCP](data-privacy-sync.md) before enabling cloud features.
