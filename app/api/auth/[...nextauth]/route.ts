import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handler = NextAuth(authOptions);
type Context = { params: Promise<{ nextauth: string[] }> };
function relativeUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try { const parsed = new URL(value, "https://relative.invalid"); return parsed.pathname + parsed.search + parsed.hash; } catch { return "/login"; }
}
async function authHandler(request: NextRequest, context: Context) {
  const result: Response = await handler(request, context);
  const location = result.headers.get("location");
  if (location) result.headers.set("location", relativeUrl(location) as string);
  if (result.headers.get("content-type")?.includes("application/json")) {
    const body = await result.json();
    if (body && typeof body === "object") {
      if ("url" in body) body.url = relativeUrl(body.url);
      if (request.nextUrl.pathname.endsWith("/providers")) for (const provider of Object.values(body) as {signinUrl?:unknown;callbackUrl?:unknown}[]) {
        if (provider?.signinUrl) provider.signinUrl = relativeUrl(provider.signinUrl);
        if (provider?.callbackUrl) provider.callbackUrl = relativeUrl(provider.callbackUrl);
      }
    }
    return new Response(JSON.stringify(body), { status: result.status, headers: result.headers });
  }
  return result;
}
export { authHandler as GET, authHandler as POST };
