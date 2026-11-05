import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
export default function NotFound() { return <main className="error-page"><Brand/><span className="error-number">404</span><h1>Esta ruta no existe.</h1><p>A veces el camino cambia. Vuelve al inicio y encuentra una nueva dirección.</p><Link className="primary-button" href="/">Volver al inicio <ArrowUpRight size={18}/></Link></main>; }
