"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getAwthorRepository, type Theme, themes } from "@/lib/repository";

export { type Theme, themes } from "@/lib/repository";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const repository = getAwthorRepository();

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.classList.remove(...themes);
  root.classList.add(theme);
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
}

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
};

export function ThemeProvider({ children, defaultTheme = "paper" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    let active = true;

    repository.theme.get().then(
      (savedTheme) => {
        if (!active) {
          return;
        }

        const initialTheme = savedTheme ?? defaultTheme;
        setThemeState(initialTheme);
        applyTheme(initialTheme);
      },
      () => {
        if (active) {
          applyTheme(defaultTheme);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [defaultTheme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);

    repository.theme.save(nextTheme).catch(() => {
      // The theme still works for this session when storage is unavailable.
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
