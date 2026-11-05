"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Language = "es" | "en";
export type Theme = "dark" | "light";

interface PreferencesState {
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      language: "es",
      theme: "dark",
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "metrobus-preferences-v1",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try { return typeof window !== "undefined" ? window.localStorage.getItem(name) : null; }
          catch { return null; }
        },
        setItem: (name, value) => {
          try { if (typeof window !== "undefined") window.localStorage.setItem(name, value); }
          catch { /* Preferences remain usable in memory when storage is blocked. */ }
        },
        removeItem: (name) => {
          try { if (typeof window !== "undefined") window.localStorage.removeItem(name); }
          catch { /* No account data is stored here. */ }
        },
      })),
      partialize: (state) => ({ language: state.language, theme: state.theme }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<PreferencesState> | undefined;
        return {
          ...current,
          language: saved?.language === "en" ? "en" : "es",
          theme: saved?.theme === "light" ? "light" : "dark",
        };
      },
    },
  ),
);

export function useTranslation() {
  const language = usePreferences((state) => state.language);
  return {
    language,
    locale: language === "en" ? "en-US" : "es-MX",
    t: (es: string, en: string) => (language === "en" ? en : es),
  };
}
