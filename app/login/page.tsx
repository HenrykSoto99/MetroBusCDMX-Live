import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false, follow: false } };
export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/app");
  return <main className="auth-shell">
    <section className="auth-story" aria-labelledby="login-story-title"><Brand light/><div className="auth-line-art" aria-hidden="true"/><div className="auth-story-copy"><span className="eyebrow">EL PULSO DE LA CIUDAD</span><h1 id="login-story-title">Tu ciudad.<br/>A un paso.</h1><p>Conoce la red, encuentra tu línea y mira cómo se conecta la CDMX.</p></div><div className="auth-story-bottom"><span>7 LÍNEAS / UNA RED</span><span>CDMX — LIVE</span></div></section>
    <section className="auth-content" aria-labelledby="login-title"><Link className="auth-back" href="/"><ArrowLeft size={14}/> Volver al inicio</Link><div className="auth-form-card"><span className="eyebrow">TU PRÓXIMA RUTA</span><h2 id="login-title">Qué bueno verte.</h2><p>Inicia sesión y sigue el movimiento de tu ciudad.</p><AuthForm mode="login"/><p className="auth-switch">¿Aún no tienes cuenta? <Link href="/register">Crear cuenta gratis</Link></p><p className="auth-fineprint">Red GTFS real. Posiciones simuladas.<br/>Una experiencia independiente de Metrobús.</p></div></section>
  </main>;
}
