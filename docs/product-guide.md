# Product guide

Awthor is a free, open-source, local-first workspace for writing novels. No account is required:
books, chapters, characters, settings, and reading positions stay in the current browser by
default. Writers may explicitly enable private multi-device sync, and a synced book can be
published separately as an unlisted, read-only snapshot.

## Highlights

- **One calm workspace:** Read and write the same Markdown chapter without changing routes. Choose
  a seamless or paginated document layout, or enter Focus mode for a distraction-free view.
- **Local writing tools:** Use on-device Harper proofreading, character dossiers, chapter arcs,
  selection formatting, live counts, and keyboard-first controls.
- **Portable work:** Export a complete book as PDF, EPUB 3, or combined Markdown. Full local
  workspaces can also be exported and imported as backups.
- **Optional multi-device sync:** Clerk identity and MongoDB sync are opt-in. The first sync is an
  explicit action; later syncs run only after meaningful events and transfer only changed records.
- **Two MCP boundaries:** Browser-scoped WebMCP operates on the current device's local workspace.
  The optional OAuth-protected remote MCP operates only on a writer's already-synced cloud
  workspace.
- **Unlisted sharing:** Publish a separate read-only snapshot of a synced book at an unlisted URL.
  Republishing refreshes that snapshot, and unpublishing disables it without changing the private
  manuscript.

## Screens and routes

Awthor's private app has four main screens:

| Route | Screen |
| --- | --- |
| `/` | Minimal landing page with product, privacy, and open-source information |
| `/books` | Searchable, cover-first local library with book and author settings dialogs |
| `/books/[bookId]` | Unified Markdown reader and writer with chapter navigation and in-place writing tools |
| `/test` | **System** diagnostics for seeding, clearing, importing, and exporting local data |

`/stories/[publicId]` sits outside the private app. It is the read-only, unlisted public snapshot
created only when a signed-in writer publishes a synced book.

Older URLs remain usable through temporary redirects:

| Previous route | Destination |
| --- | --- |
| `/onboarding` | `/books?settings=open` |
| `/books/:bookId/chapters` | `/books/:bookId?chooser=chapters` |
| `/books/:bookId/characters` | `/books/:bookId?tool=characters` |
| `/books/:bookId/plots` | `/books/:bookId?tool=chapter-arc` |
| `/books/:bookId/notes` | `/books/:bookId` |

## Reading and writing

A book opens in **Read** mode at its last chapter and saved reading position. Switching to
**Write** mode edits that same chapter as Markdown source; it does not navigate or load another
page. Changes autosave locally.

Read mode supports GitHub Flavored Markdown, including headings, lists, task lists, tables, links,
quotes, code, strikethrough, and remote images. Raw HTML is not rendered. The leading `# Heading`
is the editable chapter title and remains synchronized with chapter navigation and metadata.

Longer chapters show a subtle progress rail on desktop. Its positions are approximately one
viewport apart and can be clicked to move through the chapter. This does not split the manuscript:
the underlying document remains continuous. Reduced-motion preferences are respected.

### Document layout

The layout control switches between a seamless, Google Docs-style canvas and paginated pages.
This preference stays on the current device. Changing layouts preserves the chapter, scroll
position, and editor caret.

### Selection formatting

Selecting text in Write mode opens a compact formatter above the selection. It can apply:

- bold
- italic
- strikethrough
- line-aware quotes

These controls edit the Markdown source directly, preserve the selection, and use the normal
autosave path. There is no permanently visible formatting toolbar.

## Exporting a book

The top-bar **Export** menu always works on the complete book. Export content is assembled entirely
in the browser and is never uploaded.

- **Copy Markdown** combines the title matter, optional preface, and every chapter into one
  clipboard-ready Markdown manuscript.
- **Export as PDF** generates and downloads a paginated PDF directly in the browser, including on
  mobile. It does not require a desktop print dialog.
- **Download EPUB** creates a cover-free, reflowable EPUB 3 containing a table of contents, title
  page, preface, and chapters in their defined order.

Full-workspace backup export and import are available from **System** at `/test`.

## Focus mode

Select the Focus icon beside Read/Write to enter a temporary distraction-free workspace. Awthor
requests browser fullscreen when available and otherwise uses an in-page, full-viewport layout.
Both forms hide the top bar, writing tools, progress rail, page scrollbar, and chapter controls
while preserving the current mode, manuscript position, and editor caret.

A brief notice explains that `Escape` exits Focus mode. The bottom exit control then hides
completely and reappears only when a pointer approaches the bottom edge or a touch user taps the
bottom zone. Focus mode is never persisted.

## Writing tools

The floating toolbar provides four in-place tools:

| Tool | What it does |
| --- | --- |
| **Spell check** | Runs local Harper.js spelling, grammar, and style feedback. Each book can choose an English dialect and maintain custom vocabulary for names and transliterated words. |
| **Characters** | Opens a searchable character list and editable dossier. |
| **Chapter arc** | Records the current chapter's stage, tension, goal, conflict, and outcome. |
| **Counts** | Toggles a live word and character count for the current chapter. |

On desktop, the toolbar reveals near the bottom edge, remains available while focused or while a
tool is open, and then automatically collapses to a visible **Tools** cue. Move near the bottom
edge, select the cue, or use the keyboard shortcut to reveal it again. Touch devices keep a compact
control above the safe area. Reduced-motion preferences are respected.

## Keyboard shortcuts

Every shortcut also has a visible control.

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
| `Escape` | Exit Focus mode first; otherwise close the active overlay or return to Read mode |

## Themes

Awthor includes two themes with the same layout and interaction states:

- **Paper:** a warm, bright paper theme for drafting and reading.
- **Stone:** a dark paper theme for relaxed, low-light reading.

Both themes use semantic colors for surfaces, text, borders, focus, accents, and destructive
actions so controls remain clear and accessible.
