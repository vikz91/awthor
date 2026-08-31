"use client";

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Maximize2,
  PenLine,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppTopBar } from "@/components/app-top-bar";
import { SettingsInspector } from "@/components/settings-dialog";
import { AccountMenu } from "@/components/sync-account-action";
import { SyncControl } from "@/components/sync-control";
import { Button } from "@/components/ui/button";
import type { BookExportSnapshot } from "@/lib/book-export";
import {
  formatMarkdownSelection,
  getLeadingMarkdownTitle,
  type MarkdownSelectionFormat,
  withLeadingMarkdownTitle,
  withoutLeadingMarkdownTitle,
} from "@/lib/markdown";
import {
  type AppSettings,
  type Book,
  type BookProofreadingSettings,
  type Chapter,
  createDefaultBookProofreadingSettings,
  createManuscriptAutosave,
  type DocumentLayout,
  getAwthorRepository,
  type ManuscriptAutosave,
  resolveBookProofreadingSettings,
  type SaveState,
  type WorkspaceMode,
  type WorkspaceTool,
} from "@/lib/repository";
import { cn } from "@/lib/utils";
import {
  readRepositoryChange,
  repositoryChangedEventName,
  respondToWorkspaceCommand,
  type WorkspaceCommand,
  type WorkspaceCommandResult,
  workspaceCommandEventName,
} from "@/lib/webmcp/workspace-bridge";
import { BookExport } from "./book-export";
import { BookFloatingToolbar } from "./book-floating-toolbar";
import { ChapterChooser } from "./chapter-chooser";
import { ChapterProgressRail } from "./chapter-progress-rail";
import { FocusModeControls } from "./focus-mode-controls";
import { EmptyManuscript, MarkdownManuscript } from "./markdown-manuscript";
import { PagedManuscript } from "./paged-manuscript";
import { type SelectionFormatPosition, SelectionFormatToolbar } from "./selection-format-toolbar";

type BookWorkspaceProps = {
  bookId: string;
};

type LoadState = "loading" | "ready" | "migration-error" | "storage-error" | "book-missing";

type SelectionToolbarState = SelectionFormatPosition & {
  selectionStart: number;
  selectionEnd: number;
};

type FocusModeState = "off" | "pending" | "native" | "fallback";

const toolValues = new Set<Exclude<WorkspaceTool, null>>(["spelling", "characters", "chapter-arc"]);

