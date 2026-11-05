import type { Metadata } from "next";
import { PreferencesProvider } from "@/components/preferences-provider";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
export const metadata: Metadata = {
  title: { default: "MetroBusCDMX-Live | La ciudad, en movimiento", template: "%s | MetroBusCDMX-Live" },
  description: "Explora las siete líneas del Metrobús de la CDMX en un mapa interactivo. Rutas y estaciones GTFS reales con posiciones simuladas en esta versión demo.",
  keywords: ["Metrobús", "CDMX", "mapa", "movilidad", "GTFS", "transporte"],
  icons: { icon: "/brand/app-icon.png", apple: "/brand/app-logo.png" },
  openGraph: { type: "website", title: "MetroBusCDMX-Live", description: "El pulso de la CDMX en un mapa. Siete líneas, una nueva forma de moverte.", siteName: "MetroBusCDMX-Live", locale: "es_MX" },
  twitter: { card: "summary", title: "MetroBusCDMX-Live", description: "Sigue el pulso de la CDMX. Red GTFS real, posiciones simuladas." },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" data-theme="dark" suppressHydrationWarning><body><PreferencesProvider>{children}</PreferencesProvider></body></html>;
}
