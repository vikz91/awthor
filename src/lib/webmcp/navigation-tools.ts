import type { AwthorRepository, Book, Chapter } from "../repository";
import type { JsonSchema, JsonValue, SiteToolDefinition } from "./runtime";

export type NavigationLocation = {
  pathname: string;
  search?: string;
};

export type ScrollTarget = "manuscript" | "chapter_list";
export type ScrollAction = "up" | "down" | "start" | "end";
export type ScrollDistance = "small" | "half_page" | "page";

export type NavigationWorkspaceCommand =
  | {
      type: "leave";
      destination: "back" | "book" | "home" | "library";
    }
  | {
      type: "select-chapter";
      bookId: string;
      chapterId: string;
    }
  | {
      type: "select-adjacent-chapter";
      bookId: string;
      direction: "previous" | "next";
    }
  | { type: "open-chapter-list"; bookId: string }
  | {
      type: "scroll";
      target: ScrollTarget;
      action: ScrollAction;
      distance: ScrollDistance;
    };

export type NavigationWorkspaceErrorCode =
  | "CHAPTER_NOT_FOUND"
  | "NAVIGATION_BLOCKED"
  | "NO_SCROLL_RANGE"
  | "NOT_IN_BOOK"
  | "OVERLAY_BLOCKED"
  | "SAVE_FAILED"
  | "WORKSPACE_UNAVAILABLE";

export type NavigationWorkspaceCommandResult =
  | {
      ok: true;
      type: "leave" | "select-chapter" | "open-chapter-list";
    }
  | {
      ok: true;
      type: "select-adjacent-chapter";
      chapter: { id: string; number: number; title: string };
    }
  | {
      ok: true;
      type: "scroll";
      target: ScrollTarget;
      from: number;
      to: number;
      atStart: boolean;
      atEnd: boolean;
    }
  | {
      ok: false;
      error: {
        code: NavigationWorkspaceErrorCode;
        message: string;
      };
    };

export type NavigationSiteToolDependencies = {
  repository: AwthorRepository;
  getCurrentLocation: () => NavigationLocation;
  push: (destination: string) => Promise<void> | void;
  /** Return false when no usable history entry exists so the tool can use its safe fallback. */
  back: () => boolean | Promise<boolean>;
  runWorkspaceCommand: (
    command: NavigationWorkspaceCommand,
  ) => Promise<NavigationWorkspaceCommandResult>;
};

type ToolError = {
  ok: false;
  error: {
    code: NavigationToolErrorCode;
    message: string;
  };
};

type NavigationToolErrorCode =
  | NavigationWorkspaceErrorCode
  | "BOOK_NOT_FOUND"
  | "INVALID_INPUT"
  | "MIGRATION_FAILED"
  | "NAVIGATION_FAILED"
  | "STORAGE_ERROR"
  | "WORKSPACE_ERROR"
  | "WORKSPACE_RESPONSE_INVALID";

const emptyInputSchema: JsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

const bookInputSchema: JsonSchema = {
  type: "object",
  properties: {
    bookId: {
      type: "string",
      minLength: 1,
      description: "The exact immutable Awthor book ID.",
    },
  },
  required: ["bookId"],
  additionalProperties: false,
};

const chapterInputSchema: JsonSchema = {
  type: "object",
  properties: {
    bookId: {
      type: "string",
      minLength: 1,
      description: "The exact immutable Awthor book ID.",
    },
    chapterId: {
      type: "string",
      minLength: 1,
      description: "The exact immutable chapter ID scoped to the requested book.",
    },
  },
  required: ["bookId", "chapterId"],
  additionalProperties: false,
};

const scrollInputSchema: JsonSchema = {
  type: "object",
  properties: {
    target: {
      type: "string",
      enum: ["manuscript", "chapter_list"],
      description: "Scroll the open manuscript or its chapter chooser list.",
    },
    action: {
      type: "string",
      enum: ["up", "down", "start", "end"],
      description: "Move relative to the current position or jump to an edge.",
    },
    distance: {
      type: "string",
      enum: ["small", "half_page", "page"],
      description: "Relative scroll distance. Defaults to one page.",
      default: "page",
    },
  },
  required: ["target", "action"],
  additionalProperties: false,
};

