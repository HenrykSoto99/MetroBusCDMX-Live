"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowRight, Menu, X, Radio, Route, Layers3, MoveUpRight, ScanLine, Bell, Github, ChevronRight, MapPin } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { createMetrobusMock } from "@/lib/metrobus-mock";
import type { FleetSnapshot, TransitNetwork } from "@/lib/transit-types";
const BusMap = dynamic(() => import("./bus-map").then(module => module.BusMap), { ssr: false, loading: () => <div className="map-loading"><span className="loading-ring"/>Cargando la ciudad…</div> });
const features = [
  { number: "01", icon: Radio, title: "La red, en un vistazo.", text: "Unidades en movimiento sobre un mapa real de la CDMX. Todo el sistema, sin cambiar de pantalla.", detail: "MAPA INTERACTIVO" },
  { number: "02", icon: Route, title: "Tu línea. Tu camino.", text: "Busca estaciones, filtra tus líneas y encuentra el recorrido que te conecta con la ciudad.", detail: "SIETE LÍNEAS, UNA RED" },
  { number: "03", icon: ScanLine, title: "Sigue el movimiento.", text: "Activa estelas, sigue una unidad o entra al modo grabación para ver la ciudad desde otra perspectiva.", detail: "CADA RECORRIDO CUENTA" },
];

