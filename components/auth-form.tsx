"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { credentialsSchema, registerInputSchema } from "@/lib/validation";
import { useTranslation } from "@/lib/preferences";

type AuthMode = "login" | "register";
type Translate = (es: string, en: string) => string;

type AuthFormProps = {
  mode: AuthMode;
};

const validationCopy: Record<string, [string, string]> = {
  "El correo electrónico es obligatorio.": ["El correo electrónico es obligatorio.", "Email is required."],
  "El correo electrónico es demasiado largo.": ["El correo electrónico es demasiado largo.", "Email is too long."],
  "Ingresa un correo electrónico válido.": ["Ingresa un correo electrónico válido.", "Enter a valid email address."],
  "La contraseña es obligatoria.": ["La contraseña es obligatoria.", "Password is required."],
  "La contraseña debe tener al menos 10 caracteres.": ["La contraseña debe tener al menos 10 caracteres.", "Password must be at least 10 characters."],
  "La contraseña no puede superar 128 caracteres.": ["La contraseña no puede superar 128 caracteres.", "Password cannot exceed 128 characters."],
  "El nombre es obligatorio.": ["El nombre es obligatorio.", "Name is required."],
  "El nombre debe tener al menos 2 caracteres.": ["El nombre debe tener al menos 2 caracteres.", "Name must be at least 2 characters."],
  "El nombre no puede superar 70 caracteres.": ["El nombre no puede superar 70 caracteres.", "Name cannot exceed 70 characters."],
};

function validationError(message: unknown, t: Translate): string {
  if (typeof message !== "string") return t("Revisa los datos e inténtalo de nuevo.", "Please check your information and try again.");
  const copy = validationCopy[message];
  return copy ? t(copy[0], copy[1]) : t(message, "Please check your information and try again.");
}

function authError(message: unknown, t: Translate): string {
  if (typeof message !== "string") return t("No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo.", "We couldn't sign you in. Check your details and try again.");
  const validation = validationCopy[message];
  if (validation) return t(validation[0], validation[1]);
  const normalized = message.toLowerCase();
  if (message === "RATE_LIMITED" || normalized.includes("demasiados") || normalized.includes("alta demanda")) {
    return t("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.", "Too many attempts. Wait a few minutes and try again.");
  }
  if (normalized.includes("credentialssignin") || normalized.includes("configuration") || normalized.includes("correo y contraseña no válidos")) {
    return t("El correo o la contraseña no son correctos.", "The email or password is incorrect.");
  }
  if (normalized.includes("ya existe") || normalized.includes("duplicate") || normalized.includes("already exists")) {
    return t("Ya existe una cuenta con ese correo electrónico.", "An account with that email already exists.");
  }
  if (normalized.includes("cuerpo de la solicitud") || normalized.includes("request body")) {
    return t("El cuerpo de la solicitud no es válido.", "The request body is invalid.");
  }
  if (normalized.includes("no pudimos crear tu cuenta") || normalized.includes("couldn't create your account")) {
    return t("No pudimos crear tu cuenta. Inténtalo de nuevo.", "We couldn't create your account. Please try again.");
  }
  return t(message, "Something went wrong. Please try again.");
}

export function AuthForm({ mode }: AuthFormProps) {
  const { t } = useTranslation();
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
      setError(t("Debes aceptar el aviso de privacidad para continuar.", "You must accept the privacy notice to continue."));
      return;
    }

    const parsed = isRegister
      ? registerInputSchema.safeParse({ name, email, password })
      : credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(validationError(parsed.error.issues[0]?.message, t));
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
        const result = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
        if (!response.ok) {
          setError(authError(result.code ?? result.error, t));
          return;
        }
      }

      // NextAuth's stock client parses its callback URL without a base. Our
      // application intentionally returns relative redirects for embedded Preview.
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      const { csrfToken } = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrfToken) {
        setError(t("No se pudo preparar la sesión.", "We couldn't prepare your session."));
        return;
      }
      const loginResponse = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password, csrfToken, callbackUrl: "/app", json: "true" }),
      });
      const result = await loginResponse.json() as { url?: string };
      const authFailure = result.url ? new URL(result.url, window.location.origin).searchParams.get("error") : "Configuration";
      if (!loginResponse.ok || authFailure) {
        setError(authError(authFailure, t));
        return;
      }
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await sessionResponse.json() as { user?: { email?: string } };
      if (!session.user) {
        setError(t("Tu navegador no conservó la sesión. Abre la app en una pestaña independiente o permite cookies para este sitio.", "Your browser did not keep the session. Open the app in a separate tab or allow cookies for this site."));
        return;
      }

      window.location.assign("/app");
    } catch {
      setError(t("No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.", "We couldn't connect. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={loading}>
      {isRegister && (
        <div className="form-field">
          <label htmlFor="auth-name">{t("Nombre", "Name")}</label>
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
              placeholder={t("Cómo te llamamos", "What should we call you?")}
              aria-invalid={Boolean(error)}
            />
          </div>
        </div>
      )}

      <div className="form-field">
        <label htmlFor="auth-email">{t("Correo electrónico", "Email")}</label>
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
            placeholder={t("tu@correo.com", "you@example.com")}
            aria-invalid={Boolean(error)}
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="auth-password">{t("Contraseña", "Password")}</label>
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
            placeholder={t("Mínimo 10 caracteres", "At least 10 characters")}
            aria-invalid={Boolean(error)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? t("Ocultar contraseña", "Hide password") : t("Mostrar contraseña", "Show password")}
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
            {t("Acepto el ", "I accept the ")}<Link href="/privacy">{t("aviso de privacidad", "privacy notice")}</Link>{t(".", ".")}
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
        <span>{loading ? t("Espera un momento", "Please wait") : isRegister ? t("Crear cuenta", "Create account") : t("Entrar a la app", "Sign in")}</span>
      </button>
    </form>
  );
}