export function createNavigationSiteTools(
  dependencies: NavigationSiteToolDependencies,
): SiteToolDefinition[] {
  const { back, getCurrentLocation, push, repository, runWorkspaceCommand } = dependencies;

  return [
    {
      name: "awthor_go_back",
      title: "Go back in Awthor",
      description:
        "Go to the previous Awthor page. Safely saves the open workspace first and falls back to the library or home page when no usable history entry exists.",
      inputSchema: emptyInputSchema,
      annotations: { readOnlyHint: false },
      execute: async (_input, { signal }) => {
        signal.throwIfAborted();
        const location = getCurrentLocation();
        const currentBookId = readBookIdFromPathname(location.pathname);
        if (currentBookId) {
          const leaveError = await leaveWorkspace(runWorkspaceCommand, "back", signal);
          if (leaveError) {
            return leaveError;
          }
        }

        try {
          signal.throwIfAborted();
          const navigated = await back();
          if (navigated !== false) {
            return {
              ok: true,
              action: "go_back",
              status: "navigation_started",
              destination: null,
              usedFallback: false,
            };
          }

          const destination = backFallback(location.pathname);
          await push(destination);
          return {
            ok: true,
            action: "go_back",
            status: "navigation_started",
            destination,
            usedFallback: true,
          };
        } catch (cause) {
          return navigationFailure(cause);
        }
      },
    },
    createFixedNavigationTool({
      name: "awthor_go_home",
      title: "Go to Awthor home",
      description: "Go to Awthor's landing page after safely leaving any open book workspace.",
      action: "go_home",
      destination: "/",
      leaveDestination: "home",
      dependencies,
    }),
    createFixedNavigationTool({
      name: "awthor_go_library",
      title: "Go to Awthor library",
      description: "Go to the local Awthor book library after safely leaving any open workspace.",
      action: "go_library",
      destination: "/books",
      leaveDestination: "library",
      dependencies,
    }),
    createAdjacentChapterTool({ direction: "previous", dependencies }),
    createAdjacentChapterTool({ direction: "next", dependencies }),
    {
      name: "awthor_open_chapter_list",
      title: "Open the Awthor chapter list",
      description:
        "Open the current book's chapter list in place. The current draft is saved before the list opens.",
      inputSchema: emptyInputSchema,
      annotations: { readOnlyHint: false },
      execute: async (_input, { signal }) => {
        const bookId = readBookIdFromPathname(getCurrentLocation().pathname);
        if (!bookId) {
          return toolError("NOT_IN_BOOK", "Open a book before opening its chapter list.");
        }
        try {
          signal.throwIfAborted();
          const result = await runWorkspaceCommand({ type: "open-chapter-list", bookId });
          if (!result.ok) {
            return workspaceFailure(result);
          }
          if (result.type !== "open-chapter-list") {
            return invalidWorkspaceResponse("opening the chapter list");
          }
          return { ok: true, action: "open_chapter_list", status: "completed" };
        } catch (cause) {
          return workspaceException(cause);
        }
      },
    },
    {
      name: "awthor_visit_book",
      title: "Visit an Awthor book",
      description:
        "Open a specific locally stored Awthor book by its exact ID. This tool never accepts arbitrary URLs.",
      inputSchema: bookInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const bookId = readRequiredString(input, "bookId");
        if (!bookId) {
          return invalidInput("bookId", "Provide a non-empty Awthor book ID.");
        }

        const bookResult = await findBook(repository, bookId, signal);
        if (!bookResult.ok) {
          return bookResult.error;
        }

        const destination = bookDestination(bookId);
        const currentBookId = readBookIdFromPathname(getCurrentLocation().pathname);
        if (currentBookId === bookId) {
          return {
            ok: true,
            action: "visit_book",
            status: "already_open",
            destination,
            book: bookSummary(bookResult.book),
          };
        }

        if (currentBookId) {
          const leaveError = await leaveWorkspace(runWorkspaceCommand, "book", signal);
          if (leaveError) {
            return leaveError;
          }
        }

        try {
          signal.throwIfAborted();
          await push(destination);
          return {
            ok: true,
            action: "visit_book",
            status: "navigation_started",
            destination,
            book: bookSummary(bookResult.book),
          };
        } catch (cause) {
          return navigationFailure(cause);
        }
      },
    },
    {
      name: "awthor_visit_chapter",
      title: "Visit an Awthor chapter",
      description:
        "Open a specific chapter within a specific locally stored Awthor book using exact immutable IDs.",
      inputSchema: chapterInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const bookId = readRequiredString(input, "bookId");
        const chapterId = readRequiredString(input, "chapterId");
        if (!bookId) {
          return invalidInput("bookId", "Provide a non-empty Awthor book ID.");
        }
        if (!chapterId) {
          return invalidInput("chapterId", "Provide a non-empty Awthor chapter ID.");
        }

        const entityResult = await findChapter(repository, bookId, chapterId, signal);
        if (!entityResult.ok) {
          return entityResult.error;
        }

        const destination = chapterDestination(bookId, chapterId);
        const currentBookId = readBookIdFromPathname(getCurrentLocation().pathname);
        if (currentBookId === bookId) {
          try {
            signal.throwIfAborted();
            const result = await runWorkspaceCommand({ type: "select-chapter", bookId, chapterId });
            if (!result.ok) {
              return workspaceFailure(result);
            }
            if (result.type !== "select-chapter") {
              return invalidWorkspaceResponse("selecting a chapter");
            }
            return {
              ok: true,
              action: "visit_chapter",
              status: "completed",
              destination,
              book: bookSummary(entityResult.book),
              chapter: chapterSummary(entityResult.chapter),
            };
          } catch (cause) {
            return workspaceException(cause);
          }
        }

        if (currentBookId) {
          const leaveError = await leaveWorkspace(runWorkspaceCommand, "book", signal);
          if (leaveError) {
            return leaveError;
          }
        }

        try {
          signal.throwIfAborted();
          await push(destination);
          return {
            ok: true,
            action: "visit_chapter",
            status: "navigation_started",
            destination,
            book: bookSummary(entityResult.book),
            chapter: chapterSummary(entityResult.chapter),
          };
        } catch (cause) {
          return navigationFailure(cause);
        }
      },
    },
    {
      name: "awthor_scroll",
      title: "Scroll Awthor",
      description:
        "Scroll the currently open manuscript or its chapter list. The chapter list opens in place when needed.",
      inputSchema: scrollInputSchema,
      annotations: { readOnlyHint: false },
      execute: async (input, { signal }) => {
        const target = readEnum(input.target, ["manuscript", "chapter_list"] as const);
        const action = readEnum(input.action, ["up", "down", "start", "end"] as const);
        const distance =
          input.distance === undefined
            ? "page"
            : readEnum(input.distance, ["small", "half_page", "page"] as const);
        if (!target) {
          return invalidInput(
            "target",
            'Choose either "manuscript" or "chapter_list" as the scroll target.',
          );
        }
        if (!action) {
          return invalidInput("action", 'Choose "up", "down", "start", or "end".');
        }
        if (!distance) {
          return invalidInput(
            "distance",
            'Choose "small", "half_page", or "page" as the scroll distance.',
          );
        }
        if (!readBookIdFromPathname(getCurrentLocation().pathname)) {
          return toolError(
            "NOT_IN_BOOK",
            "Open a book before scrolling its manuscript or chapters.",
          );
        }

        try {
          signal.throwIfAborted();
          const result = await runWorkspaceCommand({ type: "scroll", target, action, distance });
          if (!result.ok) {
            return workspaceFailure(result);
          }
          if (result.type !== "scroll") {
            return invalidWorkspaceResponse("scrolling the workspace");
          }

          return {
            ok: true,
            action: "scroll",
            status: "completed",
            target: result.target,
            from: normalizePosition(result.from),
            to: normalizePosition(result.to),
            atStart: result.atStart,
            atEnd: result.atEnd,
          };
        } catch (cause) {
          return workspaceException(cause);
        }
      },
    },
  ];
}

