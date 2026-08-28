import type { AwthorRepository } from "./contract";
import { createIndexedDbAwthorRepository } from "./indexeddb-repository";

let repository: AwthorRepository | undefined;

/**
 * Application-level composition root for persistence.
 *
 * Replace the factory here with a cloud or offline-first repository; product
 * components continue to depend only on AwthorRepository.
 */
export function getAwthorRepository(): AwthorRepository {
  repository ??= createIndexedDbAwthorRepository();
  return repository;
}

export * from "./contract";
export {
  createIndexedDbAwthorRepository,
  indexedDbDatabaseName,
  indexedDbRepositoryPrefix,
  indexedDbRepositorySchemaVersion,
} from "./indexeddb-repository";
export {
  legacyRepositoryPrefix,
  RepositoryStorageError,
  repositoryPrefix,
  repositorySchemaVersion,
  themeStorageKey,
} from "./local-repository";
export * from "./manuscript-autosave";
export * from "./models";
export {
  createSeedRepositoryData,
  hasSeedRepositoryData,
  seedRepositoryBookIds,
  seedRepositorySummary,
  unseedRepositoryData,
} from "./seed-data";
export { themeBootstrapScript } from "./theme-bootstrap";
