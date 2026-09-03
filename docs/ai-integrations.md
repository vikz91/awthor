# AI integrations

Awthor has two deliberately separate AI integration boundaries:

| | WebMCP Site Tools | Remote MCP |
| --- | --- | --- |
| Data source | The open browser profile's local Awthor repository | The signed-in writer's already-synced cloud workspace |
| Where it runs | Inside an open Awthor page in a compatible AI browser | At the deployed `/api/mcp` endpoint |
| Account or cloud setup | None | Clerk OAuth, cloud-feature access, and MongoDB sync |
| Availability | Only while the Awthor page remains open | Page-independent from any compatible MCP client |
| Scope | Narrow book, chapter, backup, navigation, and scroll tools | Broader authoring, workspace, character, chapter-arc, backup, and publishing tools |

Use Site Tools when the AI should work with data stored on the current device. Use remote MCP for
page-independent workflows against data the writer has explicitly synced. For cloud behavior,
privacy boundaries, and remote setup, see [Data, privacy, sync, and remote MCP](data-privacy-sync.md).

## Use local WebMCP Site Tools

WebMCP support is feature-detected. Ordinary browsers continue normally without registering any
tools. In a compatible top-level AI browser:

1. Open the latest ChatGPT desktop app and use **ChatGPT Work** or **Codex**, not ordinary Chat mode.
2. Select GPT-5.6 Sol or Terra.
3. Enable **Site tools** under **Settings → Browser → Permissions**.
4. Open Awthor in the built-in browser and keep that page open.
5. Choose **Site tools** in the address bar to inspect the available actions.

The host may apply its own safety review before each call. Regular ChatGPT on the web or mobile
cannot invoke these page tools, and the desktop host cannot use them after the Awthor page is closed
or navigated away.

For local development, run `bun dev` and open [http://localhost:3000](http://localhost:3000) in the
same built-in browser. No public deployment or tunnel is required.

Browser storage is scoped to the origin and browser profile. Data created at `localhost`, on a
deployed Awthor site, and in another browser profile are separate. Export a backup from the source
origin and import it into the destination when moving between them.

## Local capabilities

The registered data tools can:

- list local books and inspect a book's ordered chapter metadata
- return a specifically requested chapter's Markdown source
- create a book with optional author, series, genre, and remote cover metadata
- add a chapter and update an existing book or Markdown chapter
- download a complete unencrypted JSON backup
- import a JSON backup only when the call includes explicit replacement confirmation

The navigation tools can:

- go back, go home, or open the library
- visit a validated local book or chapter by its immutable ID
- move to the previous or next chapter and open the current book's chapter list
- scroll the open manuscript or chapter-list dialog

An open draft is flushed through the existing autosave path before a tool changes data or navigates.
Mounted library and workspace screens refresh after a tool-side mutation. Book and chapter routes
are constructed from repository-validated IDs; the tools do not accept arbitrary URLs.

## Limits

Site Tools are page-scoped and local-only. They do not use Awthor's optional account or cloud-sync
service and cannot reach a different origin or browser profile's IndexedDB data.

The current tool set intentionally has no delete, character, chapter-arc, proofreading, publishing,
arbitrary-navigation, or general-storage tool. WebMCP is an evolving browser API, so support and
availability depend on the AI host that opened Awthor.

If a workflow needs synced characters, chapter arcs, author/workspace settings, portable cloud
backup operations, or publishing controls, use remote MCP instead. Remote MCP cannot read the open
browser's IndexedDB directly; it sees only the account workspace that has already been synced.

## Trust and privacy cautions

Treat both the AI host and the current AI session as recipients of any tool inputs and results:

- `awthor_get_chapter` returns the requested private Markdown manuscript to the assistant.
- Import sends the entire supplied backup text through the tool call. Backups are unencrypted and
  replace local data, so inspect the source and use import only in a trusted session.
- Export downloads the backup in the browser but returns only counts and download metadata to the
  assistant, not the manuscript text.
- Create and update tools modify the local repository. Review proposed titles, metadata, and prose,
  and keep regular backups before substantial AI-assisted edits.
- A remote cover or Markdown image URL can contact its host when Awthor renders it. Review URLs
  before adding them through an AI tool.

Remote MCP has a different disclosure boundary: requests and results can include synced manuscript,
character, or backup content and pass through the connected MCP client. Connect only clients you
trust, grant only the scopes you intend to use, and consult the
[data and privacy guide](data-privacy-sync.md) before enabling it.
