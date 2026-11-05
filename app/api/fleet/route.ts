import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transitProvider } from "@/lib/transit";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  return Response.json(await transitProvider.getFleet(), { headers: { "Cache-Control": "private, no-store" } });
}
