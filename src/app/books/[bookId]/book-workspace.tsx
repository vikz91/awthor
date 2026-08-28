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
  PenLine,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppTopBar } from "@/components/app-top-bar";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import {
  type AppSettings,
  type Book,
  type Chapter,
  createManuscriptAutosave,
  getAwthorRepository,
  type ManuscriptAutosave,
  type SaveState,
  type WorkspaceMode,
  type WorkspaceTool,
} from "@/lib/repository";
import { cn } from "@/lib/utils";
import { BookFloatingToolbar } from "./book-floating-toolbar";
import { ChapterChooser } from "./chapter-chooser";
import { EmptyManuscript, MarkdownManuscript } from "./markdown-manuscript";

type BookWorkspaceProps = {
  bookId: string;
};

type LoadState = "loading" | "ready" | "migration-error" | "storage-error" | "book-missing";

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

  const autosaveRef = useRef<ManuscriptAutosave | null>(null);
  const bookRef = useRef<Book | null>(null);
  const chaptersRef = useRef<Chapter[]>([]);
  const currentChapterIdRef = useRef<string | null>(null);
  const settingsRef = useRef<AppSettings | null>(null);
  const settingsWriteTailRef = useRef<Promise<void>>(Promise.resolve());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const caretByChapterRef = useRef(new Map<string, { start: number; end: number }>());
  const focusEditorAfterModeChangeRef = useRef(false);
  const restoredInitialPositionRef = useRef(false);
  const scrollingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingOverlayRef = useRef<"tool" | "settings" | "chooser" | null>(null);

  const currentChapter = chapters.find((chapter) => chapter.id === currentChapterId) ?? null;
  const currentChapterIndex = currentChapter
    ? chapters.findIndex((chapter) => chapter.id === currentChapter.id)
    : -1;
  const previousChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1
      ? chapters[currentChapterIndex + 1]
      : null;

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
        currentChapterIdRef.current = selectedChapter?.id ?? null;
        setCurrentChapterId(selectedChapter?.id ?? null);
        setMissingChapterId(requestedChapter && !selectedChapter ? requestedChapter : null);
        setDraft(selectedChapter?.body ?? "");
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

  const rememberReadingPosition = useCallback(
    async (waitForWrite = false) => {
      if (!bookRef.current || !settingsRef.current) {
        return;
      }

      const ratio = normalizedScrollPosition();
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
    [bookId, patchSettings],
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

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
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

      const scrollPosition = normalizedScrollPosition();
      captureCaret();
      if (!(await flushCurrentDraft())) {
        return;
      }
      focusEditorAfterModeChangeRef.current = focusEditor;
      setMode(nextMode);
      requestAnimationFrame(() => {
        restoreNormalizedScrollPosition(scrollPosition);
        if (nextMode === "write" && focusEditorAfterModeChangeRef.current) {
          focusEditorAfterModeChangeRef.current = false;
          requestAnimationFrame(restoreEditorFocus);
        }
      });
    },
    [captureCaret, flushCurrentDraft, mode, restoreEditorFocus],
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
        return;
      }

      if (chapter.id !== currentChapterIdRef.current) {
        if (!confirmToolTransition() || !(await flushCurrentDraft())) {
          return;
        }
      }

      await rememberReadingPosition(true);
      autosaveRef.current?.cancel();
      currentChapterIdRef.current = chapter.id;
      setCurrentChapterId(chapter.id);
      setMissingChapterId(null);
      setDraft(chapter.body);
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
      requestAnimationFrame(() => window.scrollTo({ top: 0 }));
    },
    [bookId, confirmToolTransition, flushCurrentDraft, patchSettings, rememberReadingPosition],
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

  const handleToolChange = useCallback(
    async (tool: WorkspaceTool) => {
      if (!confirmToolTransition(tool)) {
        return;
      }

      if (!(await flushCurrentDraft())) {
        return;
      }

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
    [activeTool, closeOverlayQuery, confirmToolTransition, flushCurrentDraft],
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
        setActiveTool(null);
        setChapterChooserOpen(false);
        setSettingsOpen(true);
        pushWorkspaceOverlay("settings", { settings: "open", tool: null, chooser: null });
        return;
      }

      setSettingsOpen(false);
      closeOverlayQuery("settings");
    },
    [closeOverlayQuery, confirmToolTransition, flushCurrentDraft],
  );

  const handleChooserOpenChange = useCallback(
    async (open: boolean) => {
      if (open) {
        if (!confirmToolTransition()) {
          return;
        }
        if (!(await flushCurrentDraft())) {
          return;
        }
        setActiveTool(null);
        setSettingsOpen(false);
        setChapterChooserOpen(true);
        pushWorkspaceOverlay("chooser", { chooser: "chapters", tool: null, settings: null });
        return;
      }

      setChapterChooserOpen(false);
      closeOverlayQuery("chooser");
    },
    [closeOverlayQuery, confirmToolTransition, flushCurrentDraft],
  );

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
    selectChapter,
    settingsOpen,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
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

      if (activeTool) {
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
    captureCaret,
    chapterChooserOpen,
    flushCurrentDraft,
    handleChooserOpenChange,
    handleSettingsOpenChange,
    handleToolChange,
    mode,
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
    setDraft(markdown);
    autosaveRef.current?.schedule(markdown);
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

  function updateChapterFromTool(updated: Chapter) {
    updateChapters(
      chaptersRef.current.map((chapter) => (chapter.id === updated.id ? updated : chapter)),
    );
    if (updated.id === currentChapterIdRef.current && updated.body !== draft) {
      setDraft(updated.body);
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

  if (loadState === "book-missing" || !book) {
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
    <div className="min-h-screen bg-background text-foreground">
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
            <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5">
              <Button
                aria-keyshortcuts="Alt+R"
                aria-pressed={mode === "read"}
                className={cn("h-7 rounded-lg px-2", mode === "read" && "bg-background shadow-sm")}
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
                className={cn("h-7 rounded-lg px-2", mode === "write" && "bg-background shadow-sm")}
                onClick={() => void switchMode("write", true)}
                size="sm"
                title="Write (Alt/Option+W)"
                variant="ghost"
              >
                <PenLine aria-hidden="true" />
                <span className="hidden xl:inline">Write</span>
              </Button>
            </div>
            <Button
              aria-label="Author and app settings"
              onClick={() => void handleSettingsOpenChange(true)}
              size="icon-sm"
              title="Settings"
              variant="ghost"
            >
              <Settings2 aria-hidden="true" />
            </Button>
          </div>
        }
      />

      <main className="mx-auto min-h-screen w-full max-w-[72rem] px-5 pt-28 pb-40 sm:px-8 sm:pt-32 lg:px-12">
        {currentChapter ? (
          <article
            aria-label={`${chapterLabel}: ${currentChapter.title}`}
            className="mx-auto w-full max-w-[68ch]"
          >
            <header className="mb-10">
              <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                {chapterLabel}
              </p>
              <h1 className="mt-5 font-heading text-4xl leading-tight font-medium tracking-[-0.04em] sm:text-5xl">
                {currentChapter.title}
              </h1>
            </header>

            <div
              className="animate-in fade-in duration-150 motion-reduce:animate-none motion-reduce:duration-0"
              key={mode}
            >
              {mode === "read" ? (
                draft.trim() ? (
                  <div className="font-serif text-[1.12rem] leading-[1.9] sm:text-[1.2rem]">
                    <MarkdownManuscript source={withoutLeadingMarkdownTitle(draft)} />
                  </div>
                ) : (
                  <EmptyManuscript />
                )
              ) : (
                <textarea
                  aria-label={`Markdown source for ${currentChapter.title}`}
                  className="field-sizing-content min-h-[62vh] w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-mono text-base leading-8 text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none sm:text-[1.05rem]"
                  onChange={changeDraft}
                  onClick={captureCaret}
                  onKeyUp={rememberCaretFromKeyboard}
                  onSelect={captureCaret}
                  placeholder="# Begin this chapter…"
                  ref={textareaRef}
                  spellCheck
                  value={draft}
                />
              )}
            </div>

            {mode === "read" && (previousChapter || nextChapter) ? (
              <nav
                aria-label="Chapter navigation"
                className="mt-20 flex items-center justify-between gap-4 border-t border-border pt-6"
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

      {currentChapter ? (
        <BookFloatingToolbar
          activeTool={activeTool}
          bookId={book.id}
          chapters={chapters}
          currentChapterId={currentChapter.id}
          draft={draft}
          mode={mode}
          onActiveToolChange={(tool: WorkspaceTool) => void handleToolChange(tool)}
          onApplyDraft={applyToolDraft}
          onBeforeToolOpen={async () => {
            if (!(await flushCurrentDraft())) {
              throw new Error("The current chapter could not be saved.");
            }
          }}
          onChapterUpdated={updateChapterFromTool}
          onRequestWrite={() => void switchMode("write", true)}
          onRestoreEditorFocus={restoreEditorFocus}
          onToolDirtyChange={handleToolDirtyChange}
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
        onSelect={selectChapter}
        open={chapterChooserOpen}
      />
      <SettingsDialog
        onOpenChange={(open) => void handleSettingsOpenChange(open)}
        open={settingsOpen}
      />

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

function restoreNormalizedScrollPosition(position: number) {
  const scrollableHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  window.scrollTo({ top: scrollableHeight * Math.min(1, Math.max(0, position)) });
}

function withoutLeadingMarkdownTitle(source: string): string {
  return source.replace(/^\s*#\s+[^\n]*(?:\r?\n)?/u, "").trimStart();
}
