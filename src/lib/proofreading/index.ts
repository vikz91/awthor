import type { ProofreadingService } from "./contract";
import { createHarperProofreadingService } from "./harper-service";

let proofreadingService: ProofreadingService | undefined;

/**
 * Application-level composition root for proofreading.
 *
 * Swap the factory here to replace Harper.js without changing editor code.
 */
export function getProofreadingService(): ProofreadingService {
  proofreadingService ??= createHarperProofreadingService();
  return proofreadingService;
}

export * from "./contract";
export {
  createHarperProofreadingService,
  HarperProofreadingService,
  type HarperProofreadingServiceOptions,
} from "./harper-service";
