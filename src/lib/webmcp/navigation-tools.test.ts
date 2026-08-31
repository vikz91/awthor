import { describe, expect, test } from "bun:test";
import {
  type AwthorRepository,
  type Book,
  bookSchema,
  type Chapter,
  chapterSchema,
} from "../repository";
import {
  createNavigationSiteTools,
  type NavigationLocation,
  type NavigationWorkspaceCommand,
  type NavigationWorkspaceCommandResult,
} from "./navigation-tools";

const timestamp = "2026-08-31T00:00:00.000Z";

function createBook(id: string, title = "A local story"): Book {
  return bookSchema.parse({ id, title, createdAt: timestamp, updatedAt: timestamp });
}

function createChapter(id: string, number = 1, title = "A beginning"): Chapter {
  return chapterSchema.parse({ id, number, title, createdAt: timestamp, updatedAt: timestamp });
}

function createRepository(books: Book[], chapters: Record<string, Chapter[]>): AwthorRepository {
  return {
    initialize: async () => ({
      status: "not-needed",
      retryable: false,
      discarded: { notes: 0, plots: 0 },
    }),
    books: {
      get: async () => books,
    },
    chapters: {
      list: async (bookId: string) => chapters[bookId] ?? [],
    },
  } as unknown as AwthorRepository;
}

function setup({
  books,
  chapters,
  location = { pathname: "/books" },
  backResult = true,
  workspaceResult,
}: {
  books: Book[];
  chapters: Record<string, Chapter[]>;
  location?: NavigationLocation;
  backResult?: boolean;
  workspaceResult?: (
    command: NavigationWorkspaceCommand,
  ) => NavigationWorkspaceCommandResult | Promise<NavigationWorkspaceCommandResult>;
}) {
  const pushes: string[] = [];
  const workspaceCommands: NavigationWorkspaceCommand[] = [];
  let backCalls = 0;
  const tools = createNavigationSiteTools({
    repository: createRepository(books, chapters),
    getCurrentLocation: () => location,
    push: async (destination) => {
      pushes.push(destination);
    },
    back: async () => {
      backCalls += 1;
      return backResult;
    },
    runWorkspaceCommand: async (command) => {
      workspaceCommands.push(command);
      if (workspaceResult) {
        return workspaceResult(command);
      }
      if (command.type === "scroll") {
        return {
          ok: true,
          type: "scroll",
          target: command.target,
          from: 0,
          to: 0,
          atStart: true,
          atEnd: true,
        };
      }
      if (command.type === "select-adjacent-chapter") {
        return {
          ok: true,
          type: "select-adjacent-chapter",
          chapter: { id: "adjacent", number: 2, title: "Adjacent chapter" },
        };
      }
      return { ok: true, type: command.type };
    },
  });

  async function execute(name: string, input: Record<string, unknown> = {}) {
    const tool = tools.find((candidate) => candidate.name === name);
    if (!tool) {
      throw new Error(`Missing tool ${name}`);
    }
    return tool.execute(input, { signal: new AbortController().signal });
  }

  return {
    execute,
    pushes,
    tools,
    workspaceCommands,
    get backCalls() {
      return backCalls;
    },
  };
}

