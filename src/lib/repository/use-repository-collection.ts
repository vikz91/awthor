"use client";

import { useEffect, useRef, useState } from "react";
import type { ScopedCollectionRepository } from "./contract";

type RepositoryCollectionState = {
  isReady: boolean;
  error: Error | null;
};

export function useRepositoryCollection<Entity extends { id: string }>(
  repository: ScopedCollectionRepository<Entity>,
  scopeId: string,
  seed: readonly Entity[],
) {
  const [entities, setEntities] = useState<Entity[]>(() => [...seed]);
  const [state, setState] = useState<RepositoryCollectionState>({
    isReady: false,
    error: null,
  });
  const loadedScope = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    loadedScope.current = null;
    setEntities([...seed]);
    setState({ isReady: false, error: null });

    repository
      .list(scopeId)
      .then((stored) => {
        if (!active) {
          return;
        }

        if (stored) {
          setEntities(stored);
        }
        loadedScope.current = scopeId;
        setState({ isReady: true, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            isReady: true,
            error: error instanceof Error ? error : new Error("Local data could not be loaded."),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [repository, scopeId, seed]);

  useEffect(() => {
    if (!state.isReady || loadedScope.current !== scopeId) {
      return;
    }

    repository.replaceAll(scopeId, entities).catch((error: unknown) => {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error : new Error("Local data could not be saved."),
      }));
    });
  }, [entities, repository, scopeId, state.isReady]);

  return [entities, setEntities, state] as const;
}
