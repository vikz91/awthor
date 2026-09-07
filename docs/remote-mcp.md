# Awthor Remote MCP

Awthor exposes an OAuth-protected, tool-only MCP server for a writer's synced cloud workspace.
The canonical production endpoint is:

```text
https://awthor.abhishekdeb.com/mcp
```

`/api/mcp` remains available as a compatibility alias. New connections should use `/mcp` so MCP
clients can discover the standard protected-resource metadata at
`/.well-known/oauth-protected-resource`.

Remote MCP does not read browser-local IndexedDB. A writer must sign in, enable cloud features,
and sync a workspace before a remote client can see it.

## Capability map

The server advertises 25 tools. "Story" content is represented by an ordered chapter inside a
book; publishing creates a separate read-only public snapshot of the complete book.

| Capability | Tools | OAuth scope |
| --- | --- | --- |
| Search and retrieve | `search`, `fetch` | `awthor.read` |
| List and read books | `awthor_list_books`, `awthor_get_book` | `awthor.read` |
| List and read stories/chapters | `awthor_list_chapters`, `awthor_get_chapter` | `awthor.read` |
| Create, update, and delete books | `awthor_create_book`, `awthor_update_book`, `awthor_delete_book` | `awthor.write` |
| Create, update, order, and delete stories/chapters | `awthor_create_chapter`, `awthor_update_chapter`, `awthor_reorder_chapters`, `awthor_delete_chapter`, `awthor_update_chapter_arc` | `awthor.write` |
| Read and maintain characters | `awthor_list_characters`, `awthor_get_character`, `awthor_create_character`, `awthor_update_character`, `awthor_delete_character` | read or write |
| Read and maintain author/workspace preferences | `awthor_get_workspace_settings`, `awthor_update_workspace_settings` | read or write |
| Back up and restore | `awthor_export_data`, `awthor_import_data` | read or write |
| Publish and unpublish a complete book | `awthor_publish_book`, `awthor_unpublish_book` | `awthor.write` and `awthor.publish` |

`search` and `fetch` use the conventional ChatGPT-compatible schemas. Search results have stable
`book:<id>` or `story:<book-id>:<chapter-id>` identifiers; `fetch` resolves those identifiers to
book metadata or private chapter Markdown.

All tools declare OAuth requirements, read/write/destructive/idempotent annotations, and concise
invocation status text. A client should still ask the writer before destructive or publishing
operations.

## Test locally with MCP Inspector

Start Awthor from the repository root:

```bash
bun dev
```

Then start MCP Inspector:

```bash
bunx @modelcontextprotocol/inspector
```

In Inspector, choose **Streamable HTTP**, enter `http://localhost:3000/mcp`, and connect. The
server should return an OAuth challenge, Inspector should discover Clerk, and the browser should
open the Awthor sign-in flow. After sign-in, verify **List Tools**, then exercise this minimal
sequence:

1. Call `awthor_list_books`.
2. Call `awthor_list_chapters` with a returned book ID.
3. Call `awthor_get_chapter` with a returned book and chapter ID.
4. Create a disposable chapter, update it, and delete it.

Those calls operate on the signed-in account's synced data. Use a test account or back up the
workspace first.

## Connect ChatGPT desktop during local development

ChatGPT cannot call `localhost` on the developer's Mac directly. Give the local server a temporary
public HTTPS URL with a trusted development tunnel (for example, ngrok or OpenAI's Secure MCP
Tunnel), then start Next.js with that same public origin:

```bash
NEXT_PUBLIC_SITE_URL=https://your-temporary-host.example bun dev
```

The URL must be set before Next.js starts because it is used in OAuth discovery and authentication
challenges. Test these URLs from outside the local machine:

```text
https://your-temporary-host.example/mcp
https://your-temporary-host.example/.well-known/oauth-protected-resource
```

In ChatGPT desktop:

1. Enable developer mode under **Settings → Security and login**.
2. Open **Settings → Plugins**, add a custom MCP server, and enter the public `/mcp` URL.
3. Complete Awthor's Clerk sign-in and authorize the requested scopes.
4. Start a new chat, select the Awthor plugin, and ask it to list books.

If tool definitions or OAuth metadata change, refresh or recreate the connection so ChatGPT does
not use cached metadata. Never expose an unauthenticated tunnel: Awthor's MCP endpoint is designed
to reject requests without a valid Clerk bearer token.

## Production checklist

- `NEXT_PUBLIC_SITE_URL` is exactly `https://awthor.abhishekdeb.com`.
- `CLERK_OAUTH_AUTHORIZATION_SERVER_URL`, Clerk keys, and `MONGODB_URI` are configured.
- Clerk allows dynamic client registration and Authorization Code + PKCE (`S256`).
- `GET /mcp` without a token returns `401` with a `WWW-Authenticate` challenge containing the
  canonical protected-resource metadata URL.
- `GET /.well-known/oauth-protected-resource` returns the production `/mcp` resource URL and all
  three Awthor scopes.
- An authenticated MCP Inspector session can initialize, list all 25 tools, and complete one safe
  read call.
- The ChatGPT connection requests no broader scopes than the intended workflow requires.

