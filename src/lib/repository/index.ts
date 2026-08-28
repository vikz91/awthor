import type { AwthorRepository } from "./contract";
import { createLocalAwthorRepository } from "./local-repository";

let repository: AwthorRepository | undefined;

/**
 * Application-level composition root for persistence.
 *
 * Replace the factory here with a cloud or offline-first repository; product
 * components continue to depend only on AwthorRepository.
 */
export function getAwthorRepository(): AwthorRepository {
  repository ??= createLocalAwthorRepository();
  return repository;
}

export * from "./contract";
export {
  legacyRepositoryPrefix,
  RepositoryStorageError,
  repositoryPrefix,
  repositorySchemaVersion,
  themeStorageKey,
} from "./local-repository";
export * from "./manuscript-autosave";
export * from "./models";
export { createSeedRepositoryData, seedRepositorySummary } from "./seed-data";
export { themeBootstrapScript } from "./theme-bootstrap";
