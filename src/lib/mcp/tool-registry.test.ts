import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { RepositoryData } from "../repository/contract";
import type { AppSettings, Book, Chapter, OnboardingDetails, Theme } from "../repository/models";
import { createRemoteMcpServer, type RemoteWorkspaceService } from "./tool-registry";

const now = "2026-08-31T00:00:00.000Z";

function bookFixture(): Book {
  return {
    author: "A. Writer",
    characterCount: 0,
    characterCountWithSpaces: 0,
    chapterCount: 1,
    coverUrl: null,
    createdAt: now,
    genre: "",
    id: "book-1",
    isPartOfSeries: false,
    language: "English",
    pageCount: 0,
    preface: "",
    seriesName: "",
    seriesPosition: null,
    slug: "",
    status: "First draft",
    subgenre: "",
    subtitle: "",
    synopsis: "",
    title: "The Quiet Archive",
    updatedAt: now,
    wordCount: 3,
  };
}

function chapterFixture(): Chapter {
  return {
    arc: { conflict: "", goal: "", outcome: "", stage: "Setup", tension: 3 },
    body: "# Opening\n\nPrivate words here.",
    characterCount: 27,
    characterCountWithSpaces: 30,
    createdAt: now,
    id: "chapter-1",
    number: 1,
    pov: "",
    status: "Draft",
    summary: "",
    title: "Opening",
    updatedAt: now,
    wordCount: 3,
  };
}

function createService(): RemoteWorkspaceService & { calls: string[] } {
  const book = bookFixture();
  const chapter = chapterFixture();
  const calls: string[] = [];
  const profile: OnboardingDetails = {
    authorName: "A. Writer",
    contactEmail: "writer@example.com",
    defaultProofreadingDialect: "american",
    theme: "paper",
    website: "",
  };
  const settings: AppSettings = {
    activeBookId: null,
    backupReminder: { enabled: true, frequency: "weekly", lastShownAt: null },
    editor: {
      focusMode: false,
      fontFamily: "serif",
      fontSize: 18,
      layout: "seamless",
      lineHeight: 1.75,
      spellcheck: true,
    },
    lastChapterByBook: {},
    proofreadingByBook: {},
    readingPositionByBook: {},
  };
  const data: RepositoryData = {
    books: [book],
    chapters: { [book.id]: [chapter] },
    characters: {},
    profile,
    settings,
    theme: "paper",
  };

  return {
    calls,
    async createBook(input) {
      calls.push(`createBook:${input.title}`);
      return { book: { ...book, title: input.title }, initialChapter: chapter };
    },
    async createChapter() {
      calls.push("createChapter");
      return chapter;
    },
    async createCharacter() {
      calls.push("createCharacter");
      return {
        arc: "",
        characteristics: [],
        dob: "",
        hidden: false,
        id: "character-1",
        image: "",
        language: "",
        location: "",
        mentalDescription: "",
        name: "Elara",
        physicalDescription: "",
        relationships: "",
        storyRole: "",
      };
    },
    async deleteBook() {
      calls.push("deleteBook");
    },
    async deleteChapter() {
      calls.push("deleteChapter");
    },
    async deleteCharacter() {
      calls.push("deleteCharacter");
    },
    async exportData() {
      calls.push("exportData");
      return data;
    },
    async getBook() {
      calls.push("getBook");
      return book;
    },
    async getChapter() {
      calls.push("getChapter");
      return chapter;
    },
    async getCharacter() {
      calls.push("getCharacter");
      return null;
    },
    async getWorkspace() {
      calls.push("getWorkspace");
      return data;
    },
    async importData() {
      calls.push("importData");
      return data;
    },
    async listBooks() {
      calls.push("listBooks");
      return [book];
    },
    async listChapters() {
      calls.push("listChapters");
      return [chapter];
    },
    async listCharacters() {
      calls.push("listCharacters");
      return [];
    },
    async publishBook() {
      calls.push("publishBook");
      return { publicId: "story-123", publishedAt: now, updatedAt: now };
    },
    async reorderChapters() {
      calls.push("reorderChapters");
      return [chapter];
    },
    async unpublishBook() {
      calls.push("unpublishBook");
    },
    async updateBook() {
      calls.push("updateBook");
      return book;
    },
    async updateChapter() {
      calls.push("updateChapter");
      return chapter;
    },
    async updateCharacter() {
      calls.push("updateCharacter");
      return {
        arc: "",
        characteristics: [],
        dob: "",
        hidden: false,
        id: "character-1",
        image: "",
        language: "",
        location: "",
        mentalDescription: "",
        name: "Elara",
        physicalDescription: "",
        relationships: "",
        storyRole: "",
      };
    },
    async updateProfile(next) {
      calls.push("updateProfile");
      return next;
    },
    async updateSettings(next) {
      calls.push("updateSettings");
      return next;
    },
    async updateTheme(next: Theme) {
      calls.push("updateTheme");
      return next;
    },
  };
}

async function connect(service: RemoteWorkspaceService, scopes: readonly string[]) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createRemoteMcpServer({ scopes, service });
  const client = new Client({ name: "awthor-test-client", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

describe("remote MCP tool registry", () => {
  test("only exposes tools granted by OAuth scopes", async () => {
    const service = createService();
    const { client, server } = await connect(service, ["awthor.read"]);
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);

    expect(names).toContain("awthor_list_books");
    expect(names).toContain("awthor_export_data");
    expect(names).not.toContain("awthor_create_book");
    expect(names).not.toContain("awthor_publish_book");
    await server.close();
  });

  test("returns Markdown only for an explicit chapter request", async () => {
    const service = createService();
    const { client, server } = await connect(service, ["awthor.read"]);
    const book = await client.callTool({
      arguments: { bookId: "book-1" },
      name: "awthor_get_book",
    });
    const chapter = await client.callTool({
      arguments: { bookId: "book-1", chapterId: "chapter-1" },
      name: "awthor_get_chapter",
    });

    expect(JSON.stringify(book)).not.toContain("Private words here.");
    expect(JSON.stringify(chapter)).toContain("Private words here.");
    await server.close();
  });

  test("creates an initial chapter atomically and publishes through the OAuth-approved session", async () => {
    const service = createService();
    const { client, server } = await connect(service, [
      "awthor.read",
      "awthor.write",
      "awthor.publish",
    ]);

    await client.callTool({ arguments: { title: "New story" }, name: "awthor_create_book" });
    expect(service.calls).toEqual(["createBook:New story"]);

    const published = await client.callTool({
      arguments: { bookId: "book-1" },
      name: "awthor_publish_book",
    });
    expect(JSON.stringify(published)).toContain("story-123");
    await server.close();
  });

  test("rejects malformed imports before changing the workspace", async () => {
    const service = createService();
    const { client, server } = await connect(service, ["awthor.read", "awthor.write"]);
    const response = await client.callTool({
      arguments: { backupJson: "{}" },
      name: "awthor_import_data",
    });

    expect(response.isError).toBe(true);
    expect(service.calls).not.toContain("importData");
    await server.close();
  });
});