export function Landing({ network, initialFleet }: { network: TransitNetwork; initialFleet: FleetSnapshot }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [fleet, setFleet] = useState(initialFleet);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const progress = reduced ? 1 : Math.min(1, (now - start) / 1600);
      setCount(Math.round(initialFleet.vehicles.length * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    setFleet(createMetrobusMock());
    const interval = setInterval(() => { if (!document.hidden) setFleet(createMetrobusMock()); }, 12000);
    return () => { cancelAnimationFrame(frame); clearInterval(interval); };
  }, [initialFleet.vehicles.length, network]);
  const line = network.lines.find(item => item.id === selectedLine);
  return <div className="landing">
    <header className="site-header">
      <div className="header-inner"><Brand />
        <nav className="desktop-nav" aria-label="Navegación principal">
          <a href="#la-red">La red</a><a href="#como-funciona">Cómo funciona</a><Link href="/docs">Datos abiertos <ArrowUpRight size={13}/></Link>
        </nav>
        <div className="header-actions"><Link className="header-login" href="/login">Iniciar sesión</Link><Button asChild size="sm"><Link href="/register">Crear cuenta <ArrowUpRight size={15}/></Link></Button><button className="mobile-menu-button icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen}>{menuOpen ? <X/> : <Menu/>}</button></div>
      </div>
      {menuOpen && <nav className="mobile-nav" aria-label="Navegación móvil"><a onClick={() => setMenuOpen(false)} href="#la-red">La red</a><a onClick={() => setMenuOpen(false)} href="#como-funciona">Cómo funciona</a><Link href="/docs">Datos abiertos</Link><Link href="/login">Iniciar sesión</Link></nav>}
    </header>

    <main>
      <section className="hero" aria-label="MetroBusCDMX-Live">
        <div className="hero-map-scene">
          <BusMap network={network} vehicles={fleet.vehicles} variant="hero" selectedLines={selectedLine ? [selectedLine] : undefined} focus={selectedLine ? { key: `hero-${selectedLine}`, lineId: selectedLine } : null} onMapReady={() => setMapReady(true)}/>
          <div className="hero-map-shade"/>
          <div className="hero-map-top"><span><MapPin size={12}/> CIUDAD DE MÉXICO</span><span className="map-simulation"><span className="status-dot"/> DEMO EN MOVIMIENTO</span></div>
          <div className="map-crosshair" aria-hidden="true"><span/><span/></div>
          <div className="hero-coordinate">19.4326° N<br/>99.1332° W</div>
          <div className="hero-fleet-card"><span className="fleet-card-icon"><Radio size={18}/></span><div><span className="eyebrow">EL PULSO DE LA RED</span><div className="fleet-card-value">{count}<span>buses en vía</span></div><span className="fleet-card-note"><span className="status-dot"/>{mapReady ? "Posiciones simuladas · actualización cada 12 s" : "Preparando el mapa de la ciudad"}</span></div><div className="mini-bars" aria-hidden="true">{[30,48,42,64,53,72,62,84,68,96,82].map((height,i) => <i key={i} style={{height:`${height}%`}}/>)}</div></div>
        </div>
        <div className="hero-content page-container">
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow"><span className="live-spark"/> METROBUSCDMX-LIVE</span>
            <h1>Tu ciudad.<br/><span>En movimiento.</span></h1>
            <p className="hero-description">Todas las unidades del Metrobús de la CDMX en un solo mapa. <span>Conoce la red. Encuentra tu línea. Sigue el movimiento.</span></p>
            <div className="hero-ctas"><Button asChild><Link href="/login">Entrar a la app <ArrowUpRight size={20}/></Link></Button><Link href="/register" className="hero-secondary">Crear cuenta gratis <ArrowRight size={17}/></Link></div>
            <p className="hero-free-note"><span/> Sin costo. Sin vueltas. Hecho para moverte.</p>
          </div>
          <div className="hero-bottom"><span className="hero-scroll"><span className="scroll-line"/> DESCUBRE LA RED</span><span className="hero-bottom-note">RUTAS REALES. POSICIONES SIMULADAS.</span></div>
        </div>
      </section>

      <section className="network-section page-container" id="la-red">
        <div className="network-label"><span className="eyebrow">UNA CIUDAD. SIETE LÍNEAS.</span><span className="muted">Elige una línea para verla en el mapa <MoveUpRight size={13}/></span></div>
        <div className="line-selector" role="group" aria-label="Seleccionar una línea para previsualizar">
          {network.lines.map(item => <button key={item.id} className={`landing-line ${selectedLine === item.id ? "selected" : ""}`} onClick={() => setSelectedLine(selectedLine === item.id ? null : item.id)} aria-pressed={selectedLine === item.id} style={{ "--line-color": item.color } as React.CSSProperties}><span className="line-square">{item.code}</span><span>{item.name}</span><ArrowUpRight size={15}/></button>)}
        </div>
        <div className="network-meta"><span>{line ? `${line.from} → ${line.to} · ${line.stations.length} paradas en la ruta seleccionada` : "De Indios Verdes a El Caminero. De El Rosario a Villa de Aragón. Una red que nos conecta."}</span><Link href="/docs">Explorar los datos <ChevronRight size={13}/></Link></div>
      </section>

      <section className="features-section page-container" id="como-funciona">
        <div className="section-heading"><div><span className="eyebrow"><span className="tiny-red-line"/> MÁS INFORMACIÓN. MENOS INCERTIDUMBRE.</span><h2>Muévete con<br/>otra perspectiva.</h2></div><p>Una nueva manera de entender el Metrobús.<br/>Diseñada para quienes vivimos la ciudad<br/>todos los días.</p></div>
        <div className="feature-grid">{features.map(({number,icon:Icon,title,text,detail}) => <article key={number} className="feature-item"><div className="feature-top"><Icon size={24} strokeWidth={1.5}/><span>{number} /</span></div><h3>{title}</h3><p>{text}</p><span className="feature-detail">{detail}<ArrowUpRight size={14}/></span></article>)}</div>
        <div className="feature-footnote"><Bell size={14}/><span>Alertas de servicio y filtros por tipo de unidad, dentro de la app.</span><span className="demo-label">DEMO</span></div>
      </section>

      <section className="open-data-section page-container"><div className="open-data-copy"><span className="eyebrow">ABIERTA POR NATURALEZA</span><h2>La ciudad es de todos.<br/>Sus datos, también.</h2><p>Construida con los datos abiertos GTFS del Metrobús. Geometrías y estaciones reales, en una experiencia independiente, clara y accesible.</p><Link href="/docs" className="text-link">Conoce de dónde viene la información <ArrowUpRight size={17}/></Link></div><div className="open-data-art" aria-hidden="true"><div className="flow-band band-1"/><div className="flow-band band-2"/><div className="flow-band band-3"/><div className="flow-band band-4"/><Layers3 size={64} strokeWidth={1}/><span>OPEN DATA<br/>CDMX / 2026</span></div></section>
      <section className="cta-section"><div className="cta-band"/><div className="page-container cta-inner"><span className="eyebrow">TU PRÓXIMA RUTA EMPIEZA AQUÍ</span><h2>Conéctate con<br/>el ritmo de la ciudad.</h2><Button asChild><Link href="/register">Crear cuenta gratis <ArrowUpRight size={20}/></Link></Button><p>7 líneas. Un mapa. La CDMX en tus manos.</p></div></section>
    </main>
    <footer className="site-footer page-container"><div className="footer-top"><Brand/><div className="footer-links"><Link href="/docs">Documentación</Link><Link href="/privacy">Privacidad</Link><a href="https://github.com/croma-labs/transmilenio-live" target="_blank" rel="noreferrer" aria-label="Repositorio de referencia en GitHub"><Github size={18}/></a></div><span className="footer-data"><span className="status-dot"/> Powered by open data CDMX</span></div><div className="footer-bottom"><span>© {new Date().getFullYear()} MetroBusCDMX-Live. Proyecto independiente, no oficial.</span><span>Versión demo · posiciones y alertas simuladas.</span></div></footer>
  </div>;
}
