<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Local development server

At the start of every web implementation, debugging, or preview task, check port 3000 before
editing source files:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

- If port 3000 has no listener, start the app from the repository root with `bun dev` in a retained
  session and keep it running while the task is active.
- If port 3000 is already serving this app, reuse the existing server. Do not start a duplicate.
- Confirm the existing listener responds with `curl -fsS http://localhost:3000` before relying on it.
- If another application owns the port or the existing listener is unhealthy, do not terminate it
  automatically. Inspect the situation and choose a safe next step.

# Fast, effective web-app development

Follow current, widely adopted web-development practices while optimizing for fast iteration and
a coherent user experience.

## Work in focused product slices

- Understand the requested outcome, existing design language, routes, scripts, and dependencies
  before making broad changes.
- Build the smallest complete, recognizable product slice first, then extend it only as required.
- Prefer straightforward implementations over speculative abstractions, premature architecture,
  or unnecessary state management.
- Reuse established components, tokens, utilities, patterns, and dependencies before adding new
  ones.
- Keep mock data realistic, centralized, and easy to replace with real data later.

## Preserve the stack and repository

- Use Bun for dependency management and scripts. Do not introduce another package manager or
  lockfile.
- Preserve existing user changes and avoid unrelated rewrites or dependency upgrades.
- Add a dependency only when it provides clear value that cannot be achieved cleanly with the
  existing stack or platform APIs.
- Keep secrets out of source control. Document required environment variables in `.env.example`.
- Follow App Router and React Server Component conventions. Add `"use client"` only when browser
  state, effects, or event-driven interactivity requires it.

## Build production-quality interfaces quickly

- Use semantic HTML, correct heading order, descriptive labels, visible focus states, keyboard
  support, and sufficient color contrast.
- Design mobile-first and verify that layouts remain usable at mobile, tablet, and desktop widths.
- Make primary actions obvious and keep navigation, terminology, and feedback consistent.
- Include useful empty, loading, error, and disabled states when the requested flow can reach them.
- Avoid fake controls in production flows. If a surface is intentionally a mock, make the mock
  boundary clear in code and documentation.
- Prefer CSS and existing icon libraries for interface visuals. Optimize real images and fonts,
  avoid layout shifts, and keep client-side JavaScript lean.

## Maintain code quality without slowing delivery

- Keep TypeScript strict and model data with explicit, reusable types when that improves clarity.
- Favor small, cohesive components and readable names over clever code or excessive comments.
- Format with Biome and resolve new lint, TypeScript, accessibility, and runtime errors introduced by
  the task.
- Validate in proportion to risk: run `bun run lint` and `bun run build` for completed app changes,
  plus focused route or interaction checks for the behavior that changed.
- Check browser and server logs for relevant failures. Do not spend time fixing unrelated warnings
  unless they block the requested work.
- Before handing off, remove abandoned code and starter placeholders, confirm the requested routes
  work, and summarize the user-visible result and validation performed.