function createFixedNavigationTool({
  action,
  dependencies,
  description,
  destination,
  leaveDestination,
  name,
  title,
}: {
  action: "go_home" | "go_library";
  dependencies: NavigationSiteToolDependencies;
  description: string;
  destination: "/" | "/books";
  leaveDestination: "home" | "library";
  name: "awthor_go_home" | "awthor_go_library";
  title: string;
}): SiteToolDefinition {
  return {
    name,
    title,
    description,
    inputSchema: emptyInputSchema,
    annotations: { readOnlyHint: false },
    execute: async (_input, { signal }) => {
      signal.throwIfAborted();
      const location = dependencies.getCurrentLocation();
      if (location.pathname === destination) {
        return { ok: true, action, status: "already_open", destination };
      }

      if (readBookIdFromPathname(location.pathname)) {
        const leaveError = await leaveWorkspace(
          dependencies.runWorkspaceCommand,
          leaveDestination,
          signal,
        );
        if (leaveError) {
          return leaveError;
        }
      }

      try {
        signal.throwIfAborted();
        await dependencies.push(destination);
        return { ok: true, action, status: "navigation_started", destination };
      } catch (cause) {
        return navigationFailure(cause);
      }
    },
  };
}

function createAdjacentChapterTool({
  dependencies,
  direction,
}: {
  dependencies: NavigationSiteToolDependencies;
  direction: "previous" | "next";
}): SiteToolDefinition {
  const label = direction === "previous" ? "Previous" : "Next";
  return {
    name: direction === "previous" ? "awthor_previous_chapter" : "awthor_next_chapter",
    title: `${label} Awthor chapter`,
    description: `Open the ${direction} chapter in the current book without leaving the writing workspace. The current draft is saved first.`,
    inputSchema: emptyInputSchema,
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute: async (_input, { signal }) => {
      const bookId = readBookIdFromPathname(dependencies.getCurrentLocation().pathname);
      if (!bookId) {
        return toolError("NOT_IN_BOOK", `Open a book before selecting the ${direction} chapter.`);
      }

      try {
        signal.throwIfAborted();
        const result = await dependencies.runWorkspaceCommand({
          type: "select-adjacent-chapter",
          bookId,
          direction,
        });
        if (!result.ok) {
          return workspaceFailure(result);
        }
        if (result.type !== "select-adjacent-chapter") {
          return invalidWorkspaceResponse(`opening the ${direction} chapter`);
        }
        return {
          ok: true,
          action: direction === "previous" ? "previous_chapter" : "next_chapter",
          status: "completed",
          chapter: result.chapter,
        };
      } catch (cause) {
        return workspaceException(cause);
      }
    },
  };
}

