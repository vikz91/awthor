import { expect, test } from "bun:test";
import { repairKannadaModel } from "./kannada-model";

test("refuses to patch an unrecognized model asset", async () => {
  await expect(repairKannadaModel(new Uint8Array([0, 1, 2]))).rejects.toThrow("checksum");
});
