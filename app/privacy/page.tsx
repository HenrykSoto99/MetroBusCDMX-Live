import type { Metadata } from "next";
import { PrivacyContent } from "@/components/public-documents";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Información sobre las cuentas, sesiones, preferencias locales y servicios cartográficos de MetroBusCDMX-Live.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
