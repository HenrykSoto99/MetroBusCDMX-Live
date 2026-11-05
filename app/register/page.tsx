import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false, follow: false } };
export default async function RegisterPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/app");
  return <main className="auth-shell">
    <section className="auth-story" aria-labelledby="register-story-title"><Brand light/><div className="auth-line-art" aria-hidden="true"/><div className="auth-story-copy"><span className="eyebrow">CONÉCTATE CON LA CDMX</span><h1 id="register-story-title">La ciudad<br/>se mueve<br/>contigo.</h1><p>Una nueva perspectiva de las rutas que recorres todos los días.</p></div><div className="auth-story-bottom"><span>DATOS ABIERTOS / 2026</span><span>HECHO PARA MOVERTE</span></div></section>
    <section className="auth-content" aria-labelledby="register-title"><Link className="auth-back" href="/"><ArrowLeft size={14}/> Volver al inicio</Link><div className="auth-form-card"><span className="eyebrow">UN NUEVO PUNTO DE PARTIDA</span><h2 id="register-title">Empieza tu recorrido.</h2><p>Crea tu cuenta gratis. El mapa de la ciudad te espera.</p><AuthForm mode="register"/><p className="auth-switch">¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link></p><p className="auth-fineprint">Sin costo. Sin datos de ubicación.<br/>Solo una nueva forma de conocer la red.</p></div></section>
  </main>;
}
