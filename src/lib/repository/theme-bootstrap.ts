import { themeStorageKey } from "./local-repository";

/**
 * Applies the tiny, independently persisted theme value before first paint.
 * Product code continues to use AwthorRepository; this is only a render bootstrap.
 */
export const themeBootstrapScript = `
(() => {
  try {
    const theme = window.localStorage.getItem(${JSON.stringify(themeStorageKey)});
    if (theme !== "paper" && theme !== "stone") return;
    const root = document.documentElement;
    root.classList.add(theme);
    root.dataset.theme = theme;
    root.style.colorScheme = theme === "stone" ? "dark" : "light";
  } catch {}
})();
`;
