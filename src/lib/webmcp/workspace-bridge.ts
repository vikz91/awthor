export const workspaceCommandEventName = "awthor:webmcp-workspace-command";
export const repositoryChangedEventName = "awthor:repository-changed";

export type WorkspaceScrollTarget = "manuscript" | "chapter_list";
export type WorkspaceScrollAction = "up" | "down" | "start" | "end";
export type WorkspaceScrollDistance = "small" | "half_page" | "page";

export type WorkspaceCommand =
  | { type: "prepare-data-change" }
  | { type: "leave"; destination: "back" | "book" | "home" | "library" }
  | { type: "select-chapter"; bookId: string; chapterId: string }
  | {
      type: "select-adjacent-chapter";
      bookId: string;
      direction: "previous" | "next";
    }
  | { type: "open-chapter-list"; bookId: string }
  | {
      type: "scroll";
      target: WorkspaceScrollTarget;
      action: WorkspaceScrollAction;
      distance: WorkspaceScrollDistance;
    };

export type WorkspaceCommandResult =
  | { ok: true; type: "prepared" | "leave" | "select-chapter" }
  | { ok: true; type: "open-chapter-list" }
  | {
      ok: true;
      type: "select-adjacent-chapter";
      chapter: { id: string; number: number; title: string };
    }
  | {
      ok: true;
      type: "scroll";
      target: WorkspaceScrollTarget;
      from: number;
      to: number;
      atStart: boolean;
      atEnd: boolean;
    }
  | { ok: false; error: { code: string; message: string } };

export type RepositoryChangeDetail = {
  source: "webmcp";
  operation: "create-book" | "add-chapter" | "update-book" | "update-chapter" | "import-data";
  bookId?: string;
  chapterId?: string;
};

type WorkspaceCommandEventDetail = {
  command: WorkspaceCommand;
  respond(result: WorkspaceCommandResult): void;
};

const commandTimeout = 15_000;

/**
 * Sends a closed, same-document command to the mounted book workspace.
 * A null result means there is no book workspace on the current page.
 */
export function requestWorkspaceCommand(
  command: WorkspaceCommand,
): Promise<WorkspaceCommandResult | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: WorkspaceCommandResult | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = window.setTimeout(
      () =>
        finish({
          ok: false,
          error: {
            code: "WORKSPACE_TIMEOUT",
            message: "The open book did not finish the requested action in time.",
          },
        }),
      commandTimeout,
    );
    const event = new CustomEvent<WorkspaceCommandEventDetail>(workspaceCommandEventName, {
      cancelable: true,
      detail: { command, respond: finish },
    });

    const handled = !window.dispatchEvent(event);
    if (!handled) {
      finish(null);
    }
  });
}

export function respondToWorkspaceCommand(
  event: Event,
  handler: (command: WorkspaceCommand) => Promise<WorkspaceCommandResult>,
) {
  const commandEvent = event as CustomEvent<WorkspaceCommandEventDetail>;
  if (!commandEvent.detail?.command || !commandEvent.detail.respond) {
    return;
  }

  event.preventDefault();
  void handler(commandEvent.detail.command)
    .then(commandEvent.detail.respond)
    .catch((reason) => {
      commandEvent.detail.respond({
        ok: false,
        error: {
          code: "WORKSPACE_ERROR",
          message:
            reason instanceof Error ? reason.message : "The book action could not be completed.",
        },
      });
    });
}

export function notifyRepositoryChanged(detail: RepositoryChangeDetail) {
  window.dispatchEvent(
    new CustomEvent<RepositoryChangeDetail>(repositoryChangedEventName, { detail }),
  );
}

export function readRepositoryChange(event: Event): RepositoryChangeDetail | null {
  const detail = (event as CustomEvent<RepositoryChangeDetail>).detail;
  return detail?.source === "webmcp" ? detail : null;
}