export function BookWorkspace({ bookId }: BookWorkspaceProps) {
  const router = useRouter();
  const repository = useMemo(() => getAwthorRepository(), []);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [missingChapterId, setMissingChapterId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<WorkspaceMode>("read");
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<WorkspaceTool>(null);
  const [dirtyTool, setDirtyTool] = useState<Exclude<WorkspaceTool, null> | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chapterChooserOpen, setChapterChooserOpen] = useState(false);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbarState | null>(null);
  const [focusModeState, setFocusModeState] = useState<FocusModeState>("off");
  const [proofreadingPreferences, setProofreadingPreferences] = useState<BookProofreadingSettings>(
    createDefaultBookProofreadingSettings,
  );
  const [documentLayout, setDocumentLayout] = useState<DocumentLayout>("seamless");

  const autosaveRef = useRef<ManuscriptAutosave | null>(null);
  const bookRef = useRef<Book | null>(null);
  const chaptersRef = useRef<Chapter[]>([]);
  const currentChapterIdRef = useRef<string | null>(null);
  const settingsRef = useRef<AppSettings | null>(null);
  const settingsWriteTailRef = useRef<Promise<void>>(Promise.resolve());
  const articleRef = useRef<HTMLElement>(null);
  const workspaceRootRef = useRef<HTMLDivElement>(null);
  const focusScrollRef = useRef<HTMLElement>(null);
  const focusModeStateRef = useRef<FocusModeState>(focusModeState);
  const focusEntryPositionRef = useRef(0);
  const pendingFocusExitPositionRef = useRef<number | null>(null);
  const pendingLayoutPositionRef = useRef<number | null>(null);
  const fullscreenVerificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inspectorPositionRef = useRef<number | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const caretByChapterRef = useRef(new Map<string, { start: number; end: number }>());
  const focusEditorAfterModeChangeRef = useRef(false);
  const restoredInitialPositionRef = useRef(false);
  const scrollingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionRepositionFrameRef = useRef<number | null>(null);
  const closingOverlayRef = useRef<"tool" | "settings" | "chooser" | null>(null);
  focusModeStateRef.current = focusModeState;

  const focusMode = focusModeState !== "off";

  const currentChapter = chapters.find((chapter) => chapter.id === currentChapterId) ?? null;
  const currentChapterIndex = currentChapter
    ? chapters.findIndex((chapter) => chapter.id === currentChapter.id)
    : -1;
  const previousChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1
      ? chapters[currentChapterIndex + 1]
      : null;
  const inspectorOpen = !focusMode && (activeTool !== null || settingsOpen);
  const exportSnapshot = useMemo<BookExportSnapshot | null>(() => {
    if (!book) {
      return null;
    }

    return {
      book,
      chapters: chapters.map((chapter) =>
        chapter.id === currentChapterId
          ? {
              ...chapter,
              body: withoutLeadingMarkdownTitle(draft),
              title: getLeadingMarkdownTitle(draft) ?? chapter.title,
            }
          : chapter,
      ),
    };
  }, [book, chapters, currentChapterId, draft]);

  const updateBook = useCallback((nextBook: Book | null) => {
    bookRef.current = nextBook;
    setBook(nextBook);
  }, []);

  const updateChapters = useCallback((nextChapters: Chapter[]) => {
    chaptersRef.current = nextChapters;
    setChapters(nextChapters);
  }, []);

  const updateSettings = useCallback((nextSettings: AppSettings | null) => {
    settingsRef.current = nextSettings;
  }, []);

  const queueSettingsSave = useCallback(
    (nextSettings: AppSettings): Promise<void> => {
      updateSettings(nextSettings);
      const operation = settingsWriteTailRef.current.then(() =>
        repository.settings.save(nextSettings),
      );
      settingsWriteTailRef.current = operation.catch(() => undefined);
      return operation;
    },
    [repository, updateSettings],
  );

  const patchSettings = useCallback(
    (patcher: (current: AppSettings) => AppSettings): Promise<void> => {
      const current = settingsRef.current;
      if (!current) {
        return Promise.resolve();
      }

      return queueSettingsSave(patcher(current));
    },
    [queueSettingsSave],
  );

  const loadWorkspace = useCallback(
    async (retryMigration = false) => {
      setLoadState("loading");
      setLoadError(null);
      setSaveState("loading");
      restoredInitialPositionRef.current = false;

      const migration = retryMigration
        ? await repository.retryMigration()
        : await repository.initialize();

      if (migration.status === "failed") {
        setLoadError(migration.error.message);
        setLoadState("migration-error");
        return;
      }

      try {
        const data = await repository.getData();
        const nextBook = data.books.find((item) => item.id === bookId) ?? null;
        updateSettings(data.settings);
        setDocumentLayout(data.settings.editor.layout);

        if (!nextBook) {
          updateBook(null);
          updateChapters([]);
          setLoadState("book-missing");
          return;
        }

        const nextChapters = data.chapters[bookId] ?? [];
        const query = readWorkspaceQuery();
        const requestedChapter = query.chapterId;
        const rememberedChapter = data.settings.lastChapterByBook[bookId];
        const selectedChapter = requestedChapter
          ? (nextChapters.find((chapter) => chapter.id === requestedChapter) ?? null)
          : (nextChapters.find((chapter) => chapter.id === rememberedChapter) ??
            nextChapters[0] ??
            null);

        updateBook(nextBook);
        updateChapters(nextChapters);
        setProofreadingPreferences(
          resolveBookProofreadingSettings(data.settings, data.profile, bookId),
        );
        currentChapterIdRef.current = selectedChapter?.id ?? null;
        setCurrentChapterId(selectedChapter?.id ?? null);
        setMissingChapterId(requestedChapter && !selectedChapter ? requestedChapter : null);
        setDraft(
          selectedChapter
            ? withLeadingMarkdownTitle(selectedChapter.body, selectedChapter.title)
            : "",
        );
        setMode("read");
        setSaveState("clean");
        setActiveTool(query.tool);
        setSettingsOpen(query.settingsOpen);
        setChapterChooserOpen(query.chapterChooserOpen);
        setLoadState("ready");

        if (selectedChapter) {
          replaceWorkspaceQuery({ chapter: selectedChapter.id });
          const nextSettings: AppSettings = {
            ...data.settings,
            activeBookId: bookId,
            lastChapterByBook: {
              ...data.settings.lastChapterByBook,
              [bookId]: selectedChapter.id,
            },
          };
          void queueSettingsSave(nextSettings).catch(() => {
            setSaveError("The reading position could not be updated on this device.");
          });
        }
      } catch (reason) {
        setLoadError(
          reason instanceof Error ? reason.message : "Local book data could not be opened.",
        );
        setLoadState("storage-error");
      }
    },
    [bookId, queueSettingsSave, repository, updateBook, updateChapters, updateSettings],
  );

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!book || !currentChapter) {
      autosaveRef.current = null;
      return;
    }

    const autosave = createManuscriptAutosave(repository, {
      bookId: book.id,
      chapterId: currentChapter.id,
      delay: 700,
      onSaved: (result) => {
        updateBook(result.book);
        updateChapters(
          chaptersRef.current.map((chapter) =>
            chapter.id === result.chapter.id ? result.chapter : chapter,
          ),
        );
        setSaveError(null);
      },
      onStateChange: (state, error) => {
        setSaveState(state);
        if (error) {
          setSaveError(error.message);
        }
      },
    });
    autosaveRef.current = autosave;

    return () => {
      if (autosaveRef.current === autosave) {
        autosaveRef.current = null;
      }
      autosave.cancel();
    };
  }, [book, currentChapter, repository, updateBook, updateChapters]);

  const flushCurrentDraft = useCallback(async (): Promise<boolean> => {
    try {
      await autosaveRef.current?.flush();
      return true;
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "The manuscript could not be saved.");
      setSaveState("error");
      return false;
    }
  }, []);

  const currentScrollPosition = useCallback(() => {
    if (focusModeStateRef.current !== "off" && focusScrollRef.current) {
      return normalizedElementScrollPosition(focusScrollRef.current);
    }
    return normalizedScrollPosition();
  }, []);

  const restoreCurrentScrollPosition = useCallback((position: number) => {
    if (focusModeStateRef.current !== "off" && focusScrollRef.current) {
      restoreNormalizedElementScrollPosition(focusScrollRef.current, position);
      return;
    }
    restoreNormalizedScrollPosition(position);
  }, []);

  const restorePendingLayoutPosition = useCallback(() => {
    const position = pendingLayoutPositionRef.current;
    if (position === null) {
      return;
    }

    pendingLayoutPositionRef.current = null;
    requestAnimationFrame(() => restoreCurrentScrollPosition(position));
  }, [restoreCurrentScrollPosition]);

  const changeDocumentLayout = useCallback(
    async (nextLayout: DocumentLayout) => {
      if (nextLayout === documentLayout) {
        return;
      }

      const previousLayout = documentLayout;
      pendingLayoutPositionRef.current = currentScrollPosition();
      setDocumentLayout(nextLayout);

      try {
        await patchSettings((current) => ({
          ...current,
          editor: {
            ...current.editor,
            layout: nextLayout,
          },
        }));
      } catch (reason) {
        const failedSettings = settingsRef.current;
        if (failedSettings) {
          updateSettings({
            ...failedSettings,
            editor: {
              ...failedSettings.editor,
              layout: previousLayout,
            },
          });
        }
        setDocumentLayout(previousLayout);
        restorePendingLayoutPosition();
        throw reason;
      }

      if (nextLayout === "seamless" || mode === "write") {
        requestAnimationFrame(restorePendingLayoutPosition);
      }
    },
    [
      currentScrollPosition,
      documentLayout,
      mode,
      patchSettings,
      restorePendingLayoutPosition,
      updateSettings,
    ],
  );

  const rememberReadingPosition = useCallback(
    async (waitForWrite = false) => {
      if (!bookRef.current || !settingsRef.current) {
        return;
      }

      const ratio = currentScrollPosition();
      const write = patchSettings((current) => ({
        ...current,
        readingPositionByBook: {
          ...current.readingPositionByBook,
          [bookId]: ratio,
        },
      }));

      if (waitForWrite) {
        try {
          await write;
        } catch (reason) {
          setSaveError(
            reason instanceof Error ? reason.message : "The reading position could not be saved.",
          );
        }
      } else {
        void write.catch(() => {
          setSaveError("The reading position could not be saved on this device.");
        });
      }
    },
    [bookId, currentScrollPosition, patchSettings],
  );

  useEffect(() => {
    if (loadState !== "ready" || !currentChapter || restoredInitialPositionRef.current) {
      return;
    }

    restoredInitialPositionRef.current = true;
    const position = settingsRef.current?.readingPositionByBook[bookId] ?? 0;
    const frame = requestAnimationFrame(() => restoreNormalizedScrollPosition(position));
    return () => cancelAnimationFrame(frame);
  }, [bookId, currentChapter, loadState]);

  useEffect(() => {
    if (loadState !== "ready") {
      return;
    }

    function handleScroll() {
      if (scrollingSaveTimerRef.current) {
        clearTimeout(scrollingSaveTimerRef.current);
      }
      scrollingSaveTimerRef.current = setTimeout(() => {
        scrollingSaveTimerRef.current = null;
        void rememberReadingPosition();
      }, 300);
    }

    const focusScroller = focusScrollRef.current;
    window.addEventListener("scroll", handleScroll, { passive: true });
    focusScroller?.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      focusScroller?.removeEventListener("scroll", handleScroll);
      if (scrollingSaveTimerRef.current) {
        clearTimeout(scrollingSaveTimerRef.current);
        scrollingSaveTimerRef.current = null;
      }
    };
  }, [loadState, rememberReadingPosition]);

  const captureCaret = useCallback(() => {
    const chapterId = currentChapterIdRef.current;
    const textarea = textareaRef.current;
    if (!chapterId || !textarea) {
      return;
    }

    caretByChapterRef.current.set(chapterId, {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    });
  }, []);

  const restoreEditorFocus = useCallback(() => {
    const textarea = textareaRef.current;
    const chapterId = currentChapterIdRef.current;
    if (!textarea || !chapterId) {
      return;
    }

    const caret = caretByChapterRef.current.get(chapterId) ?? {
      start: textarea.value.length,
      end: textarea.value.length,
    };
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(caret.start, caret.end);
  }, []);

  const dismissSelectionToolbar = useCallback(() => {
    setSelectionToolbar(null);
  }, []);

  const syncSelectionToolbar = useCallback(() => {
    const textarea = textareaRef.current;
    if (
      !textarea ||
      mode !== "write" ||
      chapterChooserOpen ||
      document.activeElement !== textarea
    ) {
      setSelectionToolbar(null);
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    if (
      selectionStart === selectionEnd ||
      textarea.value.slice(selectionStart, selectionEnd).trim().length === 0
    ) {
      setSelectionToolbar(null);
      return;
    }

    const selectionRect = measureTextareaSelection(textarea, selectionStart, selectionEnd);
    if (!selectionRect || selectionRect.bottom < 0 || selectionRect.top > window.innerHeight) {
      setSelectionToolbar(null);
      return;
    }

    const toolbarHalfWidth = 76;
    const left = Math.min(
      window.innerWidth - toolbarHalfWidth,
      Math.max(toolbarHalfWidth, selectionRect.left + selectionRect.width / 2),
    );
    const placement = selectionRect.top >= 112 ? "above" : "below";
    setSelectionToolbar({
      left,
      placement,
      selectionEnd,
      selectionStart,
      top: placement === "above" ? selectionRect.top : selectionRect.bottom,
    });
  }, [chapterChooserOpen, mode]);

  useEffect(() => {
    if (!selectionToolbar) {
      return;
    }

    function scheduleReposition() {
      if (selectionRepositionFrameRef.current !== null) {
        cancelAnimationFrame(selectionRepositionFrameRef.current);
      }
      selectionRepositionFrameRef.current = requestAnimationFrame(() => {
        selectionRepositionFrameRef.current = null;
        syncSelectionToolbar();
      });
    }

    const textarea = textareaRef.current;
    const focusScroller = focusScrollRef.current;
    window.addEventListener("resize", scheduleReposition);
    window.addEventListener("scroll", scheduleReposition, { passive: true });
    focusScroller?.addEventListener("scroll", scheduleReposition, { passive: true });
    textarea?.addEventListener("scroll", scheduleReposition, { passive: true });
    return () => {
      window.removeEventListener("resize", scheduleReposition);
      window.removeEventListener("scroll", scheduleReposition);
      focusScroller?.removeEventListener("scroll", scheduleReposition);
      textarea?.removeEventListener("scroll", scheduleReposition);
      if (selectionRepositionFrameRef.current !== null) {
        cancelAnimationFrame(selectionRepositionFrameRef.current);
        selectionRepositionFrameRef.current = null;
      }
    };
  }, [selectionToolbar, syncSelectionToolbar]);

  const applySelectionFormat = useCallback(
    (format: MarkdownSelectionFormat) => {
      const textarea = textareaRef.current;
      if (!textarea || !selectionToolbar) {
        return;
      }

      const result = formatMarkdownSelection(
        textarea.value,
        selectionToolbar.selectionStart,
        selectionToolbar.selectionEnd,
        format,
      );
      if (result.source === textarea.value) {
        return;
      }

      applyUndoableTextareaValue(textarea, result.source);
      setSelectionToolbar(null);
      setDraft(result.source);
      autosaveRef.current?.schedule(result.source);
      const chapterId = currentChapterIdRef.current;
      if (chapterId) {
        caretByChapterRef.current.set(chapterId, {
          start: result.selectionStart,
          end: result.selectionEnd,
        });
      }

      requestAnimationFrame(() => {
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
        requestAnimationFrame(syncSelectionToolbar);
      });
    },
    [selectionToolbar, syncSelectionToolbar],
  );

  useEffect(() => {
    if (mode !== "write" || chapterChooserOpen) {
      dismissSelectionToolbar();
    }
  }, [chapterChooserOpen, dismissSelectionToolbar, mode]);

  const confirmToolTransition = useCallback(
    (nextTool: WorkspaceTool = null) => {
      if (!activeTool || dirtyTool !== activeTool || nextTool === activeTool) {
        return true;
      }

      const label = activeTool === "characters" ? "character" : "chapter arc";
      const confirmed = window.confirm(`Discard the unsaved ${label} changes and continue?`);
      if (confirmed) {
        setDirtyTool(null);
      }
      return confirmed;
    },
    [activeTool, dirtyTool],
  );

  const handleToolDirtyChange = useCallback(
    (tool: Exclude<WorkspaceTool, null>, dirty: boolean) => {
      setDirtyTool((current) => (dirty ? tool : current === tool ? null : current));
    },
    [],
  );

  const switchMode = useCallback(
    async (nextMode: WorkspaceMode, focusEditor = false) => {
      if (mode === nextMode || !currentChapterIdRef.current) {
        if (nextMode === "write" && focusEditor) {
          restoreEditorFocus();
        }
        return;
      }

      const scrollPosition = currentScrollPosition();
      captureCaret();
      if (!(await flushCurrentDraft())) {
        return;
      }
      if (nextMode === "write") {
        const chapter = chaptersRef.current.find((item) => item.id === currentChapterIdRef.current);
        if (chapter) {
          setDraft((current) => withLeadingMarkdownTitle(current, chapter.title));
        }
      }
      dismissSelectionToolbar();
      focusEditorAfterModeChangeRef.current = focusEditor;
      setMode(nextMode);
      requestAnimationFrame(() => {
        restoreCurrentScrollPosition(scrollPosition);
        if (nextMode === "write" && focusEditorAfterModeChangeRef.current) {
          focusEditorAfterModeChangeRef.current = false;
          requestAnimationFrame(restoreEditorFocus);
        }
      });
    },
    [
      captureCaret,
      currentScrollPosition,
      dismissSelectionToolbar,
      flushCurrentDraft,
      mode,
      restoreCurrentScrollPosition,
      restoreEditorFocus,
    ],
  );

  useEffect(() => {
    function handleLifecycleSave() {
      captureCaret();
      void flushCurrentDraft();
      void rememberReadingPosition(true);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        handleLifecycleSave();
      }
    }

    window.addEventListener("pagehide", handleLifecycleSave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", handleLifecycleSave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [captureCaret, flushCurrentDraft, rememberReadingPosition]);

  const selectChapter = useCallback(
    async (chapterId: string, options: { closeChooser?: boolean; updateUrl?: boolean } = {}) => {
      const chapter = chaptersRef.current.find((item) => item.id === chapterId);
      if (!chapter) {
        setMissingChapterId(chapterId);
        currentChapterIdRef.current = null;
        setCurrentChapterId(null);
        setDraft("");
        return false;
      }

      if (chapter.id !== currentChapterIdRef.current) {
        if (!confirmToolTransition() || !(await flushCurrentDraft())) {
          return false;
        }
      }

      await rememberReadingPosition(true);
      autosaveRef.current?.cancel();
      currentChapterIdRef.current = chapter.id;
      dismissSelectionToolbar();
      setCurrentChapterId(chapter.id);
      setMissingChapterId(null);
      setDraft(withLeadingMarkdownTitle(chapter.body, chapter.title));
      setSaveState("clean");
      setSaveError(null);
      restoredInitialPositionRef.current = true;

      if (options.updateUrl !== false) {
        replaceWorkspaceQuery({ chapter: chapter.id, chooser: null });
      }
      if (options.closeChooser !== false) {
        setChapterChooserOpen(false);
      }

      void patchSettings((current) => ({
        ...current,
        activeBookId: bookId,
        lastChapterByBook: {
          ...current.lastChapterByBook,
          [bookId]: chapter.id,
        },
        readingPositionByBook: {
          ...current.readingPositionByBook,
          [bookId]: 0,
        },
      })).catch(() => {
        setSaveError("The last opened chapter could not be remembered.");
      });
      requestAnimationFrame(() => restoreCurrentScrollPosition(0));
      return true;
    },
    [
      bookId,
      confirmToolTransition,
      dismissSelectionToolbar,
      flushCurrentDraft,
      patchSettings,
      rememberReadingPosition,
      restoreCurrentScrollPosition,
    ],
  );

  const closeOverlayQuery = useCallback((overlay: "tool" | "settings" | "chooser") => {
    if (window.history.state?.awthorOverlay === overlay) {
      if (closingOverlayRef.current === overlay) {
        return;
      }
      closingOverlayRef.current = overlay;
      window.history.back();
      return;
    }

    replaceWorkspaceQuery({
      ...(overlay === "tool" ? { tool: null } : {}),
      ...(overlay === "settings" ? { settings: null } : {}),
      ...(overlay === "chooser" ? { chooser: null } : {}),
    });
  }, []);

  const preserveInspectorPosition = useCallback(() => {
    const position = normalizedScrollPosition();
    inspectorPositionRef.current = position;
    requestAnimationFrame(() => {
      if (inspectorPositionRef.current !== position) {
        return;
      }
      inspectorPositionRef.current = null;
      restoreNormalizedScrollPosition(position);
    });
  }, []);

  const handleToolChange = useCallback(
    async (tool: WorkspaceTool) => {
      if (!confirmToolTransition(tool)) {
        return;
      }

      if (!(await flushCurrentDraft())) {
        return;
      }

      preserveInspectorPosition();

      if (tool === activeTool) {
        setActiveTool(null);
        closeOverlayQuery("tool");
        return;
      }

      setSettingsOpen(false);
      setChapterChooserOpen(false);
      setActiveTool(tool);
      if (tool) {
        pushWorkspaceOverlay("tool", { tool, settings: null, chooser: null });
      } else {
        closeOverlayQuery("tool");
      }
    },
    [
      activeTool,
      closeOverlayQuery,
      confirmToolTransition,
      flushCurrentDraft,
      preserveInspectorPosition,
    ],
  );

  const handleSettingsOpenChange = useCallback(
    async (open: boolean) => {
      if (open) {
        if (!confirmToolTransition()) {
          return;
        }
        if (!(await flushCurrentDraft())) {
          return;
        }
        preserveInspectorPosition();
        setActiveTool(null);
        setChapterChooserOpen(false);
        setSettingsOpen(true);
        pushWorkspaceOverlay("settings", { settings: "open", tool: null, chooser: null });
        return;
      }

      preserveInspectorPosition();
      setSettingsOpen(false);
      closeOverlayQuery("settings");
      requestAnimationFrame(() => settingsButtonRef.current?.focus({ preventScroll: true }));
    },
    [closeOverlayQuery, confirmToolTransition, flushCurrentDraft, preserveInspectorPosition],
  );

  const handleChooserOpenChange = useCallback(
    async (open: boolean) => {
      if (open) {
        if (!confirmToolTransition()) {
          return false;
        }
        if (!(await flushCurrentDraft())) {
          return false;
        }
        preserveInspectorPosition();
        setActiveTool(null);
        setSettingsOpen(false);
        setChapterChooserOpen(true);
        pushWorkspaceOverlay("chooser", { chooser: "chapters", tool: null, settings: null });
        return true;
      }

      preserveInspectorPosition();
      setChapterChooserOpen(false);
      closeOverlayQuery("chooser");
      return true;
    },
    [closeOverlayQuery, confirmToolTransition, flushCurrentDraft, preserveInspectorPosition],
  );

  const runWorkspaceCommand = useCallback(
    async (command: WorkspaceCommand): Promise<WorkspaceCommandResult> => {
      if (command.type === "prepare-data-change" || command.type === "leave") {
        captureCaret();
        if (!confirmToolTransition()) {
          return {
            ok: false,
            error: {
              code: "NAVIGATION_BLOCKED",
              message: "Unsaved tool changes kept the current book open.",
            },
          };
        }
        if (!(await flushCurrentDraft())) {
          return {
            ok: false,
            error: {
              code: "SAVE_FAILED",
              message: "The current chapter could not be saved.",
            },
          };
        }
        await rememberReadingPosition(true);
        return { ok: true, type: command.type === "leave" ? "leave" : "prepared" };
      }

      if (command.type === "select-chapter") {
        if (command.bookId !== bookId) {
          return {
            ok: false,
            error: {
              code: "NOT_IN_BOOK",
              message: "The requested chapter belongs to a different open book.",
            },
          };
        }
        if (!chaptersRef.current.some((chapter) => chapter.id === command.chapterId)) {
          const [nextChapters, nextBooks] = await Promise.all([
            repository.chapters.list(bookId),
            repository.books.get(),
          ]);
          updateChapters(nextChapters ?? []);
          updateBook(nextBooks?.find((candidate) => candidate.id === bookId) ?? bookRef.current);
        }
        const selected = await selectChapter(command.chapterId);
        return selected
          ? { ok: true, type: "select-chapter" }
          : {
              ok: false,
              error: {
                code: "NAVIGATION_BLOCKED",
                message: "The requested chapter could not be opened.",
              },
            };
      }

      if (command.type === "select-adjacent-chapter") {
        if (command.bookId !== bookId) {
          return {
            ok: false,
            error: {
              code: "NOT_IN_BOOK",
              message: "The requested chapter belongs to a different open book.",
            },
          };
        }
        const currentIndex = chaptersRef.current.findIndex(
          (chapter) => chapter.id === currentChapterIdRef.current,
        );
        const adjacentChapter =
          currentIndex < 0
            ? null
            : chaptersRef.current[currentIndex + (command.direction === "previous" ? -1 : 1)];
        if (!adjacentChapter) {
          return {
            ok: false,
            error: {
              code: "CHAPTER_NOT_FOUND",
              message: `There is no ${command.direction} chapter in this book.`,
            },
          };
        }
        const selected = await selectChapter(adjacentChapter.id);
        return selected
          ? {
              ok: true,
              type: "select-adjacent-chapter",
              chapter: {
                id: adjacentChapter.id,
                number: adjacentChapter.number,
                title: adjacentChapter.title,
              },
            }
          : {
              ok: false,
              error: {
                code: "NAVIGATION_BLOCKED",
                message: "The adjacent chapter could not be opened.",
              },
            };
      }

      if (command.type === "open-chapter-list") {
        if (command.bookId !== bookId) {
          return {
            ok: false,
            error: {
              code: "NOT_IN_BOOK",
              message: "The requested chapter list belongs to a different open book.",
            },
          };
        }
        if (!chapterChooserOpen && !(await handleChooserOpenChange(true))) {
          return {
            ok: false,
            error: {
              code: "OVERLAY_BLOCKED",
              message: "The chapter list could not be opened.",
            },
          };
        }
        return { ok: true, type: "open-chapter-list" };
      }

      let scrollElement: HTMLElement | null = null;
      if (command.target === "chapter_list") {
        if (!chapterChooserOpen && !(await handleChooserOpenChange(true))) {
          return {
            ok: false,
            error: {
              code: "OVERLAY_BLOCKED",
              message: "The chapter list could not be opened.",
            },
          };
        }
        await nextAnimationFrame();
        scrollElement = document.querySelector<HTMLElement>(
          '[data-awthor-scroll-region="chapter-list"]',
        );
      } else {
        scrollElement =
          focusModeStateRef.current !== "off"
            ? focusScrollRef.current
            : (document.scrollingElement as HTMLElement | null);
      }

      if (!scrollElement) {
        return {
          ok: false,
          error: {
            code: "WORKSPACE_UNAVAILABLE",
            message: "The requested scroll area is not available on this page.",
          },
        };
      }

      const maxScroll = Math.max(scrollElement.scrollHeight - scrollElement.clientHeight, 0);
      const from = maxScroll === 0 ? 0 : scrollElement.scrollTop / maxScroll;
      const distanceFactor =
        command.distance === "small" ? 0.25 : command.distance === "half_page" ? 0.5 : 0.85;
      const distance = scrollElement.clientHeight * distanceFactor;
      const targetTop =
        command.action === "start"
          ? 0
          : command.action === "end"
            ? maxScroll
            : Math.min(
                maxScroll,
                Math.max(
                  0,
                  scrollElement.scrollTop + (command.action === "down" ? distance : -distance),
                ),
              );

      scrollElement.scrollTo({ behavior: "auto", top: targetTop });
      const to = maxScroll === 0 ? 0 : targetTop / maxScroll;
      return {
        ok: true,
        type: "scroll",
        target: command.target,
        from,
        to,
        atStart: targetTop <= 0,
        atEnd: maxScroll === 0 || targetTop >= maxScroll,
      };
    },
    [
      bookId,
      captureCaret,
      chapterChooserOpen,
      confirmToolTransition,
      flushCurrentDraft,
      handleChooserOpenChange,
      rememberReadingPosition,
      repository,
      selectChapter,
      updateBook,
      updateChapters,
    ],
  );

  useEffect(() => {
    function handleWorkspaceCommand(event: Event) {
      respondToWorkspaceCommand(event, runWorkspaceCommand);
    }

    window.addEventListener(workspaceCommandEventName, handleWorkspaceCommand);
    return () => window.removeEventListener(workspaceCommandEventName, handleWorkspaceCommand);
  }, [runWorkspaceCommand]);

  const refreshWorkspaceFromRepository = useCallback(async () => {
    const scrollPosition = currentScrollPosition();
    const activeChapterId = currentChapterIdRef.current;
    const data = await repository.getData();
    const nextBook = data.books.find((item) => item.id === bookId) ?? null;

    updateSettings(data.settings);
    setDocumentLayout(data.settings.editor.layout);
    setProofreadingPreferences(
      resolveBookProofreadingSettings(data.settings, data.profile, bookId),
    );

    if (!nextBook) {
      autosaveRef.current?.cancel();
      updateBook(null);
      updateChapters([]);
      currentChapterIdRef.current = null;
      setCurrentChapterId(null);
      setDraft("");
      setLoadState("book-missing");
      return;
    }

    const nextChapters = data.chapters[bookId] ?? [];
    const selectedChapter =
      nextChapters.find((chapter) => chapter.id === activeChapterId) ?? nextChapters[0] ?? null;
    autosaveRef.current?.cancel();
    updateBook(nextBook);
    updateChapters(nextChapters);
    currentChapterIdRef.current = selectedChapter?.id ?? null;
    setCurrentChapterId(selectedChapter?.id ?? null);
    setMissingChapterId(null);
    setDraft(
      selectedChapter ? withLeadingMarkdownTitle(selectedChapter.body, selectedChapter.title) : "",
    );
    setSaveError(null);
    setSaveState("clean");
    setLoadState("ready");

    if (selectedChapter) {
      replaceWorkspaceQuery({ chapter: selectedChapter.id });
    }
    requestAnimationFrame(() => restoreCurrentScrollPosition(scrollPosition));
  }, [
    bookId,
    currentScrollPosition,
    repository,
    restoreCurrentScrollPosition,
    updateBook,
    updateChapters,
    updateSettings,
  ]);

  useEffect(() => {
    function handleRepositoryChanged(event: Event) {
      const change = readRepositoryChange(event);
      if (!change || (change.bookId && change.bookId !== bookId)) {
        return;
      }

      if (change.operation === "import-data") {
        setActiveTool(null);
        setSettingsOpen(false);
        setChapterChooserOpen(false);
        setMode("read");
        replaceWorkspaceQuery({ chooser: null, settings: null, tool: null });
      }

      void refreshWorkspaceFromRepository().catch((reason) => {
        setSaveError(
          reason instanceof Error
            ? reason.message
            : "The updated local book could not be refreshed.",
        );
        setSaveState("error");
      });
    }

    window.addEventListener(repositoryChangedEventName, handleRepositoryChanged);
    return () => window.removeEventListener(repositoryChangedEventName, handleRepositoryChanged);
  }, [bookId, refreshWorkspaceFromRepository]);

  const clearFullscreenVerification = useCallback(() => {
    if (fullscreenVerificationTimerRef.current) {
      clearTimeout(fullscreenVerificationTimerRef.current);
      fullscreenVerificationTimerRef.current = null;
    }
  }, []);

  const finishFocusModeExit = useCallback(() => {
    clearFullscreenVerification();
    const position =
      pendingFocusExitPositionRef.current ??
      (focusScrollRef.current ? normalizedElementScrollPosition(focusScrollRef.current) : 0);
    pendingFocusExitPositionRef.current = null;
    focusModeStateRef.current = "off";
    setFocusModeState("off");

    requestAnimationFrame(() => {
      restoreNormalizedScrollPosition(position);
      if (mode === "write") {
        requestAnimationFrame(restoreEditorFocus);
      }
    });
  }, [clearFullscreenVerification, mode, restoreEditorFocus]);

  const exitFocusMode = useCallback(async () => {
    if (focusModeStateRef.current === "off") {
      return;
    }

    captureCaret();
    pendingFocusExitPositionRef.current = currentScrollPosition();
    void flushCurrentDraft();
    void rememberReadingPosition(true);

    if (document.fullscreenElement === workspaceRootRef.current) {
      try {
        await document.exitFullscreen();
      } catch {
        finishFocusModeExit();
      }
      return;
    }

    finishFocusModeExit();
  }, [
    captureCaret,
    currentScrollPosition,
    finishFocusModeExit,
    flushCurrentDraft,
    rememberReadingPosition,
  ]);

  const enterFocusMode = useCallback(() => {
    const workspaceRoot = workspaceRootRef.current;
    if (
      !workspaceRoot ||
      !currentChapterIdRef.current ||
      focusModeStateRef.current !== "off" ||
      activeTool ||
      settingsOpen ||
      chapterChooserOpen
    ) {
      return;
    }

    captureCaret();
    dismissSelectionToolbar();
    focusEntryPositionRef.current = normalizedScrollPosition();
    pendingFocusExitPositionRef.current = null;

    let fullscreenRequest: Promise<void> | null = null;
    if (document.fullscreenEnabled) {
      try {
        fullscreenRequest = workspaceRoot.requestFullscreen();
      } catch {
        fullscreenRequest = null;
      }
    }

    void flushCurrentDraft();
    void patchSettings((current) => ({
      ...current,
      readingPositionByBook: {
        ...current.readingPositionByBook,
        [bookId]: focusEntryPositionRef.current,
      },
    })).catch(() => {
      setSaveError("The reading position could not be saved on this device.");
    });

    const nextState: FocusModeState = fullscreenRequest ? "pending" : "fallback";
    focusModeStateRef.current = nextState;
    setFocusModeState(nextState);

    if (fullscreenRequest) {
      fullscreenVerificationTimerRef.current = setTimeout(() => {
        fullscreenVerificationTimerRef.current = null;
        if (focusModeStateRef.current !== "off" && document.fullscreenElement !== workspaceRoot) {
          focusModeStateRef.current = "fallback";
          setFocusModeState("fallback");
        }
      }, 750);
    }

    fullscreenRequest
      ?.then(() => {
        if (focusModeStateRef.current === "off") {
          return;
        }
        const resolvedState: FocusModeState =
          document.fullscreenElement === workspaceRoot ? "native" : "fallback";
        focusModeStateRef.current = resolvedState;
        setFocusModeState(resolvedState);
      })
      .catch(() => {
        clearFullscreenVerification();
        if (focusModeStateRef.current !== "off") {
          focusModeStateRef.current = "fallback";
          setFocusModeState("fallback");
        }
      });
  }, [
    activeTool,
    bookId,
    captureCaret,
    chapterChooserOpen,
    clearFullscreenVerification,
    dismissSelectionToolbar,
    flushCurrentDraft,
    patchSettings,
    settingsOpen,
  ]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (document.fullscreenElement === workspaceRootRef.current) {
        focusModeStateRef.current = "native";
        setFocusModeState("native");
        return;
      }

      if (focusModeStateRef.current === "native") {
        finishFocusModeExit();
      }
    }

    function handleFullscreenError() {
      if (focusModeStateRef.current !== "off") {
        focusModeStateRef.current = "fallback";
        setFocusModeState("fallback");
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("fullscreenerror", handleFullscreenError);
    return () => {
      clearFullscreenVerification();
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("fullscreenerror", handleFullscreenError);
      if (document.fullscreenElement === workspaceRootRef.current) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [clearFullscreenVerification, finishFocusModeExit]);

  useEffect(() => {
    if (!focusMode) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      if (focusScrollRef.current) {
        restoreNormalizedElementScrollPosition(
          focusScrollRef.current,
          focusEntryPositionRef.current,
        );
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [focusMode]);

  useEffect(() => {
    async function handlePopState() {
      closingOverlayRef.current = null;
      const query = readWorkspaceQuery();
      if (!confirmToolTransition(query.tool)) {
        pushWorkspaceOverlay("tool", {
          tool: activeTool,
          settings: null,
          chooser: null,
        });
        return;
      }
      const overlayChanged =
        query.tool !== activeTool ||
        query.settingsOpen !== settingsOpen ||
        query.chapterChooserOpen !== chapterChooserOpen;
      if (overlayChanged && !(await flushCurrentDraft())) {
        if (activeTool) {
          pushWorkspaceOverlay("tool", { tool: activeTool, settings: null, chooser: null });
        } else if (settingsOpen) {
          pushWorkspaceOverlay("settings", { settings: "open", tool: null, chooser: null });
        } else if (chapterChooserOpen) {
          pushWorkspaceOverlay("chooser", { chooser: "chapters", tool: null, settings: null });
        } else {
          replaceWorkspaceQuery({ tool: null, settings: null, chooser: null });
        }
        return;
      }
      if (overlayChanged) {
        preserveInspectorPosition();
      }
      setActiveTool(query.tool);
      setSettingsOpen(query.settingsOpen);
      setChapterChooserOpen(query.chapterChooserOpen);
      if (query.chapterId && query.chapterId !== currentChapterIdRef.current) {
        await selectChapter(query.chapterId, { closeChooser: false, updateUrl: false });
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    activeTool,
    chapterChooserOpen,
    confirmToolTransition,
    flushCurrentDraft,
    preserveInspectorPosition,
    selectChapter,
    settingsOpen,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }

      if (
        mode === "write" &&
        selectionToolbar &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        (event.code === "KeyB" || event.code === "KeyI")
      ) {
        event.preventDefault();
        applySelectionFormat(event.code === "KeyB" ? "bold" : "italic");
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.code === "KeyS") {
        event.preventDefault();
        captureCaret();
        void flushCurrentDraft();
        return;
      }

      if (event.altKey && !event.metaKey && !event.ctrlKey && !event.repeat) {
        if (event.code === "KeyW") {
          event.preventDefault();
          void switchMode("write", true);
          return;
        }
        if (event.code === "KeyR") {
          event.preventDefault();
          void switchMode("read");
          return;
        }
        if (event.code === "KeyT") {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent("awthor:reveal-tools"));
          return;
        }
      }

      if (event.key !== "Escape") {
        return;
      }

      if (focusMode) {
        event.preventDefault();
        void exitFocusMode();
      } else if (selectionToolbar) {
        event.preventDefault();
        dismissSelectionToolbar();
        restoreEditorFocus();
      } else if (activeTool) {
        event.preventDefault();
        void handleToolChange(null);
      } else if (chapterChooserOpen) {
        event.preventDefault();
        void handleChooserOpenChange(false);
      } else if (settingsOpen) {
        event.preventDefault();
        void handleSettingsOpenChange(false);
      } else if (mode === "write") {
        event.preventDefault();
        void switchMode("read");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTool,
    applySelectionFormat,
    captureCaret,
    chapterChooserOpen,
    dismissSelectionToolbar,
    exitFocusMode,
    flushCurrentDraft,
    focusMode,
    handleChooserOpenChange,
    handleSettingsOpenChange,
    handleToolChange,
    mode,
    restoreEditorFocus,
    selectionToolbar,
    settingsOpen,
    switchMode,
  ]);

  async function navigateBack() {
    captureCaret();
    if (!confirmToolTransition()) {
      return;
    }
    if (!(await flushCurrentDraft())) {
      return;
    }
    await rememberReadingPosition(true);
    router.push("/books");
  }

  function changeDraft(event: ChangeEvent<HTMLTextAreaElement>) {
    const markdown = event.target.value;
    setSelectionToolbar(null);
    setDraft(markdown);
    autosaveRef.current?.schedule(markdown);
  }

  function handleEditorSelection() {
    captureCaret();
    syncSelectionToolbar();
  }

  function handleEditorBlur(event: ReactFocusEvent<HTMLTextAreaElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Element && nextTarget.closest("[data-selection-toolbar]")) {
      return;
    }
    dismissSelectionToolbar();
  }

  function rememberCaretFromKeyboard(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
      captureCaret();
    }
  }

  async function refreshBookAggregate() {
    const books = (await repository.books.get()) ?? [];
    updateBook(books.find((item) => item.id === bookId) ?? null);
  }

  async function addChapter() {
    if (!(await flushCurrentDraft())) {
      throw new Error("Save the current chapter before adding another one.");
    }
    const chapter = await repository.createChapter(bookId, {
      title: `Chapter ${chaptersRef.current.length + 1}`,
    });
    updateChapters([...chaptersRef.current, chapter]);
    await refreshBookAggregate();
    await selectChapter(chapter.id);
  }

  async function renameChapter(chapterId: string, title: string) {
    const updated = await repository.updateChapter(bookId, chapterId, { title });
    updateChapters(
      chaptersRef.current.map((chapter) => (chapter.id === updated.id ? updated : chapter)),
    );
    if (updated.id === currentChapterIdRef.current) {
      setDraft(updated.body);
    }
  }

  async function moveChapter(chapterId: string, direction: -1 | 1) {
    const currentIndex = chaptersRef.current.findIndex((chapter) => chapter.id === chapterId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= chaptersRef.current.length) {
      return;
    }
    const reordered = [...chaptersRef.current];
    const [chapter] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, chapter);
    updateChapters(
      await repository.reorderChapters(
        bookId,
        reordered.map((item) => item.id),
      ),
    );
  }

  async function deleteChapter(chapterId: string) {
    if (chapterId === currentChapterIdRef.current && !(await flushCurrentDraft())) {
      throw new Error("Save the current chapter before deleting it.");
    }
    const currentIndex = chaptersRef.current.findIndex((chapter) => chapter.id === chapterId);
    await repository.deleteChapter(bookId, chapterId);
    const nextChapters = (await repository.chapters.list(bookId)) ?? [];
    updateChapters(nextChapters);
    await refreshBookAggregate();

    if (chapterId === currentChapterIdRef.current) {
      const replacement = nextChapters[Math.min(currentIndex, nextChapters.length - 1)];
      if (replacement) {
        await selectChapter(replacement.id);
      }
    }
  }

  function applyToolDraft(markdown: string) {
    setDraft(markdown);
    autosaveRef.current?.schedule(markdown);
  }

  async function saveProofreadingPreferences(nextPreferences: BookProofreadingSettings) {
    await patchSettings((current) => ({
      ...current,
      proofreadingByBook: {
        ...current.proofreadingByBook,
        [bookId]: nextPreferences,
      },
    }));
    setProofreadingPreferences(nextPreferences);
  }

  function updateChapterFromTool(updated: Chapter) {
    updateChapters(
      chaptersRef.current.map((chapter) => (chapter.id === updated.id ? updated : chapter)),
    );
    const nextDraft = withLeadingMarkdownTitle(updated.body, updated.title);
    if (updated.id === currentChapterIdRef.current && nextDraft !== draft) {
      setDraft(nextDraft);
    }
  }

  if (loadState === "loading") {
    return <WorkspaceLoading />;
  }

  if (loadState === "migration-error") {
    return (
      <WorkspaceProblem
        actionLabel="Retry upgrade"
        description={loadError ?? "Your previous local data could not be upgraded safely."}
        onAction={() => void loadWorkspace(true)}
        title="Local data needs attention"
      />
    );
  }

  if (loadState === "storage-error") {
    return (
      <WorkspaceProblem
        actionLabel="Try again"
        description={loadError ?? "Awthor could not read this browser's local storage."}
        onAction={() => void loadWorkspace()}
        title="This book could not be opened"
      />
    );
  }

  if (loadState === "book-missing" || !book || !exportSnapshot) {
    return (
      <WorkspaceProblem
        actionLabel="Return to books"
        description="This book is not stored in this browser. It may have been removed or belong to another device."
        onAction={() => router.push("/books")}
        title="Book not found"
      />
    );
  }

  const chapterLabel = currentChapter
    ? `Chapter ${String(currentChapter.number).padStart(2, "0")}`
    : "No chapter selected";

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground",
        focusMode && "h-dvh min-h-0 overflow-hidden",
      )}
      ref={workspaceRootRef}
    >
      {!focusMode ? (
        <AppTopBar
          center={
            <div className="flex items-center gap-1">
              <Button
                aria-label="Previous chapter"
                disabled={!previousChapter}
                onClick={() => previousChapter && void selectChapter(previousChapter.id)}
                size="icon-sm"
                title="Previous chapter"
                variant="ghost"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                aria-label="Choose chapter"
                className="max-w-[12rem] px-2 sm:max-w-[20rem]"
                onClick={() => void handleChooserOpenChange(true)}
                size="sm"
                variant="ghost"
              >
                <span className="truncate">
                  <span className="hidden sm:inline">{chapterLabel} · </span>
                  {currentChapter?.title ?? "Chapters"}
                </span>
                <ChevronDown aria-hidden="true" />
              </Button>
              <Button
                aria-label="Next chapter"
                disabled={!nextChapter}
                onClick={() => nextChapter && void selectChapter(nextChapter.id)}
                size="icon-sm"
                title="Next chapter"
                variant="ghost"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          }
          left={
            <div className="flex min-w-0 items-center gap-1 sm:gap-3">
              <Button
                aria-label="Back to all books"
                onClick={() => void navigateBack()}
                size="icon-sm"
                title="Back to all books"
                variant="ghost"
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
              <span className="hidden max-w-48 truncate text-sm font-medium lg:block">
                {book.title}
              </span>
            </div>
          }
          right={
            <div className="flex items-center gap-1.5">
              <SaveIndicator
                error={saveError}
                onRetry={() => void flushCurrentDraft()}
                state={saveState}
              />
              <SyncControl variant="navbar" />
              <AccountMenu />
              <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5">
                <Button
                  aria-keyshortcuts="Alt+R"
                  aria-pressed={mode === "read"}
                  className={cn(
                    "h-7 rounded-lg px-2",
                    mode === "read" && "bg-background shadow-sm",
                  )}
                  onClick={() => void switchMode("read")}
                  size="sm"
                  title="Read (Alt/Option+R)"
                  variant="ghost"
                >
                  <BookOpen aria-hidden="true" />
                  <span className="hidden xl:inline">Read</span>
                </Button>
                <Button
                  aria-keyshortcuts="Alt+W"
                  aria-pressed={mode === "write"}
                  className={cn(
                    "h-7 rounded-lg px-2",
                    mode === "write" && "bg-background shadow-sm",
                  )}
                  onClick={() => void switchMode("write", true)}
                  size="sm"
                  title="Write (Alt/Option+W)"
                  variant="ghost"
                >
                  <PenLine aria-hidden="true" />
                  <span className="hidden xl:inline">Write</span>
                </Button>
              </div>
              <BookExport snapshot={exportSnapshot} />
              <Button
                aria-label="Enter focus mode"
                disabled={!currentChapter}
                onClick={enterFocusMode}
                size="icon-sm"
                title="Enter focus mode"
                variant="ghost"
              >
                <Maximize2 aria-hidden="true" />
              </Button>
              <Button
                aria-label="Author and app settings"
                aria-pressed={settingsOpen}
                onClick={() => void handleSettingsOpenChange(true)}
                ref={settingsButtonRef}
                size="icon-sm"
                title="Settings"
                variant="ghost"
              >
                <Settings2 aria-hidden="true" />
              </Button>
            </div>
          }
        />
      ) : null}

      <main
        className={cn(
          "mx-auto w-full px-5 sm:px-8 lg:px-12",
          focusMode
            ? "h-dvh min-h-0 max-w-none overflow-y-auto overscroll-contain pt-12 pb-32 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:pt-16"
            : "min-h-screen max-w-[72rem] pt-28 pb-40 sm:pt-32",
          inspectorOpen &&
            "min-[72rem]:mr-[var(--workspace-inspector-width)] min-[72rem]:ml-auto min-[72rem]:max-w-[min(72rem,calc(100%-var(--workspace-inspector-width)))]",
        )}
        ref={focusScrollRef}
      >
        {currentChapter ? (
          <article
            aria-label={`${chapterLabel}: ${currentChapter.title}`}
            className={cn(
              "mx-auto w-full",
              mode === "read" && documentLayout === "pages" ? "max-w-none" : "max-w-[68ch]",
            )}
            ref={articleRef}
          >
            <div
              className="animate-in fade-in duration-150 motion-reduce:animate-none motion-reduce:duration-0"
              key={`${mode}-${documentLayout}`}
            >
              {mode === "read" && documentLayout === "pages" ? (
                <PagedManuscript
                  chapterLabel={chapterLabel}
                  onPaginated={restorePendingLayoutPosition}
                  source={withoutLeadingMarkdownTitle(draft)}
                  title={currentChapter.title}
                />
              ) : (
                <>
                  <header className={cn(mode === "read" ? "mb-10" : "mb-5")}>
                    <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                      {chapterLabel}
                    </p>
                    {mode === "read" ? (
                      <h1 className="manuscript-reader mt-5 font-serif text-4xl leading-tight font-medium tracking-[-0.035em] sm:text-5xl">
                        {currentChapter.title}
                      </h1>
                    ) : null}
                  </header>
                  {mode === "read" ? (
                    draft.trim() ? (
                      <div className="manuscript-reader font-serif text-[1.12rem] leading-[1.82] sm:text-[1.2rem]">
                        <MarkdownManuscript source={withoutLeadingMarkdownTitle(draft)} />
                      </div>
                    ) : (
                      <EmptyManuscript />
                    )
                  ) : (
                    <textarea
                      aria-label={`Markdown source for ${currentChapter.title}`}
                      className="manuscript-editor field-sizing-content min-h-[62vh] w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-mono text-base leading-[1.75] text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none sm:text-[1.05rem]"
                      onBlur={handleEditorBlur}
                      onChange={changeDraft}
                      onClick={handleEditorSelection}
                      onKeyUp={rememberCaretFromKeyboard}
                      onSelect={handleEditorSelection}
                      placeholder="# Begin this chapter…"
                      ref={textareaRef}
                      spellCheck
                      value={draft}
                    />
                  )}
                </>
              )}
            </div>

            {mode === "read" && !focusMode && (previousChapter || nextChapter) ? (
              <nav
                aria-label="Chapter navigation"
                className={cn(
                  "mt-20 flex items-center justify-between gap-4 border-t border-border pt-6",
                  documentLayout === "pages" && "mx-auto max-w-[51rem]",
                )}
              >
                <Button
                  disabled={!previousChapter}
                  onClick={() => previousChapter && void selectChapter(previousChapter.id)}
                  variant="ghost"
                >
                  <ChevronLeft aria-hidden="true" data-icon="inline-start" />
                  <span className="max-w-40 truncate">
                    {previousChapter?.title ?? "Previous chapter"}
                  </span>
                </Button>
                <Button
                  disabled={!nextChapter}
                  onClick={() => nextChapter && void selectChapter(nextChapter.id)}
                  variant="ghost"
                >
                  <span className="max-w-40 truncate">{nextChapter?.title ?? "Next chapter"}</span>
                  <ChevronRight aria-hidden="true" data-icon="inline-end" />
                </Button>
              </nav>
            ) : null}
          </article>
        ) : (
          <MissingChapter
            hasChapters={chapters.length > 0}
            missingChapterId={missingChapterId}
            onCreate={() => void addChapter()}
            onOpenFirst={() => chapters[0] && void selectChapter(chapters[0].id)}
          />
        )}
      </main>

      {mode === "write" && selectionToolbar ? (
        <SelectionFormatToolbar
          onDismiss={dismissSelectionToolbar}
          onFormat={applySelectionFormat}
          position={selectionToolbar}
        />
      ) : null}

      {currentChapter && mode === "read" && documentLayout === "seamless" && !focusMode ? (
        <ChapterProgressRail inspectorOpen={inspectorOpen} targetRef={articleRef} />
      ) : null}

      {currentChapter && !focusMode ? (
        <BookFloatingToolbar
          activeTool={activeTool}
          bookId={book.id}
          chapters={chapters}
          currentChapterId={currentChapter.id}
          documentLayout={documentLayout}
          draft={draft}
          inspectorOpen={inspectorOpen}
          mode={mode}
          onActiveToolChange={(tool: WorkspaceTool) => void handleToolChange(tool)}
          onApplyDraft={applyToolDraft}
          onBeforeToolOpen={async () => {
            if (!(await flushCurrentDraft())) {
              throw new Error("The current chapter could not be saved.");
            }
          }}
          onChapterUpdated={updateChapterFromTool}
          onDocumentLayoutChange={changeDocumentLayout}
          onRequestWrite={() => void switchMode("write", true)}
          onRestoreEditorFocus={restoreEditorFocus}
          onToolDirtyChange={handleToolDirtyChange}
          onProofreadingPreferencesChange={saveProofreadingPreferences}
          proofreadingPreferences={proofreadingPreferences}
        />
      ) : null}

      <ChapterChooser
        chapters={chapters}
        currentChapterId={currentChapterId}
        onAdd={addChapter}
        onDelete={deleteChapter}
        onMove={moveChapter}
        onOpenChange={(open) => void handleChooserOpenChange(open)}
        onRename={renameChapter}
        onSelect={async (chapterId) => {
          await selectChapter(chapterId);
        }}
        open={chapterChooserOpen}
      />
      <SettingsInspector
        onOpenChange={(open) => void handleSettingsOpenChange(open)}
        onSaved={(profile) => {
          if (!settingsRef.current?.proofreadingByBook[bookId]) {
            setProofreadingPreferences(
              createDefaultBookProofreadingSettings(profile.defaultProofreadingDialect),
            );
          }
        }}
        open={settingsOpen}
      />

      {focusMode ? (
        <FocusModeControls fallback={focusModeState === "fallback"} onExit={exitFocusMode} />
      ) : null}

      <p aria-live="polite" className="sr-only">
        {saveState === "error"
          ? saveError
          : saveState === "saved"
            ? "Manuscript saved locally."
            : ""}
      </p>
    </div>
  );
}

function SaveIndicator({
  error,
  onRetry,
  state,
}: {
  error: string | null;
  onRetry: () => void;
  state: SaveState;
}) {
  const labels: Record<SaveState, string> = {
    clean: "Saved locally",
    dirty: "Unsaved changes",
    error: "Not saved",
    loading: "Loading",
    saved: "Saved locally",
    saving: "Saving",
  };
  const Icon =
    state === "saving" || state === "loading"
      ? LoaderCircle
      : state === "error"
        ? AlertCircle
        : CheckCircle2;

  if (state === "error") {
    return (
      <Button
        aria-label={`Retry saving manuscript${error ? `: ${error}` : ""}`}
        onClick={onRetry}
        size="xs"
        title={error ?? "Retry saving manuscript"}
        variant="destructive"
      >
        <AlertCircle aria-hidden="true" />
        <span className="hidden lg:inline">Retry save</span>
      </Button>
    );
  }

  return (
    <span
      className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"
      title={error ?? labels[state]}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-3.5", (state === "saving" || state === "loading") && "animate-spin")}
      />
      <span className="hidden lg:inline">{labels[state]}</span>
    </span>
  );
}

function WorkspaceLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppTopBar
        left={
          <div className="h-7 w-28 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        }
        right={
          <div className="h-7 w-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        }
      />
      <main className="mx-auto max-w-[68ch] px-5 pt-32">
        <p className="flex items-center justify-center gap-2 py-32 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Opening this book…
        </p>
      </main>
    </div>
  );
}

function WorkspaceProblem({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel: string;
  description: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppTopBar
        left={
          <Button onClick={() => window.location.assign("/books")} size="sm" variant="ghost">
            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
            All books
          </Button>
        }
        right={<span className="text-xs text-muted-foreground">Stored on this device</span>}
      />
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-24 text-center">
        <section className="w-full rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <AlertCircle aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-medium tracking-[-0.03em]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          <Button className="mt-7" onClick={onAction}>
            {actionLabel.includes("Retry") || actionLabel.includes("again") ? (
              <RefreshCw aria-hidden="true" data-icon="inline-start" />
            ) : (
              <ArrowLeft aria-hidden="true" data-icon="inline-start" />
            )}
            {actionLabel}
          </Button>
        </section>
      </main>
    </div>
  );
}

function MissingChapter({
  hasChapters,
  missingChapterId,
  onCreate,
  onOpenFirst,
}: {
  hasChapters: boolean;
  missingChapterId: string | null;
  onCreate: () => void;
  onOpenFirst: () => void;
}) {
  return (
    <section className="mx-auto max-w-lg py-28 text-center">
      <BookOpen aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
      <h1 className="mt-5 font-heading text-3xl font-medium">
        {hasChapters ? "Chapter not found" : "Start the first chapter"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {hasChapters
          ? `The chapter${missingChapterId ? ` “${missingChapterId}”` : ""} is no longer in this book.`
          : "This book does not have a chapter yet. Create one to begin writing."}
      </p>
      <Button className="mt-7" onClick={hasChapters ? onOpenFirst : onCreate}>
        {hasChapters ? "Open first chapter" : "Create first chapter"}
      </Button>
    </section>
  );
}

const mirroredTextareaProperties = [
  "border-bottom-width",
  "border-left-width",
  "border-right-width",
  "border-top-width",
  "box-sizing",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "letter-spacing",
  "line-height",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "tab-size",
  "text-align",
  "text-indent",
  "text-transform",
  "word-spacing",
] as const;

function measureTextareaSelection(
  textarea: HTMLTextAreaElement,
  selectionStart: number,
  selectionEnd: number,
): DOMRect | null {
  const textareaRect = textarea.getBoundingClientRect();
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");

  mirror.setAttribute("aria-hidden", "true");
  Object.assign(mirror.style, {
    height: `${textareaRect.height}px`,
    left: `${textareaRect.left}px`,
    overflow: "hidden",
    overflowWrap: "break-word",
    pointerEvents: "none",
    position: "fixed",
    top: `${textareaRect.top}px`,
    visibility: "hidden",
    whiteSpace: textarea.wrap === "off" ? "pre" : "pre-wrap",
    width: `${textareaRect.width}px`,
  });
  for (const property of mirroredTextareaProperties) {
    mirror.style.setProperty(property, computed.getPropertyValue(property));
  }

  const selectedFirstLine = textarea.value.slice(selectionStart, selectionEnd).split(/\r?\n/u)[0];
  marker.textContent = selectedFirstLine || "\u200b";
  mirror.append(document.createTextNode(textarea.value.slice(0, selectionStart)), marker);
  document.body.append(mirror);
  mirror.scrollTop = textarea.scrollTop;
  mirror.scrollLeft = textarea.scrollLeft;

  const markerRect = marker.getClientRects()[0] ?? marker.getBoundingClientRect();
  mirror.remove();
  return markerRect.width || markerRect.height ? markerRect : null;
}

/** Uses the browser's editing transaction so Cmd/Ctrl+Z can undo contextual formatting. */
function applyUndoableTextareaValue(textarea: HTMLTextAreaElement, nextValue: string) {
  const currentValue = textarea.value;
  let prefixLength = 0;
  while (
    prefixLength < currentValue.length &&
    prefixLength < nextValue.length &&
    currentValue[prefixLength] === nextValue[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < currentValue.length - prefixLength &&
    suffixLength < nextValue.length - prefixLength &&
    currentValue[currentValue.length - suffixLength - 1] ===
      nextValue[nextValue.length - suffixLength - 1]
  ) {
    suffixLength += 1;
  }

  const replacementEnd = currentValue.length - suffixLength;
  const replacement = nextValue.slice(prefixLength, nextValue.length - suffixLength);

  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(prefixLength, replacementEnd);

  try {
    document.execCommand("insertText", false, replacement);
  } catch {
    // The controlled value update below remains the fallback for unsupported browsers.
  }
}

type QueryPatch = {
  chapter?: string | null;
  chooser?: "chapters" | null;
  settings?: "open" | null;
  tool?: WorkspaceTool;
};

function readWorkspaceQuery(): {
  chapterId: string | null;
  chapterChooserOpen: boolean;
  settingsOpen: boolean;
  tool: WorkspaceTool;
} {
  const params = new URL(window.location.href).searchParams;
  const toolValue = params.get("tool");
  return {
    chapterId: params.get("chapter"),
    chapterChooserOpen: params.get("chooser") === "chapters",
    settingsOpen: params.get("settings") === "open",
    tool:
      toolValue && toolValues.has(toolValue as Exclude<WorkspaceTool, null>)
        ? (toolValue as Exclude<WorkspaceTool, null>)
        : null,
  };
}

function updateQueryUrl(patch: QueryPatch): string {
  const url = new URL(window.location.href);
  const changes = [
    ["chapter", patch.chapter],
    ["chooser", patch.chooser],
    ["settings", patch.settings],
    ["tool", patch.tool],
  ] as const;

  for (const [key, value] of changes) {
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function replaceWorkspaceQuery(patch: QueryPatch) {
  window.history.replaceState(window.history.state, "", updateQueryUrl(patch));
}

function pushWorkspaceOverlay(overlay: "tool" | "settings" | "chooser", patch: QueryPatch) {
  const nextUrl = updateQueryUrl(patch);
  if (window.history.state?.awthorOverlay) {
    window.history.replaceState({ ...window.history.state, awthorOverlay: overlay }, "", nextUrl);
  } else {
    window.history.pushState({ ...window.history.state, awthorOverlay: overlay }, "", nextUrl);
  }
}

function normalizedScrollPosition(): number {
  const scrollableHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  return scrollableHeight === 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / scrollableHeight));
}

function normalizedElementScrollPosition(element: HTMLElement): number {
  const scrollableHeight = Math.max(element.scrollHeight - element.clientHeight, 0);
  return scrollableHeight === 0
    ? 0
    : Math.min(1, Math.max(0, element.scrollTop / scrollableHeight));
}

function restoreNormalizedScrollPosition(position: number) {
  const scrollableHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  window.scrollTo({ top: scrollableHeight * Math.min(1, Math.max(0, position)) });
}

function restoreNormalizedElementScrollPosition(element: HTMLElement, position: number) {
  const scrollableHeight = Math.max(element.scrollHeight - element.clientHeight, 0);
  element.scrollTo({ top: scrollableHeight * Math.min(1, Math.max(0, position)) });
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
