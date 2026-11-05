"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { credentialsSchema, registerInputSchema } from "@/lib/validation";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

function authError(message: unknown): string {
  if (typeof message !== "string") return "No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo.";
  if (message.includes("RATE_LIMITED") || message.toLowerCase().includes("demasiados")) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (message.includes("CredentialsSignin") || message.includes("Configuration")) {
    return "El correo o la contraseña no son correctos.";
  }
  return message;
}

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isRegister && !privacyAccepted) {
      setError("Debes aceptar el aviso de privacidad para continuar.");
      return;
    }

    const parsed = isRegister
      ? registerInputSchema.safeParse({ name, email, password })
      : credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos e inténtalo de nuevo.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(result.error ?? "No pudimos crear tu cuenta. Inténtalo de nuevo.");
          return;
        }
      }

      // NextAuth's stock client parses its callback URL without a base. Our
      // application intentionally returns relative redirects for embedded Preview.
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      const { csrfToken } = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrfToken) throw new Error("No se pudo preparar la sesión.");
      const loginResponse = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password, csrfToken, callbackUrl: "/app", json: "true" }),
      });
      const result = await loginResponse.json() as { url?: string };
      const authFailure = result.url ? new URL(result.url, window.location.origin).searchParams.get("error") : "Configuration";
      if (!loginResponse.ok || authFailure) {
        setError(authError(authFailure));
        return;
      }
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await sessionResponse.json() as { user?: { email?: string } };
      if (!session.user) {
        setError("Tu navegador no conservó la sesión. Abre la app en una pestaña independiente o permite cookies para este sitio.");
        return;
      }

      window.location.assign("/app");
    } catch {
      setError("No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={loading}>
      {isRegister && (
        <div className="form-field">
          <label htmlFor="auth-name">Nombre</label>
          <div className="input-wrap">
            <User size={18} aria-hidden="true" />
            <input
              id="auth-name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              minLength={2}
              maxLength={70}
              required
              placeholder="Cómo te llamamos"
              aria-invalid={Boolean(error)}
            />
          </div>
        </div>
      )}

      <div className="form-field">
        <label htmlFor="auth-email">Correo electrónico</label>
        <div className="input-wrap">
          <Mail size={18} aria-hidden="true" />
          <input
            id="auth-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={254}
            required
            placeholder="tu@correo.com"
            aria-invalid={Boolean(error)}
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="auth-password">Contraseña</label>
        <div className="input-wrap">
          <Lock size={18} aria-hidden="true" />
          <input
            id="auth-password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={10}
            maxLength={128}
            required
            placeholder="Mínimo 10 caracteres"
            aria-invalid={Boolean(error)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isRegister && (
        <label className="privacy-check">
          <input
            type="checkbox"
            name="privacy"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
            required
          />
          <span>
            Acepto el <Link href="/privacy">aviso de privacidad</Link>.
          </span>
        </label>
      )}

      {error && (
        <p className="form-error" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
        <span>{loading ? "Espera un momento" : isRegister ? "Crear cuenta" : "Entrar a la app"}</span>
      </button>
    </form>
  );
}
