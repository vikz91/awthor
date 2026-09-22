import type { Passage, Preparation } from "./models";

export type TtsRequest = { id: number; passage: Passage };
export type TtsResponse =
  | { id: number; type: "progress"; progress: Preparation }
  | { id: number; type: "audio"; blob: Blob }
  | { id: number; type: "error"; message: string };
