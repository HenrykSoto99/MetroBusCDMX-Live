import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { consumeRateLimit } from "@/lib/rate-limit";
import { firstValidationMessage, registerInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: Record<string, unknown>, status: number): NextResponse {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "no-store");
  return result;
}

function requestAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ error: "El cuerpo de la solicitud no es válido." }, 400);
  }

  const parsed = registerInputSchema.safeParse(body);
  if (!parsed.success) {
    return response({ error: firstValidationMessage(parsed.error) }, 400);
  }

  const { name, email, password } = parsed.data;
  try {
    if (!(await consumeRateLimit("register-global", 50, 60_000))) {
      return response({ error: "La creación de cuentas tiene alta demanda. Espera un minuto e inténtalo de nuevo.", code: "RATE_LIMITED" }, 429);
    }
    if (!(await consumeRateLimit(`register-ip:${requestAddress(request)}`))) {
      return response({ error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.", code: "RATE_LIMITED" }, 429);
    }
    if (!(await consumeRateLimit(`register-email:${email}`))) {
      return response({ error: "Demasiados intentos para este correo. Espera unos minutos e inténtalo de nuevo.", code: "RATE_LIMITED" }, 429);
    }

    const passwordHash = await hashPassword(password);
    await getPool().execute(
      "INSERT INTO metrobus_users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
      [randomUUID(), name, email, passwordHash],
    );

    return response({ ok: true }, 201);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") {
      return response({ error: "Ya existe una cuenta con ese correo electrónico." }, 409);
    }

    console.error("No se pudo crear la cuenta", error);
    return response({ error: "No pudimos crear tu cuenta. Inténtalo de nuevo." }, 500);
  }
}
