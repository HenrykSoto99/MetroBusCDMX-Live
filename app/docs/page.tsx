import type { Metadata } from "next";
import { DocsContent } from "@/components/public-documents";

export const metadata: Metadata = {
  title: "Datos abiertos y documentación",
  description: "Fuentes GTFS del Metrobús, límites de la simulación y mapa CARTO con deck.gl.",
};

export default function DocsPage() {
  return <DocsContent />;
}