async function leaveWorkspace(
  runWorkspaceCommand: NavigationSiteToolDependencies["runWorkspaceCommand"],
  destination: "back" | "book" | "home" | "library",
  signal: AbortSignal,
): Promise<ToolError | null> {
  try {
    signal.throwIfAborted();
    const result = await runWorkspaceCommand({ type: "leave", destination });
    if (!result.ok) {
      return workspaceFailure(result);
    }
    if (result.type !== "leave") {
      return invalidWorkspaceResponse("leaving the open book");
    }
    return null;
  } catch (cause) {
    return workspaceException(cause);
  }
}

async function findBook(
  repository: AwthorRepository,
  bookId: string,
  signal: AbortSignal,
): Promise<{ ok: true; book: Book } | { ok: false; error: ToolError }> {
  try {
    signal.throwIfAborted();
    const migration = await repository.initialize();
    if (migration.status === "failed") {
      return {
        ok: false,
        error: toolError(
          "MIGRATION_FAILED",
          `Awthor could not safely open local data: ${migration.error.message}`,
        ),
      };
    }

    signal.throwIfAborted();
    const books = (await repository.books.get()) ?? [];
    const book = books.find((candidate) => candidate.id === bookId);
    if (!book) {
      return {
        ok: false,
        error: toolError(
          "BOOK_NOT_FOUND",
          `No locally stored Awthor book has the exact ID "${bookId}".`,
        ),
      };
    }
    return { ok: true, book };
  } catch (cause) {
    if (signal.aborted) {
      throw cause;
    }
    return {
      ok: false,
      error: toolError("STORAGE_ERROR", errorMessage(cause, "Awthor could not read local books.")),
    };
  }
}

