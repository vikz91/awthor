# Proofreading service

This directory provides Awthor's client-side spell and grammar checking boundary. It currently uses
[Harper.js](https://writewithharper.com/), but editor code must depend on `ProofreadingService`, not
on Harper types or classes.

## Instructions for AI coding agents

Read this file before integrating proofreading into a page, editor, hook, toolbar, or persistence
layer.

1. Import from `@/lib/proofreading`. Do not import `harper.js` from UI code.
2. Use the service only in browser-owned code. Harper's `WorkerLinter` cannot run during server
   rendering.
3. Keep the write page usable while Harper and its WASM binary load. Proofreading is an enhancement,
   not a prerequisite for editing.
4. Debounce checks. Do not call `check()` on every keystroke without a delay.
5. Treat every issue as valid only for the exact source string passed to `check()`.
6. Apply suggestions through `applySuggestion()`. Do not reproduce Harper's replacement logic in a
   component.
7. Re-run proofreading after applying a suggestion, changing the dialect or rules, or updating the
   personal dictionary.
8. Keep ignored-issue data opaque. Persist the string returned by `exportIgnoredIssues()` without
   parsing or editing it.
9. Use semantic design tokens when rendering issues or controls, and verify the UI in Paper and
   Stone themes.
10. Never send manuscript text to a server as part of this integration. Harper runs locally in a
    browser worker.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `contract.ts` | Engine-neutral types and the `ProofreadingService` interface. |
| `harper-service.ts` | Lazy browser-worker adapter for Harper.js. No UI concerns belong here. |
| `index.ts` | Application composition root and public exports. Swap the engine here. |

## Choosing a service instance

Use the application singleton for Awthor's normal single-editor experience:

```ts
import { getProofreadingService } from "@/lib/proofreading";

const proofreading = getProofreadingService();
```

The singleton keeps the worker, personal dictionary, rule configuration, and ignored issues alive
while the app is open. Do not call `dispose()` on this shared instance from a React component.

If multiple editors must check text independently at the same time, create one service per editor:

```ts
import { createHarperProofreadingService } from "@/lib/proofreading";

const proofreading = createHarperProofreadingService({ dialect: "british" });

// Dispose this owned instance when its editor is permanently destroyed.
await proofreading.dispose();
```

A service retains handles only for its latest completed check. Concurrent editors sharing one
instance can invalidate each other's issue and suggestion IDs.

## Checking text from a Client Component

Harper loads automatically on the first check. `initialize()` is optional and exists only for
warming the worker during an idle moment or before the user opens proofreading tools.

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  getProofreadingService,
  type ProofreadingIssue,
} from "@/lib/proofreading";

const proofreading = getProofreadingService();

export function useProofreading(text: string) {
  const [issues, setIssues] = useState<ProofreadingIssue[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void proofreading
        .check(text, {
          format: "markdown",
          deduplicate: true,
          signal: controller.signal,
        })
        .then((nextIssues) => {
          if (!controller.signal.aborted) {
            setIssues(nextIssues);
            setError(null);
          }
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            setError(reason instanceof Error ? reason.message : "Proofreading failed");
          }
        });
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [text]);

  return { error, issues };
}
```

Aborting a check discards its result; it does not interrupt work already running inside Harper's
worker. The abort guard in the completion callback prevents an older request from clearing newer
results.

Awthor stores novel chapters as Markdown source, so manuscript checks use `format: "markdown"`.
Use `plaintext` only for text that genuinely contains no Markdown syntax.

## Rendering issues

Each issue contains:

- `range.start`: inclusive UTF-16 offset.
- `range.end`: exclusive UTF-16 offset.
- `problemText`: the affected source text.
- `category`: normalized UI category such as `spelling`, `grammar`, or `style`.
- `categoryLabel`: Harper's human-readable category.
- `message`: explanation for the author.
- `suggestions`: zero or more possible corrections.

The offsets are compatible with JavaScript string slicing and browser selection APIs:

```ts
const highlightedText = text.slice(issue.range.start, issue.range.end);
```

Do not use an issue range after the document changes. Run another check instead.

## Applying suggestions safely

```ts
async function acceptSuggestion(
  text: string,
  issue: ProofreadingIssue,
  suggestion: ProofreadingIssue["suggestions"][number],
) {
  const proofreading = getProofreadingService();
  return proofreading.applySuggestion(text, issue.id, suggestion.id);
}
```

`applySuggestion()` deliberately rejects stale issues when `text` differs from the source originally
checked. A successful application invalidates all current issue handles. Update the editor text,
clear the displayed issues, and let the debounced check run again.

Some issues contain no suggestions. The UI should still allow the author to inspect or ignore those
issues, but it must not render a fake correction action.

## Ignoring issues and adding words

Ignore a specific finding:

```ts
await proofreading.ignoreIssue(issue.id);
```

Add character names, invented places, or other manuscript vocabulary to the personal dictionary:

```ts
await proofreading.addWords(["Elara", "Calder", "Awthor"]);
```

The service trims words, removes empty values, and deduplicates a batch. Prefer one batched call over
many single-word calls because dictionary imports are relatively expensive.

## Persisting local preferences

Harper state lives in memory unless the app exports and restores it. Persist it through Awthor's
client-side repository when the write-page integration is added.

```ts
const savedProofreadingState = {
  words: await proofreading.exportWords(),
  ignoredIssues: await proofreading.exportIgnoredIssues(),
};

await proofreading.addWords(savedProofreadingState.words);
await proofreading.importIgnoredIssues(savedProofreadingState.ignoredIssues);
```

Available reset operations are `clearWords()` and `clearIgnoredIssues()`. Do not store manuscript
text in this preference payload.

## Dialects and rules

Supported dialects are:

```ts
type ProofreadingDialect =
  | "american"
  | "british"
  | "australian"
  | "canadian"
  | "indian";
```

Set the dialect before the first check when possible:

```ts
await proofreading.setDialect("indian");
```

Rule names come from the installed Harper version. Discover them at runtime instead of maintaining
a duplicate hard-coded list:

```ts
async function disableRule(selectedRuleName: string) {
  const currentRules = await proofreading.getRuleConfiguration();
  const ruleToDisable = Object.keys(currentRules).find((rule) => rule === selectedRuleName);

  if (ruleToDisable) {
    await proofreading.updateRuleConfiguration({ [ruleToDisable]: false });
  }
}
```

`updateRuleConfiguration()` already merges changes into the current configuration. Pass only the
known changes; do not overwrite the complete configuration to toggle one setting.

## Integration checklist

Before considering a write-page integration complete, verify that:

- The editor remains interactive while Harper initializes.
- Checks are debounced and stale responses cannot replace current results.
- Loading, unavailable, empty, and error states are visible but unobtrusive.
- Issue highlighting uses the returned UTF-16 range without changing it.
- Suggestions cannot be applied after the manuscript changes.
- Applying a suggestion preserves cursor and selection position where practical.
- “Ignore” and “Add to dictionary” have distinct labels and behavior.
- Personal words, ignored issues, dialect, and rule preferences remain local to the device.
- All controls are keyboard-accessible and work in both Paper and Stone themes.
- Tests mock `ProofreadingService` rather than loading Harper's WASM worker for every UI test.

## Validation after changes

For changes to this service or its integration, run:

```bash
bun run lint
bunx tsc --noEmit
bun run build
```

Also exercise at least one spelling issue, one grammar issue, suggestion application, stale-source
rejection, an ignored issue, and a custom dictionary word in the browser.
