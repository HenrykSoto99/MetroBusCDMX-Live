"use client";

import { Moon, Sun } from "lucide-react";
import { usePreferences, useTranslation } from "@/lib/preferences";
import styles from "./preference-controls.module.css";

export function PreferenceControls({ className = "" }: { className?: string }) {
  const { language, theme, setLanguage, setTheme } = usePreferences();
  const { t } = useTranslation();
  const languageLabel = t("Cambiar a inglés", "Switch to Spanish");
  const themeLabel = theme === "dark" ? t("Activar modo claro", "Switch to light mode") : t("Activar modo oscuro", "Switch to dark mode");

  return (
    <div className={`${styles.controls} preference-controls ${className}`} role="group" aria-label={t("Idioma y apariencia", "Language and appearance")}>
      <button type="button" className={styles.language} onClick={() => setLanguage(language === "es" ? "en" : "es")} aria-label={languageLabel} title={languageLabel}>
        {language.toUpperCase()}
      </button>
      <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={themeLabel} title={themeLabel} aria-pressed={theme === "light"}>
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );
}
