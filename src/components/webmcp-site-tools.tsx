"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { getAwthorRepository } from "@/lib/repository";
import { createDataSiteTools, type DataChangeContext } from "@/lib/webmcp/data-tools";
import {
  createNavigationSiteTools,
  type NavigationWorkspaceCommand,
  type NavigationWorkspaceCommandResult,
  type NavigationWorkspaceErrorCode,
} from "@/lib/webmcp/navigation-tools";
import { createWebMcpRegistrationSession, getWebMcpModelContext } from "@/lib/webmcp/runtime";
import {
  notifyRepositoryChanged,
  requestWorkspaceCommand,
  type WorkspaceCommandResult,
} from "@/lib/webmcp/workspace-bridge";

/** Registers Awthor's narrow, local-first Site Tools once for the top-level document. */
export function WebMcpSiteTools() {
  const router = useRouter();
  const repository = useMemo(() => getAwthorRepository(), []);

  useEffect(() => {
    if (window.top !== window) {
      return;
    }

    const modelContext = getWebMcpModelContext(document);
    if (!modelContext) {
      return;
    }

    const prepareForDataChange = async (_context: DataChangeContext) => {
      const result = await requestWorkspaceCommand({ type: "prepare-data-change" });
      if (result && !result.ok) {
        throw new Error(result.error.message);
      }
    };
    const runWorkspaceCommand = async (
      command: NavigationWorkspaceCommand,
    ): Promise<NavigationWorkspaceCommandResult> => {
      const result = await requestWorkspaceCommand(command);
      return toNavigationWorkspaceResult(result);
    };
    const tools = [
      ...createDataSiteTools({
        repository,
        prepareForDataChange,
        notifyRepositoryChanged: ({ bookId, chapterId, operation }) => {
          if (
            operation === "export-data" ||
            operation === "list-books" ||
            operation === "read-book" ||
            operation === "read-chapter"
          ) {
            return;
          }
          notifyRepositoryChanged({ source: "webmcp", operation, bookId, chapterId });
        },
      }),
      ...createNavigationSiteTools({
        repository,
        getCurrentLocation: () => ({
          pathname: window.location.pathname,
          search: window.location.search,
        }),
        push: (destination) => router.push(destination),
        back: () => {
          if (window.history.length <= 1) {
            return false;
          }
          router.back();
          return true;
        },
        runWorkspaceCommand,
      }),
    ];
    const session = createWebMcpRegistrationSession(modelContext, tools);
    let active = true;
    void session.ready.catch((reason) => {
      if (active && process.env.NODE_ENV === "development") {
        console.warn("Awthor Site Tools could not be registered.", reason);
      }
    });

    return () => {
      active = false;
      session.dispose();
    };
  }, [repository, router]);

  return null;
}

function toNavigationWorkspaceResult(
  result: WorkspaceCommandResult | null,
): NavigationWorkspaceCommandResult {
  if (!result) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_UNAVAILABLE",
        message: "No Awthor book workspace is open on this page.",
      },
    };
  }
  if (!result.ok) {
    return {
      ok: false,
      error: {
        code: toNavigationErrorCode(result.error.code),
        message: result.error.message,
      },
    };
  }
  if (result.type === "leave") {
    return { ok: true, type: "leave" };
  }
  if (result.type === "select-chapter") {
    return { ok: true, type: "select-chapter" };
  }
  if (result.type === "open-chapter-list") {
    return { ok: true, type: "open-chapter-list" };
  }
  if (result.type === "select-adjacent-chapter") {
    return result;
  }
  if (result.type === "scroll") {
    return result;
  }

  return {
    ok: false,
    error: {
      code: "WORKSPACE_UNAVAILABLE",
      message: "The open Awthor workspace returned an unexpected response.",
    },
  };
}

function toNavigationErrorCode(code: string): NavigationWorkspaceErrorCode {
  const supportedCodes = new Set([
    "CHAPTER_NOT_FOUND",
    "NAVIGATION_BLOCKED",
    "NO_SCROLL_RANGE",
    "NOT_IN_BOOK",
    "OVERLAY_BLOCKED",
    "SAVE_FAILED",
    "WORKSPACE_UNAVAILABLE",
  ]);
  return supportedCodes.has(code)
    ? (code as NavigationWorkspaceErrorCode)
    : "WORKSPACE_UNAVAILABLE";
}
