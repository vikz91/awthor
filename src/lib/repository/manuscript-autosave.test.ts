import { expect, test } from "bun:test";
import { createManuscriptAutosave } from "./manuscript-autosave";

test("autosave coalesces drafts and flushes the latest source", async () => {
  const saved: string[] = [];
  const states: string[] = [];
  const autosave = createManuscriptAutosave(
    {
      async saveManuscript(_bookId, _chapterId, markdown) {
        saved.push(markdown);
        return { book: {} as never, chapter: {} as never };
      },
    },
    {
      bookId: "book",
      chapterId: "chapter",
      delay: 60_000,
      onStateChange: (state) => states.push(state),
    },
  );

  autosave.schedule("first");
  autosave.schedule("latest");
  await autosave.flush();

  expect(saved).toEqual(["latest"]);
  expect(states).toEqual(["dirty", "dirty", "saving", "saved"]);
});
