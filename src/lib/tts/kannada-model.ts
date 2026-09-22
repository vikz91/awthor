/**
 * The pinned Kannada export has twelve 3-tap encoder convolutions with pads=[1,0]
 * instead of same-length pads=[1,1]. Each loses a token and fails against the mask.
 * Repair those protobuf attributes only; weights and all other bytes stay intact.
 * Checksums bind the offsets to this exact export. See docs/tts-model-notices.md.
 */
export const kannadaSourceSha = "ff7ed92052c33c82ece808785775928b708247c3a1c530ecbea25b8b0f244c4b";
export const kannadaPatchedSha = "4d083bd1ebe6058dfbec21e524d6037a548806e8803fa9231f36bbcecaf9a76d";
export const kannadaPaddingOffsets = [
  42760, 45576, 89521, 92337, 136282, 139098, 183043, 185859, 229804, 232620, 276565, 279381,
];

async function sha256(bytes: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function repairKannadaModel(bytes: Uint8Array<ArrayBuffer>) {
  if ((await sha256(bytes)) !== kannadaSourceSha)
    throw new Error("Unexpected Kannada model checksum");
  for (const offset of kannadaPaddingOffsets) {
    if (bytes[offset] !== 0) throw new Error("Unexpected Kannada padding attribute");
    bytes[offset] = 1;
  }
  if ((await sha256(bytes)) !== kannadaPatchedSha) throw new Error("Kannada model repair failed");
  return bytes;
}