describe("WebMCP navigation tools", () => {
  test("exposes the narrow navigation tools with closed schemas", () => {
    const harness = setup({ books: [], chapters: {} });

    expect(harness.tools.map((tool) => tool.name)).toEqual([
      "awthor_go_back",
      "awthor_go_home",
      "awthor_go_library",
      "awthor_previous_chapter",
      "awthor_next_chapter",
      "awthor_open_chapter_list",
      "awthor_visit_book",
      "awthor_visit_chapter",
      "awthor_scroll",
    ]);
    expect(harness.tools.every((tool) => tool.inputSchema?.additionalProperties === false)).toBe(
      true,
    );
    expect(harness.tools.every((tool) => tool.annotations?.readOnlyHint === false)).toBe(true);
  });

  test("moves between adjacent chapters and opens the chapter list in place", async () => {
    const book = createBook("open-book");
    const harness = setup({
      books: [book],
      chapters: {},
      location: { pathname: "/books/open-book" },
    });

    const previous = await harness.execute("awthor_previous_chapter");
    const next = await harness.execute("awthor_next_chapter");
    const chooser = await harness.execute("awthor_open_chapter_list");

    expect(harness.workspaceCommands).toEqual([
      { type: "select-adjacent-chapter", bookId: book.id, direction: "previous" },
      { type: "select-adjacent-chapter", bookId: book.id, direction: "next" },
      { type: "open-chapter-list", bookId: book.id },
    ]);
    expect(previous).toMatchObject({ ok: true, chapter: { title: "Adjacent chapter" } });
    expect(next).toMatchObject({ ok: true, chapter: { title: "Adjacent chapter" } });
    expect(chooser).toEqual({ ok: true, action: "open_chapter_list", status: "completed" });
  });

  test("builds fixed same-origin book and chapter routes with safely encoded legacy IDs", async () => {
    const book = createBook("book/with spaces?#", "Encoded book");
    const chapter = createChapter("chapter/one ?", 2, "Encoded chapter");
    const harness = setup({
      books: [book],
      chapters: { [book.id]: [chapter] },
    });

    const bookResult = await harness.execute("awthor_visit_book", { bookId: book.id });
    const chapterResult = await harness.execute("awthor_visit_chapter", {
      bookId: book.id,
      chapterId: chapter.id,
    });

    expect(harness.pushes).toEqual([
      "/books/book%2Fwith%20spaces%3F%23",
      "/books/book%2Fwith%20spaces%3F%23?chapter=chapter%2Fone+%3F",
    ]);
    expect(bookResult).toMatchObject({ ok: true, book: { id: book.id, title: book.title } });
    expect(chapterResult).toMatchObject({
      ok: true,
      chapter: { id: chapter.id, number: 2, title: chapter.title },
    });
  });

  test("returns typed missing-book and missing-chapter errors without navigating", async () => {
    const book = createBook("known-book");
    const harness = setup({ books: [book], chapters: { [book.id]: [] } });

    expect(await harness.execute("awthor_visit_book", { bookId: "missing-book" })).toMatchObject({
      ok: false,
      error: { code: "BOOK_NOT_FOUND" },
    });
    expect(
      await harness.execute("awthor_visit_chapter", {
        bookId: book.id,
        chapterId: "missing-chapter",
      }),
    ).toMatchObject({ ok: false, error: { code: "CHAPTER_NOT_FOUND" } });
    expect(harness.pushes).toEqual([]);
    expect(harness.workspaceCommands).toEqual([]);
  });

  test("selects a chapter through the workspace bridge when its book is already open", async () => {
    const book = createBook("book with spaces");
    const chapter = createChapter("chapter?one");
    const harness = setup({
      books: [book],
      chapters: { [book.id]: [chapter] },
      location: { pathname: "/books/book%20with%20spaces" },
    });

    const result = await harness.execute("awthor_visit_chapter", {
      bookId: book.id,
      chapterId: chapter.id,
    });

    expect(harness.workspaceCommands).toEqual([
      { type: "select-chapter", bookId: book.id, chapterId: chapter.id },
    ]);
    expect(harness.pushes).toEqual([]);
    expect(result).toMatchObject({ ok: true, status: "completed" });
  });

  test("does not leave an open book when the workspace cannot flush pending changes", async () => {
    const book = createBook("open-book");
    const harness = setup({
      books: [book],
      chapters: {},
      location: { pathname: "/books/open-book" },
      workspaceResult: () => ({
        ok: false,
        error: { code: "SAVE_FAILED", message: "The current draft could not be saved." },
      }),
    });

    const result = await harness.execute("awthor_go_library");

    expect(result).toEqual({
      ok: false,
      error: { code: "SAVE_FAILED", message: "The current draft could not be saved." },
    });
    expect(harness.workspaceCommands).toEqual([{ type: "leave", destination: "library" }]);
    expect(harness.pushes).toEqual([]);
  });

  test("leaves the current workspace before visiting a different validated book", async () => {
    const currentBook = createBook("current-book");
    const nextBook = createBook("next-book");
    const harness = setup({
      books: [currentBook, nextBook],
      chapters: {},
      location: { pathname: "/books/current-book" },
    });

    await harness.execute("awthor_visit_book", { bookId: nextBook.id });

    expect(harness.workspaceCommands).toEqual([{ type: "leave", destination: "book" }]);
    expect(harness.pushes).toEqual(["/books/next-book"]);
  });

  test("flushes before going back and uses the route-safe fallback when history is unavailable", async () => {
    const book = createBook("open-book");
    const harness = setup({
      books: [book],
      chapters: {},
      location: { pathname: "/books/open-book" },
      backResult: false,
    });

    const result = await harness.execute("awthor_go_back");

    expect(harness.workspaceCommands).toEqual([{ type: "leave", destination: "back" }]);
    expect(harness.backCalls).toBe(1);
    expect(harness.pushes).toEqual(["/books"]);
    expect(result).toEqual({
      ok: true,
      action: "go_back",
      status: "navigation_started",
      destination: "/books",
      usedFallback: true,
    });
  });

  test("falls back from the library to home without invoking the workspace bridge", async () => {
    const harness = setup({
      books: [],
      chapters: {},
      location: { pathname: "/books" },
      backResult: false,
    });

    await harness.execute("awthor_go_back");

    expect(harness.workspaceCommands).toEqual([]);
    expect(harness.pushes).toEqual(["/"]);
  });

  test("forwards closed scroll inputs and normalizes the workspace position result", async () => {
    const book = createBook("open-book");
    const harness = setup({
      books: [book],
      chapters: {},
      location: { pathname: "/books/open-book" },
      workspaceResult: (command) => {
        if (command.type === "select-adjacent-chapter") {
          return {
            ok: true,
            type: "select-adjacent-chapter",
            chapter: { id: "adjacent", number: 2, title: "Adjacent chapter" },
          };
        }
        if (command.type !== "scroll") {
          return { ok: true, type: command.type };
        }
        return {
          ok: true,
          type: "scroll",
          target: command.target,
          from: -0.25,
          to: 1.4,
          atStart: false,
          atEnd: true,
        };
      },
    });

    const result = await harness.execute("awthor_scroll", {
      target: "chapter_list",
      action: "down",
      distance: "half_page",
    });

    expect(harness.workspaceCommands).toEqual([
      {
        type: "scroll",
        target: "chapter_list",
        action: "down",
        distance: "half_page",
      },
    ]);
    expect(result).toEqual({
      ok: true,
      action: "scroll",
      status: "completed",
      target: "chapter_list",
      from: 0,
      to: 1,
      atStart: false,
      atEnd: true,
    });
  });
});
