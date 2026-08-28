export const proofreadingDialects = [
  "american",
  "british",
  "australian",
  "canadian",
  "indian",
] as const;

export type ProofreadingDialect = (typeof proofreadingDialects)[number];

export type ProofreadingFormat = "plaintext" | "markdown" | "typst";

export type ProofreadingCategory =
  | "spelling"
  | "grammar"
  | "punctuation"
  | "style"
  | "readability"
  | "word-choice"
  | "formatting"
  | "other";

export type ProofreadingSuggestionKind = "replace" | "remove" | "insert-after";

export interface ProofreadingRange {
  /** Inclusive UTF-16 offset, compatible with browser selection APIs. */
  start: number;
  /** Exclusive UTF-16 offset, compatible with browser selection APIs. */
  end: number;
}

export interface ProofreadingSuggestion {
  id: string;
  kind: ProofreadingSuggestionKind;
  replacement: string;
}

export interface ProofreadingIssue {
  id: string;
  category: ProofreadingCategory;
  categoryLabel: string;
  message: string;
  problemText: string;
  range: ProofreadingRange;
  suggestions: ProofreadingSuggestion[];
}

export interface ProofreadingCheckOptions {
  /** The source format. Awthor manuscripts use `markdown`. */
  format?: ProofreadingFormat;
  /** Remove overlapping issues. Defaults to true. */
  deduplicate?: boolean;
  /** Ignore regions that Harper considers unlikely to be English. */
  isolateEnglish?: boolean;
  /** Lets an editor discard a check that became stale while it was running. */
  signal?: AbortSignal;
}

export type ProofreadingRuleConfiguration = Record<string, boolean | null>;

/**
 * Engine-neutral boundary for proofreading features.
 *
 * UI code should depend on this interface instead of importing Harper.js. That
 * keeps the write experience independent from the current proofreading engine.
 */
export interface ProofreadingService {
  initialize(): Promise<void>;
  check(text: string, options?: ProofreadingCheckOptions): Promise<ProofreadingIssue[]>;
  applySuggestion(text: string, issueId: string, suggestionId: string): Promise<string>;
  ignoreIssue(issueId: string): Promise<void>;

  getRuleConfiguration(): Promise<ProofreadingRuleConfiguration>;
  updateRuleConfiguration(changes: ProofreadingRuleConfiguration): Promise<void>;
  setDialect(dialect: ProofreadingDialect): Promise<void>;

  addWords(words: readonly string[]): Promise<void>;
  exportWords(): Promise<string[]>;
  clearWords(): Promise<void>;

  exportIgnoredIssues(): Promise<string>;
  importIgnoredIssues(serializedIssues: string): Promise<void>;
  clearIgnoredIssues(): Promise<void>;

  dispose(): Promise<void>;
}
