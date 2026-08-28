# Awthor

> A simple, focused web app for planning, writing, and finishing novels.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Bun](https://img.shields.io/badge/Bun-1.4.0-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Biome](https://img.shields.io/badge/Biome-2.4.2-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-4D7C0F?logo=gnu&logoColor=white)](LICENSE)
![Storage](https://img.shields.io/badge/Manuscript_Storage-Your_Device-5F6B4E)

Awthor is a completely free and open-source, local-first writing app for novelists. The hosted
version is designed to keep manuscripts on the writer's computer instead of storing them in an
Awthor server database.

The current v1 is a polished, responsive front-end prototype with a marketing landing page and a
demo writing library. It is intentionally mock-data-first so product flows and visual direction
can be tested before client-side persistence and the editor are implemented.

## Current pages

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page with product positioning, an editor preview, features, and calls to action |
| `/onboarding` | Single-step author name, email, website, theme, and local-storage setup |
| `/books` | Local library with manuscript statistics and four demo novels |
| `/books/[bookId]` | Book overview with metadata, preface, series information, and manuscript statistics |
| `/books/[bookId]/chapters` | Searchable chapter workspace with editable manuscript content and metadata |
| `/books/[bookId]/characters` | Interactive mock character roster with editable dossiers and add, hide, and delete actions |
| `/books/[bookId]/plots` | Plot-thread workspace with story beats, stakes, and character connections |
| `/books/[bookId]/notes` | Searchable story notebook with categories, pinning, and archiving |
| `/test` | Local-data lab for seeding, clearing, importing, and exporting browser data |

## Tech stack

| Area | Technology | Use |
| --- | --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) App Router | Routing, layouts, metadata, server rendering, and production builds |
| UI runtime | [React 19](https://react.dev/) | Component model and rendering |
| Language | [TypeScript 5](https://www.typescriptlang.org/) | Strict static typing |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first responsive styling and design tokens |
| Component system | [shadcn](https://ui.shadcn.com/) + [Base UI](https://base-ui.com/) | Accessible, locally owned UI primitives |
| Variants and class composition | [CVA](https://cva.style/), [clsx](https://github.com/lukeed/clsx), and [tailwind-merge](https://github.com/dcastil/tailwind-merge) | Reusable variants and conflict-safe class composition |
| Motion | [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) + [Motion Icons](https://www.npmjs.com/package/motion-icons-react) | Animation utilities and animated icon support |
| Icons | [Lucide React](https://lucide.dev/) | Interface iconography |
| Validation | [Zod 4](https://zod.dev/) | Runtime validation for local repository data and backups |
| Fonts | [`next/font`](https://nextjs.org/docs/app/getting-started/fonts) | Self-hosted Outfit, Nunito Sans, and Geist Mono |
| Compiler | [React Compiler](https://react.dev/learn/react-compiler) | Automatic component optimization |
| Tooling | [Bun](https://bun.sh/) | Package manager and local script runtime |
| Production runtime | [Node.js 24](https://nodejs.org/) | Stable Vercel builds and Functions runtime |
| Quality | [Biome](https://biomejs.dev/) | Formatting, linting, import organization, React, and Next.js rules |
| CSS pipeline | [PostCSS](https://postcss.org/) | Tailwind CSS compilation |
| Deployment | [Vercel](https://vercel.com/) | Next.js hosting configuration through `vercel.json` |

## Local-first data and privacy

- The hosted interface runs in the writer's browser.
- Manuscripts and project data belong in client-side storage on the writer's computer.
- The hosted deployment does not use an Awthor-owned server database for manuscript content.
- The current prototype uses static demo data; browser persistence is the next implementation
  milestone.
- Import, export, and backup tools will be important because local data does not automatically
  follow a writer to another browser or device.

## Getting started

Requirements:

- [Bun 1.4+](https://bun.sh/docs/installation)
- [Node.js 24](https://nodejs.org/) for parity with the production build runtime

Install dependencies and start the development server:

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `bun dev` | Start the Next.js development server with Bun |
| `bun run build` | Create an optimized production build |
| `bun start` | Serve the production build |
| `bun run lint` | Run Biome checks across the project |
| `bun run format` | Format supported files with Biome |

## Project structure

```text
src/
├── app/
│   ├── books/page.tsx   # Demo book library
│   ├── globals.css      # Tailwind imports and global design tokens
│   ├── layout.tsx       # Fonts, metadata, and social preview config
│   └── page.tsx         # Marketing landing page
├── components/ui/       # shadcn/Base UI components
└── lib/utils.ts         # Shared class-name helper

biome.json               # Formatter and linter rules
components.json          # shadcn configuration
next.config.ts           # Next.js and React Compiler settings
vercel.json              # Bun install and Node.js Vercel build configuration
```

## Code quality

Biome is configured with recommended JavaScript/TypeScript rules plus the React and Next.js
domains. It also enforces unused-code cleanup, type-only imports, exhaustive hook dependencies,
safe non-null handling, consistent formatting, and automatic import organization.

Run the full local quality pass with:

```bash
bun run lint
bun run build
```

## Deploying to Vercel

Import the repository into Vercel. The included `vercel.json` selects Next.js, installs the frozen
lockfile with Bun 1.4, and runs production builds and Functions on Node.js 24.

Vercel hosts the application files and interface only. Awthor does not require a server-side
manuscript database; writing data is intended to remain in browser storage on the user's device.

Set `NEXT_PUBLIC_SITE_URL` to the final production origin, for example
`https://awthor.example.com`, so absolute social-sharing metadata uses the deployed URL.

## v1 scope

Included now:

- Responsive landing page
- Author onboarding and theme setup
- Responsive shadcn-based book library
- Book metadata and series overview
- Interactive character roster and editor
- Demo manuscript and chapter data
- Page metadata and branded social preview
- Vercel and Biome configuration

Natural next steps:

- Client-side persistence for books, chapters, and notes
- Distraction-free manuscript editor
- On-device autosave and version history
- Export to DOCX, PDF, and EPUB
- Import, backup, and restore flows
- Offline/PWA support

## License

Awthor is free and open-source software licensed under the
[GNU Affero General Public License v3.0](LICENSE).
