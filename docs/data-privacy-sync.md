# Data, privacy, sync, and publishing

Awthor is local-first. Writing does not require an account, and opening or signing in to the app
does not upload a workspace. Cloud sync, remote MCP access, and public story snapshots are separate,
explicit capabilities.

## Browser storage and privacy

`AwthorRepository` is the product data boundary; pages and components do not access browser storage
directly. Storage schema v3 keeps books, chapters, characters, book-specific reading positions, and
proofreading settings as records in IndexedDB. Small bootstrap and global values—such as author
details, editor preferences, and the Paper/Stone theme—use localStorage.

Harper proofreading loads only when requested and runs in the browser. Manuscript, profile, and
custom-dictionary text are not sent to Harper or Awthor servers. PDF, EPUB, and combined Markdown
exports are also assembled entirely in the browser.

Remote cover and Markdown image URLs are an important exception to the otherwise local boundary.
Loading a remote image contacts its host, which can receive normal request metadata such as the
visitor's IP address. Awthor restricts image protocols, lazy-loads responsive images, and sends no
referrer, but those measures do not prevent the network request. Character dossiers initially use
deterministic portraits from `i.pravatar.cc`, so opening Characters contacts that host until the
writer supplies another image URL.

## Backups and migration

The `/test` route exports the logical IndexedDB and localStorage stores together as an unencrypted
`.awthor.zip` archive. Treat the archive like the manuscript itself and store it accordingly.
Awthor can also import supported v1 and v2 JSON backups for backwards compatibility.

Migration from supported v1/v2 browser data preserves books, chapters, characters, profile, theme,
and settings. Legacy Notes and Plot records are intentionally discarded. Large legacy localStorage
collections are deleted only after the corresponding IndexedDB transaction commits successfully;
if migration fails, the earlier browser records remain available and the interface offers Retry.

Browser data belongs to one origin and is not automatically portable. Export backups regularly,
especially before clearing site data, changing browsers, or moving to another device.

## Optional accounts and sync

Awthor uses Clerk for optional email-verification-code accounts and MongoDB for optional cloud
storage. Password and social sign-in providers are intentionally disabled. The Clerk account email
is separate from the author-profile contact email.

Creating an account or signing in does not change or upload browser data. The first explicit
**Sync** is consent to merge the current device's full workspace with the account workspace. MongoDB
records are scoped to Clerk's immutable user ID.

Configure account sync in the deployment environment:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
# Comma-separated primary Clerk emails allowed to use cloud features.
ADMIN_EMAILS=writer@example.com
MONGODB_URI=mongodb+srv://...
MONGODB_DB=awthor
```

Both Clerk keys are required to enable accounts. `MONGODB_URI` enables cloud storage;
`MONGODB_DB` is optional and defaults to `awthor`. Keep the secret key, allowlist, and MongoDB values
server-only—never expose them through a `NEXT_PUBLIC_` name. If account or database configuration is
absent, the writing app remains fully functional and local-only.

In Clerk, keep only **Email verification code** enabled. `ADMIN_EMAILS` is a server-checked allowlist
for sync, publishing, and remote MCP and fails closed when empty. A signed-in user outside the list
may continue using the local app but cannot upload, publish, or access cloud data.

### How subsequent syncs run

After the first manual sync, Awthor schedules another sync only in response to a meaningful event:

- a local repository mutation or explicit deletion;
- the browser reconnecting or returning to the foreground when local work is pending or the last
  successful sync is stale; or
- one refresh when an already-synced workspace is reopened and its last sync is stale.

Sync is not timer-based polling and does not continuously push data. The visible Sync control shows
status and the last successful time and can retry an error manually.

Each record has a stable SHA-256 content fingerprint used only for change detection. Device state
keeps lightweight metadata and hashes rather than duplicate manuscripts, and ordinary syncs upload
only changed records. Awthor pulls cloud changes before pushing local work. Matching records use the
newest edit, with device ID as a deterministic tie-breaker, so simultaneous edits to the same item
can replace the older copy. An empty or delayed device cannot turn missing local records into cloud
deletions; deletion records are created only by explicit local delete events.

## Private remote MCP

The optional endpoint at `/api/mcp` operates only on the MongoDB workspace already synced to the
authenticated Clerk user. It cannot read a browser's IndexedDB. Available tools cover books,
chapters, characters, chapter arcs, author/workspace settings, portable export/import, and
publishing controls.

Remote MCP data crosses into the connected client. Reading a chapter sends private Markdown;
character tools send dossier content; exporting sends an unencrypted full backup; and write/import
tools can send or replace private content. Connect only an MCP client you trust.

Authorization uses OAuth Bearer tokens and these Clerk OAuth scopes:

| Scope | Access |
| --- | --- |
| `awthor.read` | Read synced metadata and private content, including chapter Markdown and full-workspace export. |
| `awthor.write` | Create, update, delete, reorder, or import data in the synced workspace. |
| `awthor.publish` | Publish and unpublish snapshots; publishing tools are exposed only when `awthor.write` is also granted. |

OAuth consent is the server's write-authorization boundary. The server does not require additional
confirmation flags, although a client may still ask before invoking a tool.

### Remote MCP setup

Remote MCP requires the Clerk and MongoDB configuration above, plus:

```bash
NEXT_PUBLIC_SITE_URL=https://awthor.example
CLERK_OAUTH_AUTHORIZATION_SERVER_URL=https://your-clerk-oauth-issuer.example
# Optional, comma-separated additional browser-based MCP client origins.
MCP_ALLOWED_ORIGINS=https://client.example
```

Configure a Clerk OAuth application/resource for the deployed
`https://awthor.example/api/mcp` endpoint and grant `awthor.read`, `awthor.write`, and
`awthor.publish` as appropriate. `NEXT_PUBLIC_SITE_URL` supplies the canonical deployment origin;
`CLERK_OAUTH_AUTHORIZATION_SERVER_URL` is the Clerk OAuth issuer. `MCP_ALLOWED_ORIGINS` is needed
only for additional browser-based MCP clients. Native clients use the OAuth Bearer flow and do not
need an origin entry.

Remote MCP remains disabled until Clerk, MongoDB, the public site URL, and the OAuth issuer are all
configured. Local writing, account Sync, and page-local WebMCP continue to work independently.
ChatGPT/custom-MCP availability also depends on the user's plan and workspace allowing custom MCP
apps; other standards-based MCP clients can use the endpoint.

## Unlisted publishing

Publishing creates a separate, read-only snapshot at `/stories/[publicId]`. The URL is not indexed
or listed, but it is not private: anyone with the link can read it.

Publishing from an open book explicitly syncs that book and writes the snapshot to the separate
`publishedStories` collection. Publishing through remote MCP uses the current synced workspace.
The snapshot can contain the cover, book and series metadata, author name, author-profile contact
email, and the complete selected manuscript, so review those details before sharing the URL.

The first publication creates an unlisted URL. Republishing refreshes the snapshot at the same URL;
ordinary private edits do not alter the published copy. Unpublishing disables the public link
without deleting or changing the private synced book. When the same writer has other published
books in the same series, the public reader may link to them at the end of the story.
