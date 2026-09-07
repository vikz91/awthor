import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { maxBackupFileBytes, parseBackupFile } from "../backup/archive";
import {
  type AwthorBackupV2,
  awthorBackupFormat,
  awthorBackupVersion,
  type RepositoryData,
} from "../repository/contract";
import type {
  AppSettings,
  Book,
  Chapter,
  ChapterArc,
  Character,
  OnboardingDetails,
  Theme,
} from "../repository/models";
import { mcpConfiguration } from "./config";

const maxManuscriptCharacters = 2_000_000;
const maxSearchResults = 50;
const identifier = z.string().trim().min(1).max(128);
const searchDocumentIdentifier = z.string().trim().min(1).max(300);
const title = z.string().trim().min(1).max(200);
const author = z.string().trim().min(1).max(200);
const markdown = z.string().max(maxManuscriptCharacters);
const optionalHttpUrl = z
  .union([z.null(), z.string().trim().url().max(2_048)])
  .optional()
  .refine((value) => value === undefined || value === null || /^https?:\/\//u.test(value), {
    message: "URLs must use HTTP or HTTPS.",
  });

const readOnlyAnnotations = {
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
  readOnlyHint: true,
} as const;
const createAnnotations = {
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
  readOnlyHint: false,
} as const;
const updateAnnotations = {
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
  readOnlyHint: false,
} as const;
const deleteAnnotations = {
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
  readOnlyHint: false,
} as const;
const publishAnnotations = {
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
  readOnlyHint: false,
} as const;
const unpublishAnnotations = {
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
  readOnlyHint: false,
} as const;

function oauthToolMeta(
  scopes: readonly string[],
  invoking: string,
  invoked: string,
): Record<string, unknown> {
  return {
    "openai/toolInvocation/invoked": invoked,
    "openai/toolInvocation/invoking": invoking,
    securitySchemes: [{ scopes: [...scopes], type: "oauth2" }],
  };
}

const characterInput = z
  .object({
    arc: z.string().max(10_000).optional(),
    characteristics: z.array(z.string().max(500)).max(100).optional(),
    dob: z.string().max(200).optional(),
    hidden: z.boolean().optional(),
    image: optionalHttpUrl,
    language: z.string().max(200).optional(),
    location: z.string().max(500).optional(),
    mentalDescription: z.string().max(10_000).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    physicalDescription: z.string().max(10_000).optional(),
    relationships: z.string().max(10_000).optional(),
    storyRole: z.string().max(500).optional(),
  })
  .strict();

const chapterArcInput = z
  .object({
    conflict: z.string().max(10_000).optional(),
    goal: z.string().max(10_000).optional(),
    outcome: z.string().max(10_000).optional(),
    stage: z
      .enum([
        "Unassigned",
        "Setup",
        "Rising action",
        "Midpoint",
        "Escalation",
        "Climax",
        "Resolution",
      ])
      .optional(),
    tension: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
      .optional(),
  })
  .strict();

