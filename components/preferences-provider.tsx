"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePreferences } from "@/lib/preferences";
import { IconHints } from "@/components/icon-hints";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { language, theme } = usePreferences();
  const pathname = usePathname();

  useEffect(() => {
    void usePreferences.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [language, theme]);

  useEffect(() => {
    const titles: Record<string, [string, string]> = {
      "/": ["La ciudad, en movimiento", "Your city, in motion"],
      "/login": ["Iniciar sesión", "Sign in"],
      "/register": ["Crear cuenta", "Create account"],
      "/app": ["Mapa de Metrobús", "Metrobús map"],
      "/docs": ["Datos abiertos y documentación", "Open data and documentation"],
      "/privacy": ["Privacidad", "Privacy"],
    };
    const title = titles[pathname];
    const localizedTitle = title ? `${title[language === "en" ? 1 : 0]} | MetroBusCDMX-Live` : "MetroBusCDMX-Live";
    const synchronizeTitle = () => { if (document.title !== localizedTitle) document.title = localizedTitle; };
    synchronizeTitle();
    // App Router may stream its server metadata after this component hydrates.
    const observer = new MutationObserver(synchronizeTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language, pathname]);

  return <>{children}<IconHints /></>;
}
