import type {
  Dialect as HarperDialect,
  SuggestionKind as HarperSuggestionKind,
  Lint,
  Linter,
  LintKind,
  Suggestion,
} from "harper.js";

import type {
  ProofreadingCategory,
  ProofreadingCheckOptions,
  ProofreadingDialect,
  ProofreadingIssue,
  ProofreadingRuleConfiguration,
  ProofreadingService,
  ProofreadingSuggestion,
  ProofreadingSuggestionKind,
} from "./contract";

interface IssueHandle {
  lint: Lint;
  source: string;
  suggestions: Map<string, Suggestion>;
}

export interface HarperProofreadingServiceOptions {
  dialect?: ProofreadingDialect;
  /** Test/adapter seam. Product UI should use the composition root instead. */
  linterFactory?: () => Promise<Linter>;
}

const categoryByLintKind: Record<LintKind, ProofreadingCategory> = {
  Agreement: "grammar",
  BoundaryError: "grammar",
  Capitalization: "punctuation",
  Eggcorn: "word-choice",
  Enhancement: "style",
  Formatting: "formatting",
  Grammar: "grammar",
  Malapropism: "word-choice",
  Miscellaneous: "other",
  Nonstandard: "style",
  Punctuation: "punctuation",
  Readability: "readability",
  Redundancy: "style",
  Regionalism: "style",
  Repetition: "style",
  Spelling: "spelling",
  Style: "style",
  Typo: "spelling",
  Usage: "word-choice",
  WordChoice: "word-choice",
  WordOrder: "grammar",
};

function assertBrowser(): void {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    throw new Error(
      "Harper proofreading is browser-only. Call the service from a Client Component or browser event.",
    );
  }
}

async function createWorkerLinter(dialect: ProofreadingDialect): Promise<Linter> {
  assertBrowser();

  const [{ Dialect, WorkerLinter }, { binaryInlined }] = await Promise.all([
    import("harper.js"),
    import("harper.js/binaryInlined"),
  ]);

  const dialects: Record<ProofreadingDialect, HarperDialect> = {
    american: Dialect.American,
    british: Dialect.British,
    australian: Dialect.Australian,
    canadian: Dialect.Canadian,
    indian: Dialect.Indian,
  };

  return new WorkerLinter({ binary: binaryInlined, dialect: dialects[dialect] });
}

function toSuggestionKind(kind: HarperSuggestionKind): ProofreadingSuggestionKind {
  switch (kind) {
    case 0:
      return "replace";
    case 1:
      return "remove";
    case 2:
      return "insert-after";
    default:
      return "replace";
  }
}

function toCategory(kind: string): ProofreadingCategory {
  return categoryByLintKind[kind as LintKind] ?? "other";
}

function hash(value: string): string {
  let result = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16_777_619);
  }

  return (result >>> 0).toString(36);
}

/** Browser-backed Harper.js adapter. Harper and its WASM binary load on first use. */
export class HarperProofreadingService implements ProofreadingService {
  private dialect: ProofreadingDialect;
  private issueHandles = new Map<string, IssueHandle>();
  private linterPromise: Promise<Linter> | undefined;
  private revision = 0;
  private disposed = false;
  private readonly linterFactory: () => Promise<Linter>;

  constructor(options: HarperProofreadingServiceOptions = {}) {
    this.dialect = options.dialect ?? "american";
    this.linterFactory = options.linterFactory ?? (() => createWorkerLinter(this.dialect));
  }

  async initialize(): Promise<void> {
    await this.getLinter();
  }

  async check(text: string, options: ProofreadingCheckOptions = {}): Promise<ProofreadingIssue[]> {
    this.assertActive();
    const revision = ++this.revision;

    if (options.signal?.aborted || text.length === 0) {
      this.issueHandles.clear();
      return [];
    }

    const linter = await this.getLinter();
    if (options.signal?.aborted || revision !== this.revision) {
      return [];
    }
    const lints = await linter.lint(text, {
      language: options.format ?? "plaintext",
      dedup: options.deduplicate ?? true,
      isolateEnglish: options.isolateEnglish ?? false,
    });

    if (options.signal?.aborted || revision !== this.revision) {
      return [];
    }

    const nextHandles = new Map<string, IssueHandle>();
    const issues = lints.map((lint, issueIndex) => {
      const span = lint.span();
      const categoryLabel = lint.lint_kind_pretty();
      const message = lint.message();
      const problemText = lint.get_problem_text();
      const issueId = `issue-${hash(
        `${span.start}:${span.end}:${categoryLabel}:${message}:${problemText}`,
      )}-${issueIndex}`;
      const suggestionHandles = new Map<string, Suggestion>();
      const suggestions: ProofreadingSuggestion[] = lint
        .suggestions()
        .map((suggestion, suggestionIndex) => {
          const suggestionId = `${issueId}-suggestion-${suggestionIndex}`;
          suggestionHandles.set(suggestionId, suggestion);

          return {
            id: suggestionId,
            kind: toSuggestionKind(suggestion.kind()),
            replacement: suggestion.get_replacement_text(),
          };
        });

      nextHandles.set(issueId, {
        lint,
        source: text,
        suggestions: suggestionHandles,
      });

      return {
        id: issueId,
        category: toCategory(lint.lint_kind()),
        categoryLabel,
        message,
        problemText,
        range: {
          start: span.start,
          end: span.end,
        },
        suggestions,
      } satisfies ProofreadingIssue;
    });

    this.issueHandles = nextHandles;
    return issues;
  }

