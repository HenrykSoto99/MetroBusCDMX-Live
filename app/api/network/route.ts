import { network } from "@/lib/transit";
export async function GET() { return Response.json(network, { headers: { "Cache-Control": "public, max-age=3600" } }); }