export type RemoteWorkspaceService = {
  listBooks(): Promise<Book[]>;
  getBook(bookId: string): Promise<Book | null>;
  listChapters(bookId: string): Promise<Chapter[]>;
  getChapter(bookId: string, chapterId: string): Promise<Chapter | null>;
  listCharacters(bookId: string): Promise<Character[]>;
  getCharacter(bookId: string, characterId: string): Promise<Character | null>;
  getWorkspace(): Promise<RepositoryData>;
  updateProfile(profile: OnboardingDetails): Promise<OnboardingDetails>;
  updateTheme(theme: Theme): Promise<Theme>;
  updateSettings(settings: AppSettings): Promise<AppSettings>;
  createBook(input: {
    author?: string;
    coverUrl?: string | null;
    genre?: string;
    seriesName?: string | null;
    title: string;
  }): Promise<{ book: Book; initialChapter: Chapter }>;
  updateBook(
    bookId: string,
    input: {
      author?: string;
      coverUrl?: string | null;
      genre?: string;
      seriesName?: string | null;
      title?: string;
    },
  ): Promise<Book>;
  deleteBook(bookId: string): Promise<unknown>;
  createChapter(bookId: string, input: { body?: string; title?: string }): Promise<Chapter>;
  updateChapter(
    bookId: string,
    chapterId: string,
    input: { arc?: Partial<ChapterArc>; body?: string; title?: string },
  ): Promise<Chapter>;
  reorderChapters(bookId: string, orderedChapterIds: readonly string[]): Promise<Chapter[]>;
  deleteChapter(bookId: string, chapterId: string): Promise<unknown>;
  createCharacter(
    bookId: string,
    input: { image?: string | null; name: string } & Partial<
      Omit<Character, "id" | "image" | "name">
    >,
  ): Promise<Character>;
  updateCharacter(
    bookId: string,
    characterId: string,
    input: { image?: string | null } & Partial<Omit<Character, "id" | "image">>,
  ): Promise<Character>;
  deleteCharacter(bookId: string, characterId: string): Promise<unknown>;
  exportData(): Promise<RepositoryData>;
  importData(backup: unknown): Promise<RepositoryData>;
  publishBook(
    bookId: string,
  ): Promise<{ publicId: string; publishedAt: string; updatedAt: string }>;
  unpublishBook(bookId: string): Promise<unknown>;
};

export type CreateRemoteMcpServerOptions = {
  scopes: readonly string[];
  service: RemoteWorkspaceService;
  siteUrl?: string;
};

export class RemoteMcpToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RemoteMcpToolError";
  }
}

/**
 * Creates a user-scoped MCP server. The caller must authenticate the request
 * and create `service` with that authenticated Clerk user ID; no MCP input can
 * select an account.
 */
export function createRemoteMcpServer({
  scopes,
  service,
  siteUrl = mcpConfiguration.siteUrl ?? "http://localhost:3000",
}: CreateRemoteMcpServerOptions): McpServer {
  const server = new McpServer(
    {
      description: "Read and edit a writer's private synced Awthor books and manuscripts.",
      name: "awthor",
      title: "Awthor",
      version: "1.1.0",
      websiteUrl: siteUrl,
    },
    {
      instructions:
        "A book is the top-level private work; chapters contain its story manuscript. List or search before reading or updating so you have stable IDs. Publishing creates an unlisted public snapshot and does not happen automatically when the private book changes.",
    },
  );
  const canRead = scopes.includes("awthor.read");
  const canWrite = scopes.includes("awthor.write");
  const canPublish = scopes.includes("awthor.publish");

  if (canRead) registerReadTools(server, service, siteUrl);
  if (canWrite) registerWriteTools(server, service);
  if (canPublish && canWrite) registerPublishingTools(server, service);

  return server;
}