  async applySuggestion(text: string, issueId: string, suggestionId: string): Promise<string> {
    const issue = this.getIssueHandle(issueId);
    const suggestion = issue.suggestions.get(suggestionId);

    if (!suggestion) {
      throw new Error(`Unknown proofreading suggestion: ${suggestionId}`);
    }

    if (text !== issue.source) {
      throw new Error(
        "The document changed after this proofreading issue was found. Check it again.",
      );
    }

    const linter = await this.getLinter();
    const updatedText = await linter.applySuggestion(text, issue.lint, suggestion);
    this.invalidateIssues();
    return updatedText;
  }

  async ignoreIssue(issueId: string): Promise<void> {
    const issue = this.getIssueHandle(issueId);
    const linter = await this.getLinter();
    await linter.ignoreLint(issue.source, issue.lint);
    this.issueHandles.delete(issueId);
  }

  async getRuleConfiguration(): Promise<ProofreadingRuleConfiguration> {
    const linter = await this.getLinter();
    return linter.getLintConfig();
  }

  async updateRuleConfiguration(changes: ProofreadingRuleConfiguration): Promise<void> {
    const linter = await this.getLinter();
    const currentConfiguration = await linter.getLintConfig();
    await linter.setLintConfig({ ...currentConfiguration, ...changes });
    this.invalidateIssues();
  }

  async setDialect(dialect: ProofreadingDialect): Promise<void> {
    this.assertActive();
    this.dialect = dialect;

    if (!this.linterPromise) {
      return;
    }

    const [{ Dialect }, linter] = await Promise.all([import("harper.js"), this.linterPromise]);
    const dialects: Record<ProofreadingDialect, HarperDialect> = {
      american: Dialect.American,
      british: Dialect.British,
      australian: Dialect.Australian,
      canadian: Dialect.Canadian,
      indian: Dialect.Indian,
    };

    await linter.setDialect(dialects[dialect]);
    this.invalidateIssues();
  }

  async addWords(words: readonly string[]): Promise<void> {
    const uniqueWords = [...new Set(words.map((word) => word.trim()).filter(Boolean))];

    if (uniqueWords.length === 0) {
      return;
    }

    const linter = await this.getLinter();
    await linter.importWords(uniqueWords);
    this.invalidateIssues();
  }

  async exportWords(): Promise<string[]> {
    const linter = await this.getLinter();
    return linter.exportWords();
  }

  async clearWords(): Promise<void> {
    const linter = await this.getLinter();
    await linter.clearWords();
    this.invalidateIssues();
  }

  async exportIgnoredIssues(): Promise<string> {
    const linter = await this.getLinter();
    return linter.exportIgnoredLints();
  }

  async importIgnoredIssues(serializedIssues: string): Promise<void> {
    const linter = await this.getLinter();
    await linter.importIgnoredLints(serializedIssues);
    this.invalidateIssues();
  }

  async clearIgnoredIssues(): Promise<void> {
    const linter = await this.getLinter();
    await linter.clearIgnoredLints();
    this.invalidateIssues();
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.revision += 1;
    this.issueHandles.clear();

    if (this.linterPromise) {
      const linter = await this.linterPromise;
      await linter.dispose();
      this.linterPromise = undefined;
    }
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error("This proofreading service has been disposed.");
    }
  }

  private getIssueHandle(issueId: string): IssueHandle {
    this.assertActive();
    const issue = this.issueHandles.get(issueId);

    if (!issue) {
      throw new Error(`Unknown or stale proofreading issue: ${issueId}`);
    }

    return issue;
  }

  private invalidateIssues(): void {
    this.revision += 1;
    this.issueHandles.clear();
  }

  private getLinter(): Promise<Linter> {
    this.assertActive();

    if (!this.linterPromise) {
      this.linterPromise = this.linterFactory()
        .then(async (linter) => {
          await linter.setup();
          return linter;
        })
        .catch((error: unknown) => {
          this.linterPromise = undefined;
          throw error;
        });
    }

    return this.linterPromise;
  }
}

export function createHarperProofreadingService(
  options?: HarperProofreadingServiceOptions,
): ProofreadingService {
  return new HarperProofreadingService(options);
}
