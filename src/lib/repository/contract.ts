import type { Character, Note, OnboardingDetails, PlotThread, Theme } from "./models";

export interface ValueRepository<Value> {
  get(): Promise<Value | null>;
  save(value: Value): Promise<void>;
  clear(): Promise<void>;
}

export interface ScopedCollectionRepository<Entity extends { id: string }> {
  list(scopeId: string): Promise<Entity[] | null>;
  replaceAll(scopeId: string, entities: readonly Entity[]): Promise<void>;
  clear(scopeId: string): Promise<void>;
}

/**
 * The single data boundary used by product features.
 *
 * A cloud or offline-first implementation only needs to satisfy this contract;
 * pages and workspaces should never depend on browser storage directly.
 */
export interface AwthorRepository {
  profile: ValueRepository<OnboardingDetails>;
  theme: ValueRepository<Theme>;
  characters: ScopedCollectionRepository<Character>;
  plots: ScopedCollectionRepository<PlotThread>;
  notes: ScopedCollectionRepository<Note>;
}