function registerReadTools(server: McpServer, service: RemoteWorkspaceService, siteUrl: string) {
  server.registerTool(
    "search",
    {
      title: "Search synced books and stories",
      description:
        "Use this when the user wants to find a synced Awthor book or a story chapter by title, metadata, or manuscript text.",
      inputSchema: z.object({ query: z.string().trim().min(1).max(500) }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Searching Awthor…", "Search complete"),
    },
    async ({ query }) => searchResult(service, siteUrl, query),
  );
  server.registerTool(
    "fetch",
    {
      title: "Fetch a synced book or story",
      description:
        "Use this after search when the user wants the complete metadata for a book or the private Markdown for one story chapter.",
      inputSchema: z.object({ id: searchDocumentIdentifier }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Reading Awthor…", "Story ready"),
    },
    async ({ id }) => fetchResult(service, siteUrl, id),
  );
  server.registerTool(
    "awthor_list_books",
    {
      title: "List synced Awthor books",
      description:
        "Use this when the user wants to browse books already synced to this signed-in Awthor account. Manuscript text is not included.",
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Listing books…", "Books ready"),
    },
    async () =>
      result(await service.listBooks().then((books) => ({ books: books.map(summarizeBook) }))),
  );
  server.registerTool(
    "awthor_get_book",
    {
      title: "Read synced book metadata",
      description:
        "Use this when the user wants one synced book and its ordered story-chapter metadata. Manuscript text is not included.",
      inputSchema: z.object({ bookId: identifier }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Reading book…", "Book ready"),
    },
    async ({ bookId }) => {
      const book = await requireBook(service, bookId);
      const chapters = await service.listChapters(bookId);
      return result({
        book: summarizeBook(book),
        chapters: chapters.map((chapter) => summarizeChapter(bookId, chapter)),
      });
    },
  );
  server.registerTool(
    "awthor_list_chapters",
    {
      title: "List a book's story chapters",
      description:
        "Use this when the user wants to list the ordered story chapters in one synced book without reading manuscript text.",
      inputSchema: z.object({ bookId: identifier }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Listing chapters…", "Chapters ready"),
    },
    async ({ bookId }) => {
      await requireBook(service, bookId);
      const chapters = await service.listChapters(bookId);
      return result({ chapters: chapters.map((chapter) => summarizeChapter(bookId, chapter)) });
    },
  );
  server.registerTool(
    "awthor_get_chapter",
    {
      title: "Read synced chapter Markdown",
      description:
        "Use this when the user wants to read one story chapter. It returns the private Markdown manuscript to the connected MCP client.",
      inputSchema: z.object({ bookId: identifier, chapterId: identifier }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Reading chapter…", "Chapter ready"),
    },
    async ({ bookId, chapterId }) => {
      const chapter = await requireChapter(service, bookId, chapterId);
      return result({ chapter: summarizeChapter(bookId, chapter), markdown: chapter.body });
    },
  );
  server.registerTool(
    "awthor_list_characters",
    {
      title: "List synced characters",
      description:
        "Use this when the user wants the character dossiers for one synced book. Returned data is private author content.",
      inputSchema: z
        .object({ bookId: identifier, includeHidden: z.boolean().default(false) })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Listing characters…", "Characters ready"),
    },
    async ({ bookId, includeHidden }) => {
      await requireBook(service, bookId);
      const characters = await service.listCharacters(bookId);
      return result({
        characters: includeHidden
          ? characters
          : characters.filter((character) => !character.hidden),
      });
    },
  );
  server.registerTool(
    "awthor_get_character",
    {
      title: "Read a synced character",
      description:
        "Use this when the user wants to read one private character dossier from a synced book.",
      inputSchema: z.object({ bookId: identifier, characterId: identifier }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Reading character…", "Character ready"),
    },
    async ({ bookId, characterId }) =>
      result({ character: await requireCharacter(service, bookId, characterId) }),
  );
  server.registerTool(
    "awthor_get_workspace_settings",
    {
      title: "Read synced author and workspace settings",
      description:
        "Use this when the user wants the synced author profile, theme, or editor settings. This does not include manuscripts.",
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Reading settings…", "Settings ready"),
    },
    async () => {
      const workspace = await service.getWorkspace();
      return result({
        profile: workspace.profile,
        settings: workspace.settings,
        theme: workspace.theme,
      });
    },
  );
  server.registerTool(
    "awthor_export_data",
    {
      title: "Export synced Awthor workspace",
      description:
        "Use this when the user explicitly wants an unencrypted portable backup of the full synced workspace, including private manuscripts and settings.",
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta(["awthor.read"], "Exporting workspace…", "Export ready"),
    },
    async () => {
      const data = await service.exportData();
      const backup: AwthorBackupV2 = {
        data,
        exportedAt: new Date().toISOString(),
        format: awthorBackupFormat,
        version: awthorBackupVersion,
      };
      return result({ backup, unencrypted: true });
    },
  );
}

type AwthorSearchItem = { id: string; title: string; url: string };

function bookDocumentId(bookId: string) {
  return `book:${encodeURIComponent(bookId)}`;
}

function storyDocumentId(bookId: string, chapterId: string) {
  return `story:${encodeURIComponent(bookId)}:${encodeURIComponent(chapterId)}`;
}

function bookUrl(siteUrl: string, bookId: string, chapterId?: string) {
  const url = new URL(`/books/${encodeURIComponent(bookId)}`, siteUrl);
  if (chapterId) url.searchParams.set("chapter", chapterId);
  return url.toString();
}

function standardTextResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

async function searchResult(service: RemoteWorkspaceService, siteUrl: string, query: string) {
  const workspace = await service.getWorkspace();
  const needle = query.toLocaleLowerCase();
  const results: AwthorSearchItem[] = [];

  for (const book of workspace.books) {
    const bookText = [book.title, book.author, book.genre, book.seriesName, book.synopsis]
      .join("\n")
      .toLocaleLowerCase();
    if (bookText.includes(needle)) {
      results.push({
        id: bookDocumentId(book.id),
        title: book.title,
        url: bookUrl(siteUrl, book.id),
      });
    }

    for (const chapter of workspace.chapters[book.id] ?? []) {
      const storyText = [chapter.title, chapter.summary, chapter.pov, chapter.body]
        .join("\n")
        .toLocaleLowerCase();
      if (!storyText.includes(needle)) continue;
      results.push({
        id: storyDocumentId(book.id, chapter.id),
        title: `${book.title} — ${chapter.title}`,
        url: bookUrl(siteUrl, book.id, chapter.id),
      });
      if (results.length >= maxSearchResults) return standardTextResult({ results });
    }

    if (results.length >= maxSearchResults) return standardTextResult({ results });
  }

  return standardTextResult({ results });
}

async function fetchResult(service: RemoteWorkspaceService, siteUrl: string, documentId: string) {
  const [kind, ...encodedParts] = documentId.split(":");
  try {
    if (kind === "book" && encodedParts.length === 1) {
      const bookId = decodeURIComponent(encodedParts[0]);
      const book = await requireBook(service, bookId);
      const chapters = await service.listChapters(bookId);
      return standardTextResult({
        id: documentId,
        metadata: { kind: "book" },
        text: JSON.stringify(
          {
            book: summarizeBook(book),
            chapters: chapters.map((chapter) => summarizeChapter(bookId, chapter)),
          },
          null,
          2,
        ),
        title: book.title,
        url: bookUrl(siteUrl, bookId),
      });
    }

    if (kind === "story" && encodedParts.length === 2) {
      const [bookId, chapterId] = encodedParts.map((part) => decodeURIComponent(part));
      const book = await requireBook(service, bookId);
      const chapter = await requireChapter(service, bookId, chapterId);
      return standardTextResult({
        id: documentId,
        metadata: { bookId, chapterId, kind: "story" },
        text: chapter.body,
        title: `${book.title} — ${chapter.title}`,
        url: bookUrl(siteUrl, bookId, chapterId),
      });
    }
  } catch (error) {
    if (error instanceof URIError) {
      throw new RemoteMcpToolError("INVALID_ARGUMENT", "The search result ID is malformed.");
    }
    throw error;
  }

  throw new RemoteMcpToolError(
    "INVALID_ARGUMENT",
    "Use an exact book:… or story:… ID returned by the search tool.",
  );
}

function registerWriteTools(server: McpServer, service: RemoteWorkspaceService) {
  server.registerTool(
    "awthor_create_book",
    {
      title: "Create a synced Awthor book",
      description:
        "Use this when the user wants to create a book and its initial empty story chapter in the signed-in synced workspace.",
      inputSchema: z
        .object({
          author: author.optional(),
          coverUrl: optionalHttpUrl,
          genre: z
            .string()
            .trim()
            .max(200)
            .describe("Comma-separated genres, for example: Mystery, Romance")
            .optional(),
          seriesName: z.string().trim().max(200).nullable().optional(),
          title,
        })
        .strict(),
      annotations: createAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Creating book…", "Book created"),
    },
    async (input) => {
      const { book, initialChapter } = await service.createBook(input);
      return result({
        book: summarizeBook(book),
        initialChapter: summarizeChapter(book.id, initialChapter),
      });
    },
  );
  server.registerTool(
    "awthor_update_book",
    {
      title: "Update synced book metadata",
      description:
        "Use this when the user wants to update the title, author, genre, series name, or remote cover URL for a synced book.",
      inputSchema: z
        .object({
          author: author.optional(),
          bookId: identifier,
          coverUrl: optionalHttpUrl,
          genre: z
            .string()
            .trim()
            .max(200)
            .describe("Comma-separated genres, for example: Mystery, Romance")
            .optional(),
          seriesName: z.string().trim().max(200).nullable().optional(),
          title: title.optional(),
        })
        .strict()
        .refine(hasBookUpdate, "Provide at least one book field to update."),
      annotations: updateAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Updating book…", "Book updated"),
    },
    async ({ bookId, ...input }) => result({ book: await service.updateBook(bookId, input) }),
  );
  server.registerTool(
    "awthor_delete_book",
    {
      title: "Delete synced Awthor book",
      description:
        "Use this only when the user explicitly wants to permanently delete a synced book, every chapter, and every character from this account.",
      inputSchema: z.object({ bookId: identifier }).strict(),
      annotations: deleteAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Deleting book…", "Book deleted"),
    },
    async ({ bookId }) => {
      await service.deleteBook(bookId);
      return result({ deleted: true, bookId });
    },
  );
  server.registerTool(
    "awthor_create_chapter",
    {
      title: "Create synced chapter",
      description:
        "Use this when the user wants to write a new story chapter in a synced book. Supplied Markdown is stored in the signed-in cloud workspace.",
      inputSchema: z
        .object({ bookId: identifier, markdown: markdown.optional(), title: title.optional() })
        .strict(),
      annotations: createAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Creating chapter…", "Chapter created"),
    },
    async ({ bookId, markdown: body, title: chapterTitle }) =>
      result({ chapter: await service.createChapter(bookId, { body, title: chapterTitle }) }),
  );
  server.registerTool(
    "awthor_update_chapter",
    {
      title: "Update synced chapter",
      description:
        "Use this when the user wants to update a story chapter title or replace its Markdown manuscript in the synced workspace.",
      inputSchema: z
        .object({
          bookId: identifier,
          chapterId: identifier,
          markdown: markdown.optional(),
          title: title.optional(),
        })
        .strict()
        .refine(hasChapterUpdate, "Provide a chapter title or Markdown manuscript."),
      annotations: updateAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Updating chapter…", "Chapter updated"),
    },
    async ({ bookId, chapterId, markdown: body, title: chapterTitle }) =>
      result({
        chapter: await service.updateChapter(bookId, chapterId, { body, title: chapterTitle }),
      }),
  );
  server.registerTool(
    "awthor_reorder_chapters",
    {
      title: "Reorder synced chapters",
      description:
        "Use this when the user wants to set the complete ordered story-chapter ID list for a synced book.",
      inputSchema: z
        .object({ bookId: identifier, orderedChapterIds: z.array(identifier).min(1).max(10_000) })
        .strict(),
      annotations: updateAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Reordering chapters…", "Chapters reordered"),
    },
    async ({ bookId, orderedChapterIds }) =>
      result({ chapters: await service.reorderChapters(bookId, orderedChapterIds) }),
  );
  server.registerTool(
    "awthor_delete_chapter",
    {
      title: "Delete synced chapter",
      description:
        "Use this only when the user explicitly wants to permanently delete a story chapter from a synced book.",
      inputSchema: z.object({ bookId: identifier, chapterId: identifier }).strict(),
      annotations: deleteAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Deleting chapter…", "Chapter deleted"),
    },
    async ({ bookId, chapterId }) => {
      await service.deleteChapter(bookId, chapterId);
      return result({ bookId, chapterId, deleted: true });
    },
  );
  server.registerTool(
    "awthor_create_character",
    {
      title: "Create synced character",
      description: "Use this when the user wants to create a character dossier in a synced book.",
      inputSchema: z
        .object({
          bookId: identifier,
          ...characterInput.shape,
          name: z.string().trim().min(1).max(200),
        })
        .strict(),
      annotations: createAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Creating character…", "Character created"),
    },
    async ({ bookId, ...input }) =>
      result({ character: await service.createCharacter(bookId, input) }),
  );
  server.registerTool(
    "awthor_update_character",
    {
      title: "Update synced character",
      description: "Use this when the user wants to update a character dossier in a synced book.",
      inputSchema: z
        .object({ bookId: identifier, characterId: identifier, ...characterInput.shape })
        .strict()
        .refine(hasCharacterUpdate, "Provide at least one character field to update."),
      annotations: updateAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Updating character…", "Character updated"),
    },
    async ({ bookId, characterId, ...input }) =>
      result({ character: await service.updateCharacter(bookId, characterId, input) }),
  );
  server.registerTool(
    "awthor_delete_character",
    {
      title: "Delete synced character",
      description:
        "Use this only when the user explicitly wants to permanently delete a character dossier from a synced book.",
      inputSchema: z.object({ bookId: identifier, characterId: identifier }).strict(),
      annotations: deleteAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Deleting character…", "Character deleted"),
    },
    async ({ bookId, characterId }) => {
      await service.deleteCharacter(bookId, characterId);
      return result({ bookId, characterId, deleted: true });
    },
  );
  server.registerTool(
    "awthor_update_chapter_arc",
    {
      title: "Update synced chapter arc",
      description:
        "Use this when the user wants to update the stage, tension, goal, conflict, or outcome for a chapter's private story arc.",
      inputSchema: z
        .object({ bookId: identifier, chapterId: identifier, ...chapterArcInput.shape })
        .strict()
        .refine(hasArcUpdate, "Provide at least one chapter-arc field to update."),
      annotations: updateAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Updating story arc…", "Story arc updated"),
    },
    async ({ bookId, chapterId, ...input }) =>
      result({ arc: (await service.updateChapter(bookId, chapterId, { arc: input })).arc }),
  );
  server.registerTool(
    "awthor_update_workspace_settings",
    {
      title: "Update synced author and workspace settings",
      description:
        "Use this when the user wants to update the synced author profile, Paper/Stone theme, or editor settings. This does not update manuscript content.",
      inputSchema: z
        .object({
          profile: z.unknown().optional(),
          settings: z.unknown().optional(),
          theme: z.enum(["paper", "stone"]).optional(),
        })
        .strict()
        .refine(
          (input) =>
            input.profile !== undefined ||
            input.settings !== undefined ||
            input.theme !== undefined,
          "Provide profile, settings, or theme.",
        ),
      annotations: updateAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Updating settings…", "Settings updated"),
    },
    async ({ profile, settings, theme }) => {
      const changes: Record<string, unknown> = {};
      if (profile !== undefined)
        changes.profile = await service.updateProfile(profile as OnboardingDetails);
      if (theme !== undefined) changes.theme = await service.updateTheme(theme);
      if (settings !== undefined)
        changes.settings = await service.updateSettings(settings as AppSettings);
      return result(changes);
    },
  );
  server.registerTool(
    "awthor_import_data",
    {
      title: "Replace synced Awthor workspace from backup",
      description:
        "Use this only when the user explicitly wants to replace this account's synced workspace from an unencrypted Awthor backup. This cannot be undone.",
      inputSchema: z.object({ backupJson: z.string().min(1).max(maxBackupFileBytes) }).strict(),
      annotations: deleteAnnotations,
      _meta: oauthToolMeta(["awthor.write"], "Importing workspace…", "Workspace replaced"),
    },
    async ({ backupJson }) => {
      const bytes = new TextEncoder().encode(backupJson);
      if (bytes.byteLength > maxBackupFileBytes)
        throw new RemoteMcpToolError(
          "INVALID_ARGUMENT",
          "Backup files must be smaller than 10 MB.",
        );
      const parsed = parseBackupFile(bytes);
      const data = await service.importData(parsed.backup);
      return result({ summary: summarizeData(data) });
    },
  );
}

function registerPublishingTools(server: McpServer, service: RemoteWorkspaceService) {
  server.registerTool(
    "awthor_publish_book",
    {
      title: "Publish an unlisted story",
      description:
        "Use this when the user explicitly wants to create or refresh an unlisted public story from the book's current synced snapshot. Anyone with the link can read it.",
      inputSchema: z.object({ bookId: identifier }).strict(),
      annotations: publishAnnotations,
      _meta: oauthToolMeta(
        ["awthor.write", "awthor.publish"],
        "Publishing story…",
        "Story published",
      ),
    },
    async ({ bookId }) => {
      const story = await service.publishBook(bookId);
      const url = mcpConfiguration.siteUrl
        ? new URL(`/stories/${story.publicId}`, mcpConfiguration.siteUrl).toString()
        : `/stories/${story.publicId}`;
      return result({ ...story, url });
    },
  );
  server.registerTool(
    "awthor_unpublish_book",
    {
      title: "Unpublish an Awthor story",
      description:
        "Use this only when the user explicitly wants to disable the unlisted public story link without deleting the private synced book.",
      inputSchema: z.object({ bookId: identifier }).strict(),
      annotations: unpublishAnnotations,
      _meta: oauthToolMeta(
        ["awthor.write", "awthor.publish"],
        "Unpublishing story…",
        "Story unpublished",
      ),
    },
    async ({ bookId }) => {
      await service.unpublishBook(bookId);
      return result({ bookId, unpublished: true });
    },
  );
}

async function requireBook(service: RemoteWorkspaceService, bookId: string): Promise<Book> {
  const book = await service.getBook(bookId);
  if (book) return book;
  throw new RemoteMcpToolError(
    "BOOK_NOT_FOUND",
    "This synced book does not exist. Sync it from a device first, then try again.",
  );
}

async function requireChapter(
  service: RemoteWorkspaceService,
  bookId: string,
  chapterId: string,
): Promise<Chapter> {
  await requireBook(service, bookId);
  const chapter = await service.getChapter(bookId, chapterId);
  if (chapter) return chapter;
  throw new RemoteMcpToolError(
    "CHAPTER_NOT_FOUND",
    "This synced chapter does not exist. Sync it from a device first, then try again.",
  );
}

async function requireCharacter(
  service: RemoteWorkspaceService,
  bookId: string,
  characterId: string,
): Promise<Character> {
  await requireBook(service, bookId);
  const character = await service.getCharacter(bookId, characterId);
  if (character) return character;
  throw new RemoteMcpToolError(
    "CHARACTER_NOT_FOUND",
    "This synced character does not exist. Sync it from a device first, then try again.",
  );
}

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function summarizeBook(book: Book) {
  return {
    author: book.author,
    chapterCount: book.chapterCount,
    coverUrl: book.coverUrl,
    genre: book.genre,
    id: book.id,
    seriesName: book.seriesName,
    title: book.title,
    updatedAt: book.updatedAt,
    wordCount: book.wordCount,
  };
}

function summarizeChapter(bookId: string, chapter: Chapter) {
  return {
    arc: chapter.arc,
    bookId,
    characterCount: chapter.characterCount,
    characterCountWithSpaces: chapter.characterCountWithSpaces,
    id: chapter.id,
    number: chapter.number,
    status: chapter.status,
    title: chapter.title,
    updatedAt: chapter.updatedAt,
    wordCount: chapter.wordCount,
  };
}

function summarizeData(data: RepositoryData) {
  return {
    books: data.books.length,
    chapters: Object.values(data.chapters).reduce((total, chapters) => total + chapters.length, 0),
    characters: Object.values(data.characters).reduce(
      (total, characters) => total + characters.length,
      0,
    ),
  };
}

function hasBookUpdate(input: {
  author?: string;
  coverUrl?: string | null;
  genre?: string;
  seriesName?: string | null;
  title?: string;
}) {
  return (
    input.author !== undefined ||
    input.coverUrl !== undefined ||
    input.genre !== undefined ||
    input.seriesName !== undefined ||
    input.title !== undefined
  );
}

function hasChapterUpdate(input: { markdown?: string; title?: string }) {
  return input.markdown !== undefined || input.title !== undefined;
}

function hasCharacterUpdate(input: Record<string, unknown>) {
  return Object.keys(input).some((key) => key !== "bookId" && key !== "characterId");
}

function hasArcUpdate(input: Record<string, unknown>) {
  return Object.keys(input).some((key) => key !== "bookId" && key !== "chapterId");
}
