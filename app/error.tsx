"use client";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Brand } from "@/components/brand";
export default function ErrorPage({ reset }: { error: Error & {digest?:string}; reset:()=>void }) { return <main className="error-page"><Brand/><span className="eyebrow">UN ALTO EN EL CAMINO</span><h1>Hagamos otro intento.</h1><p>No pudimos cargar esta parte de la ciudad. Tus datos no se han modificado.</p><div className="error-actions"><button className="primary-button" onClick={reset}>Reintentar <RotateCcw size={15}/></button><Link className="outline-button" href="/">Ir al inicio</Link></div></main>; }
