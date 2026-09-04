import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { WorkspaceMode } from "@/lib/repository";
import { BookFloatingToolbar } from "./book-floating-toolbar";

function renderToolbar(mode: WorkspaceMode, notebookMode: boolean) {
  return renderToStaticMarkup(
    <BookFloatingToolbar
      activeTool={null}
      bookId="book-1"
      chapters={[]}
      chromeVisible
      currentChapterId="chapter-1"
      documentLayout="seamless"
      draft=""
      inspectorOpen={false}
      mode={mode}
      notebookMode={notebookMode}
      onActiveToolChange={() => undefined}
      onApplyDraft={() => undefined}
      onBeforeToolOpen={async () => undefined}
      onChapterUpdated={() => undefined}
      onChromeInteractionChange={() => undefined}
      onChromeReveal={() => undefined}
      onDocumentLayoutChange={async () => undefined}
      onNotebookModeChange={async () => undefined}
      onProofreadingPreferencesChange={async () => undefined}
      onRequestWrite={() => undefined}
      onRestoreEditorFocus={() => undefined}
      onToolDirtyChange={() => undefined}
      proofreadingPreferences={{ dialect: "american", words: [] }}
    />,
  );
}

describe("BookFloatingToolbar", () => {
  test("offers notebook mode only while writing", () => {
    expect(renderToolbar("write", false)).toContain('aria-label="Turn notebook mode on"');
    expect(renderToolbar("read", false)).not.toContain("notebook mode");
  });

  test("exposes the active notebook toggle as pressed", () => {
    const markup = renderToolbar("write", true);

    expect(markup).toContain('aria-label="Turn notebook mode off"');
    expect(markup).toContain('aria-pressed="true"');
  });
});