async function findChapter(
  repository: AwthorRepository,
  bookId: string,
  chapterId: string,
  signal: AbortSignal,
): Promise<
  | { ok: true; book: Book; chapter: Chapter }
  | {
      ok: false;
      error: ToolError;
    }
> {
  const bookResult = await findBook(repository, bookId, signal);
  if (!bookResult.ok) {
    return bookResult;
  }

  try {
    signal.throwIfAborted();
    const chapters = (await repository.chapters.list(bookId)) ?? [];
    const chapter = chapters.find((candidate) => candidate.id === chapterId);
    if (!chapter) {
      return {
        ok: false,
        error: toolError(
          "CHAPTER_NOT_FOUND",
          `Book "${bookId}" has no chapter with the exact ID "${chapterId}".`,
        ),
      };
    }
    return { ok: true, book: bookResult.book, chapter };
  } catch (cause) {
    if (signal.aborted) {
      throw cause;
    }
    return {
      ok: false,
      error: toolError(
        "STORAGE_ERROR",
        errorMessage(cause, "Awthor could not read the book's local chapters."),
      ),
    };
  }
}

function readRequiredString(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readEnum<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
): Values[number] | null {
  return typeof value === "string" && values.includes(value) ? (value as Values[number]) : null;
}

function bookDestination(bookId: string): string {
  return `/books/${encodeURIComponent(bookId)}`;
}

function chapterDestination(bookId: string, chapterId: string): string {
  const query = new URLSearchParams({ chapter: chapterId });
  return `${bookDestination(bookId)}?${query.toString()}`;
}

function readBookIdFromPathname(pathname: string): string | null {
  const match = /^\/books\/([^/]+)\/?$/u.exec(pathname);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function backFallback(pathname: string): "/" | "/books" {
  return readBookIdFromPathname(pathname) ? "/books" : "/";
}

function bookSummary(book: Book): JsonValue {
  return { id: book.id, title: book.title };
}

function chapterSummary(chapter: Chapter): JsonValue {
  return { id: chapter.id, number: chapter.number, title: chapter.title };
}

function normalizePosition(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function invalidInput(field: string, message: string): ToolError {
  return toolError("INVALID_INPUT", `${field}: ${message}`);
}

function navigationFailure(cause: unknown): ToolError {
  return toolError(
    "NAVIGATION_FAILED",
    errorMessage(cause, "Awthor could not start that navigation."),
  );
}

function workspaceException(cause: unknown): ToolError {
  return toolError(
    "WORKSPACE_ERROR",
    errorMessage(cause, "The open Awthor workspace could not complete that action."),
  );
}

function workspaceFailure(result: Extract<NavigationWorkspaceCommandResult, { ok: false }>) {
  return toolError(result.error.code, result.error.message);
}

function invalidWorkspaceResponse(action: string): ToolError {
  return toolError(
    "WORKSPACE_RESPONSE_INVALID",
    `The open Awthor workspace returned an invalid response while ${action}.`,
  );
}

function toolError(code: NavigationToolErrorCode, message: string): ToolError {
  return { ok: false, error: { code, message } };
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
