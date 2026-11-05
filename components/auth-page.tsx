"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { PreferenceControls } from "@/components/preference-controls";
import { useTranslation } from "@/lib/preferences";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps) {
  const { t } = useTranslation();
  const isRegister = mode === "register";
  const copy = isRegister
    ? {
        storyLabel: t("CONÉCTATE CON LA CDMX", "CONNECT WITH CDMX"),
        storyTitle: <>{t("La ciudad", "The city")}<br/>{t("se mueve", "moves")}<br/>{t("contigo.", "with you.")}</>,
        storyDescription: t("Una nueva perspectiva de las rutas que recorres todos los días.", "A new perspective on the routes you travel every day."),
        storyMetaLeft: t("DATOS ABIERTOS / 2026", "OPEN DATA / 2026"),
        storyMetaRight: t("HECHO PARA MOVERTE", "BUILT TO MOVE YOU"),
        formLabel: t("UN NUEVO PUNTO DE PARTIDA", "A NEW STARTING POINT"),
        formTitle: t("Empieza tu recorrido.", "Start your journey."),
        formDescription: t("Crea tu cuenta gratis. El mapa de la ciudad te espera.", "Create your free account. The city map is waiting for you."),
        switchPrompt: t("¿Ya tienes cuenta?", "Already have an account?"),
        switchLink: t("Iniciar sesión", "Sign in"),
        fineprint: <>{t("Sin costo. Sin datos de ubicación.", "Free to use. No location data.")}<br/>{t("Solo una nueva forma de conocer la red.", "Just a new way to discover the network.")}</>,
      }
    : {
        storyLabel: t("EL PULSO DE LA CIUDAD", "THE CITY'S PULSE"),
        storyTitle: <>{t("Tu ciudad.", "Your city.")}<br/>{t("A un paso.", "One step away.")}</>,
        storyDescription: t("Conoce la red, encuentra tu línea y mira cómo se conecta la CDMX.", "Learn the network, find your line, and see how CDMX connects."),
        storyMetaLeft: t("7 LÍNEAS / UNA RED", "7 LINES / ONE NETWORK"),
        storyMetaRight: "CDMX — LIVE",
        formLabel: t("TU PRÓXIMA RUTA", "YOUR NEXT ROUTE"),
        formTitle: t("Qué bueno verte.", "Good to see you."),
        formDescription: t("Inicia sesión y sigue el movimiento de tu ciudad.", "Sign in and follow your city's movement."),
        switchPrompt: t("¿Aún no tienes cuenta?", "Don't have an account yet?"),
        switchLink: t("Crear cuenta gratis", "Create a free account"),
        fineprint: <>{t("Red GTFS real. Posiciones simuladas.", "Real GTFS network. Simulated positions.")}<br/>{t("Una experiencia independiente de Metrobús.", "An independent Metrobús experience.")}</>,
      };

  return <main className="auth-shell">
    <section className="auth-story" aria-labelledby={`${mode}-story-title`}><Brand light/><div className="auth-line-art" aria-hidden="true"/><div className="auth-story-copy"><span className="eyebrow">{copy.storyLabel}</span><h1 id={`${mode}-story-title`}>{copy.storyTitle}</h1><p>{copy.storyDescription}</p></div><div className="auth-story-bottom"><span>{copy.storyMetaLeft}</span><span>{copy.storyMetaRight}</span></div></section>
    <section className="auth-content" aria-labelledby={`${mode}-title`}>
      <div className="auth-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", width: "100%", maxWidth: "420px", margin: "0 auto 32px" }}>
        <Link className="auth-back" style={{ position: "static" }} href="/"><ArrowLeft size={14}/>{t("Volver al inicio", "Back to home")}</Link>
        <PreferenceControls/>
      </div>
      <div className="auth-form-card"><span className="eyebrow">{copy.formLabel}</span><h2 id={`${mode}-title`}>{copy.formTitle}</h2><p>{copy.formDescription}</p><AuthForm mode={mode}/><p className="auth-switch">{copy.switchPrompt} <Link href={isRegister ? "/login" : "/register"}>{copy.switchLink}</Link></p><p className="auth-fineprint">{copy.fineprint}</p></div>
    </section>
  </main>;
}
