import { describe, expect, test } from "bun:test";
import { appSettingsSchema, createDefaultAppSettings } from "./models";

describe("app settings", () => {
  test("defaults new and existing editor settings to seamless layout", () => {
    expect(createDefaultAppSettings().editor.layout).toBe("seamless");
    expect(appSettingsSchema.parse({ editor: {} }).editor.layout).toBe("seamless");
  });

  test("preserves the pages preference", () => {
    expect(appSettingsSchema.parse({ editor: { layout: "pages" } }).editor.layout).toBe("pages");
  });
});
