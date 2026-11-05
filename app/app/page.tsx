import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Dashboard } from "@/components/dashboard";
import { network, transitProvider } from "@/lib/transit";
export const metadata: Metadata = { title: "Mapa de la red", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AppPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <Dashboard network={network} initialFleet={await transitProvider.getFleet()} user={{name:session.user.name,email:session.user.email}}/>;
}
