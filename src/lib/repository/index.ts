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

export type { AwthorRepository } from "./contract";
export * from "./models";
