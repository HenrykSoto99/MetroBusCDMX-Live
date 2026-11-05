import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth-page";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false, follow: false } };

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/app");
  return <AuthPage mode="register"/>;
}
