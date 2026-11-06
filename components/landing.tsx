"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowRight, Menu, X, Radio, Route, Layers3, MoveUpRight, ScanLine, Bell, Github, ChevronRight, MapPin, Plus, Minus, RotateCcw } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { PreferenceControls } from "./preference-controls";
import { useTranslation } from "@/lib/preferences";
import { createMetrobusMock } from "@/lib/metrobus-mock";
import type { FleetSnapshot, TransitNetwork } from "@/lib/transit-types";

function LinkedInMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.2 7.3A2.2 2.2 0 1 0 5.2 2.9a2.2 2.2 0 0 0 0 4.4ZM3.3 21.1h3.8V9.1H3.3v12Zm6.2 0h3.8v-6.7c0-1.8.3-3.6 2.6-3.6 2.3 0 2.3 2.1 2.3 3.7v6.6H22v-7.4c0-3.6-.8-6.3-5.1-6.3-2.1 0-3.5 1.1-4.1 2.1h-.1V9.1H9.5v12Z"/></svg>;
}

function InstagramMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/></svg>;
}

function FacebookMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.7 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H8v3.1h2.6v8h3.1Z"/></svg>;
}

function MapLoading() {
  const { t } = useTranslation();
  return <div className="map-loading"><span className="loading-ring"/>{t("Cargando la ciudad…", "Loading the city…")}</div>;
}

const BusMap = dynamic(() => import("./bus-map").then(module => module.BusMap), { ssr: false, loading: () => <MapLoading/> });

export function Landing({ network, initialFleet }: { network: TransitNetwork; initialFleet: FleetSnapshot }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fleet, setFleet] = useState(initialFleet);
  const [fleetReady, setFleetReady] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapCommand, setMapCommand] = useState<{ type: "zoom-in" | "zoom-out" | "reset"; nonce: number } | null>(null);
  const runMapCommand = (type: "zoom-in" | "zoom-out" | "reset") => {
    if (!mapReady) return;
    if (type === "reset") setSelectedLine(null);
    setMapCommand(previous => ({ type, nonce: (previous?.nonce ?? 0) + 1 }));
  };
  const selectPreviewLine = (id: number) => {
    if (selectedLine === id) {
      setSelectedLine(null);
      runMapCommand("reset");
    } else setSelectedLine(id);
  };
  const features = [
    { number: "01", icon: Radio, title: t("La red, en un vistazo.", "The network, at a glance."), text: t("Unidades en movimiento sobre un mapa real de la CDMX. Todo el sistema, sin cambiar de pantalla.", "Moving vehicles on a real CDMX map. The whole system, without leaving the screen."), detail: t("MAPA INTERACTIVO", "INTERACTIVE MAP") },
    { number: "02", icon: Route, title: t("Tu línea. Tu camino.", "Your line. Your way."), text: t("Busca estaciones, filtra tus líneas y encuentra el recorrido que te conecta con la ciudad.", "Search stations, filter lines, and find the route that connects you to the city."), detail: t("SIETE LÍNEAS, UNA RED", "SEVEN LINES, ONE NETWORK") },
    { number: "03", icon: ScanLine, title: t("Sigue el movimiento.", "Follow the movement."), text: t("Activa estelas, sigue una unidad o entra al modo grabación para ver la ciudad desde otra perspectiva.", "Turn on trails, follow a vehicle, or enter recording mode to see the city from another perspective."), detail: t("CADA RECORRIDO CUENTA", "EVERY ROUTE MATTERS") },
  ];

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
    // The SSR snapshot supplies counts only. Never animate from its old clock to now.
    setFleet(createMetrobusMock());
    setFleetReady(true);
    const interval = setInterval(() => { if (!document.hidden) setFleet(createMetrobusMock()); }, 12000);
    return () => { cancelAnimationFrame(frame); clearInterval(interval); };
  }, [initialFleet.vehicles.length, network]);
  const line = network.lines.find(item => item.id === selectedLine);
  const networkSummary = line
    ? `${line.from} → ${line.to} · ${line.stations.length} ${t("paradas en la ruta seleccionada", "stops on the selected route")}`
    : t("De Indios Verdes a El Caminero. De El Rosario a Villa de Aragón. Una red que nos conecta.", "From Indios Verdes to El Caminero. From El Rosario to Villa de Aragón. One network that connects us.");

  return <div className="landing">
    <header className="site-header">
      <div className="header-inner"><Brand/>
        <nav className="desktop-nav" aria-label={t("Navegación principal", "Main navigation")}>
          <a href="#la-red">{t("La red", "The network")}</a><a href="#como-funciona">{t("Cómo funciona", "How it works")}</a><Link href="/docs">{t("Datos abiertos", "Open data")} <ArrowUpRight size={13}/></Link>
        </nav>
        <div className="header-actions"><PreferenceControls/><Link className="header-login" href="/login">{t("Iniciar sesión", "Sign in")}</Link><Button asChild size="sm"><Link href="/register">{t("Crear cuenta", "Create account")} <ArrowUpRight size={15}/></Link></Button><button className="mobile-menu-button icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? t("Cerrar menú", "Close menu") : t("Abrir menú", "Open menu")} data-icon-hint={menuOpen ? t("Cerrar menú", "Close menu") : t("Abrir menú", "Open menu")} aria-expanded={menuOpen}>{menuOpen ? <X/> : <Menu/>}</button></div>
      </div>
      {menuOpen && <nav className="mobile-nav" aria-label={t("Navegación móvil", "Mobile navigation")}><a onClick={() => setMenuOpen(false)} href="#la-red">{t("La red", "The network")}</a><a onClick={() => setMenuOpen(false)} href="#como-funciona">{t("Cómo funciona", "How it works")}</a><Link href="/docs">{t("Datos abiertos", "Open data")}</Link><Link href="/login">{t("Iniciar sesión", "Sign in")}</Link><Link href="/register">{t("Crear cuenta", "Create account")}</Link></nav>}
    </header>

    <main>
      <section className="hero" aria-label="MetroBusCDMX-Live">
        <div className="hero-map-scene">
          {fleetReady ? <BusMap network={network} vehicles={fleet.vehicles} dataSource={fleet.source} variant="hero" selectedLines={selectedLine ? [selectedLine] : undefined} focus={selectedLine ? { key: `hero-${selectedLine}`, lineId: selectedLine } : null} command={mapCommand} onMapAvailabilityChange={setMapReady} onMapReady={() => setMapReady(true)}/> : <MapLoading/>}
          <div className="hero-map-shade"/>
          <div className="hero-map-top"><span><MapPin size={12}/> {t("CIUDAD DE MÉXICO", "MEXICO CITY")}</span><span className="map-simulation"><span className="status-dot"/> {t("DEMO EN MOVIMIENTO", "MOVING DEMO")}</span></div>
          <div className="hero-map-navigation" aria-label={t("Navegación del mapa", "Map navigation")}>
            <div className="hero-map-controls">
              <button type="button" onClick={() => runMapCommand("zoom-in")} aria-disabled={!mapReady} aria-label={t("Acercar mapa", "Zoom in")} data-icon-hint={t("Acercar mapa", "Zoom in")}><Plus size={17}/></button>
              <button type="button" onClick={() => runMapCommand("zoom-out")} aria-disabled={!mapReady} aria-label={t("Alejar mapa", "Zoom out")} data-icon-hint={t("Alejar mapa", "Zoom out")}><Minus size={17}/></button>
              <button type="button" onClick={() => runMapCommand("reset")} aria-disabled={!mapReady} aria-label={t("Restablecer vista inicial", "Reset initial view")} data-icon-hint={t("Restablecer vista inicial", "Reset initial view")}><RotateCcw size={16}/></button>
            </div>
            <span>{t("Scroll para acercar o alejar", "Scroll to zoom in or out")}</span>
          </div>
          <div className="map-crosshair" aria-hidden="true"><span/><span/></div>
          <div className="hero-coordinate">19.4326° N<br/>99.1332° W</div>
          <div className="hero-fleet-card"><span className="fleet-card-icon"><Radio size={18}/></span><div><span className="eyebrow">{t("EL PULSO DE LA RED", "THE NETWORK'S PULSE")}</span><div className="fleet-card-value">{count}<span>{t("buses en vía", "buses on route")}</span></div><span className="fleet-card-note"><span className="status-dot"/>{mapReady ? t("Posiciones simuladas · actualización cada 12 s", "Simulated positions · updates every 12 s") : t("Preparando el mapa de la ciudad", "Preparing the city map")}</span></div><div className="mini-bars" aria-hidden="true">{[30,48,42,64,53,72,62,84,68,96,82].map((height,i) => <i key={i} style={{height:`${height}%`}}/>)}</div></div>
        </div>
        <div className="hero-content page-container">
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow"><span className="live-spark"/> METROBUSCDMX-LIVE</span>
            <h1>{t("Tu ciudad.", "Your city.")}<br/><span>{t("En movimiento.", "In motion.")}</span></h1>
            <p className="hero-description">{t("Todas las unidades del Metrobús de la CDMX en un solo mapa.", "Every Metrobús vehicle in CDMX on one map.")} <span>{t("Conoce la red. Encuentra tu línea. Sigue el movimiento.", "Learn the network. Find your line. Follow the movement.")}</span></p>
            <div className="hero-ctas"><Button asChild><Link href="/login">{t("Entrar a la app", "Open the app")} <ArrowUpRight size={20}/></Link></Button><Link href="/register" className="hero-secondary">{t("Crear cuenta gratis", "Create a free account")} <ArrowRight size={17}/></Link></div>
            <p className="hero-free-note"><span/> {t("Sin costo. Sin vueltas. Hecho para moverte.", "Free to use. No detours. Made to keep you moving.")}</p>
          </div>
          <div className="hero-bottom"><span className="hero-scroll"><span className="scroll-line"/> {t("DESCUBRE LA RED", "DISCOVER THE NETWORK")}</span><span className="hero-bottom-note">{t("RUTAS REALES. POSICIONES SIMULADAS.", "REAL ROUTES. SIMULATED POSITIONS.")}</span></div>
        </div>
      </section>

      <section className="network-section page-container" id="la-red">
        <div className="network-label"><span className="eyebrow">{t("UNA CIUDAD. SIETE LÍNEAS.", "ONE CITY. SEVEN LINES.")}</span><span className="muted">{t("Elige una línea para verla en el mapa", "Choose a line to preview it on the map")} <MoveUpRight size={13}/></span></div>
        <div className="line-selector" role="group" aria-label={t("Seleccionar una línea para previsualizar", "Select a line to preview")}>
          {network.lines.map(item => <button key={item.id} className={`landing-line ${selectedLine === item.id ? "selected" : ""}`} onClick={() => selectPreviewLine(item.id)} aria-pressed={selectedLine === item.id} style={{ "--line-color": item.color } as React.CSSProperties}><span className="line-square">{item.code}</span><span>{item.name}</span><ArrowUpRight size={15}/></button>)}
        </div>
        <div className="network-meta"><span>{networkSummary}</span><Link href="/docs">{t("Explorar los datos", "Explore the data")} <ChevronRight size={13}/></Link></div>
      </section>

      <section className="features-section page-container" id="como-funciona">
        <div className="section-heading"><div><span className="eyebrow"><span className="tiny-red-line"/> {t("MÁS INFORMACIÓN. MENOS INCERTIDUMBRE.", "MORE INFORMATION. LESS UNCERTAINTY.")}</span><h2>{t("Muévete con", "Move with")}<br/>{t("otra perspectiva.", "a different perspective.")}</h2></div><p>{t("Una nueva manera de entender el Metrobús.", "A new way to understand Metrobús.")}<br/>{t("Diseñada para quienes vivimos la ciudad", "Designed for those of us who live in the city")}<br/>{t("todos los días.", "every day.")}</p></div>
        <div className="feature-grid">{features.map(({number,icon:Icon,title,text,detail}) => <article key={number} className="feature-item"><div className="feature-top"><Icon size={24} strokeWidth={1.5}/><span>{number} /</span></div><h3>{title}</h3><p>{text}</p><span className="feature-detail">{detail}<ArrowUpRight size={14}/></span></article>)}</div>
        <div className="feature-footnote"><Bell size={14}/><span>{t("DEMO: Alertas de servicio y filtros por tipo de unidad, dentro de la app.", "DEMO: Service alerts and vehicle-type filters, inside the app.")}</span><span className="demo-label">DEMO</span></div>
      </section>

      <section className="open-data-section page-container"><div className="open-data-copy"><span className="eyebrow">{t("ABIERTA POR NATURALEZA", "OPEN BY NATURE")}</span><h2>{t("La ciudad es de todos.", "The city belongs to everyone.")}<br/>{t("Sus datos, también.", "So does its data.")}</h2><p>{t("Construida con los datos abiertos GTFS del Metrobús. Geometrías y estaciones reales, en una experiencia independiente, clara y accesible.", "Built with Metrobús open GTFS data. Real geometries and stations in an independent, clear, and accessible experience.")}</p><Link href="/docs" className="text-link">{t("Conoce de dónde viene la información", "Learn where the information comes from")} <ArrowUpRight size={17}/></Link></div><div className="open-data-art" aria-hidden="true"><div className="flow-band band-1"/><div className="flow-band band-2"/><div className="flow-band band-3"/><div className="flow-band band-4"/><Layers3 size={64} strokeWidth={1}/><span>OPEN DATA<br/>CDMX / 2026</span></div></section>
      <section className="cta-section"><div className="cta-band"/><div className="page-container cta-inner"><span className="eyebrow">{t("TU PRÓXIMA RUTA EMPIEZA AQUÍ", "YOUR NEXT ROUTE STARTS HERE")}</span><h2>{t("Conéctate con", "Connect with")}<br/>{t("el ritmo de la ciudad.", "the rhythm of the city.")}</h2><Button asChild><Link href="/register">{t("Crear cuenta gratis", "Create a free account")} <ArrowUpRight size={20}/></Link></Button><p>{t("7 líneas. Un mapa. La CDMX en tus manos.", "7 lines. One map. CDMX in your hands.")}</p></div></section>
    </main>
    <footer className="site-footer page-container"><div className="footer-top"><Brand/><div className="footer-links"><Link href="/docs">{t("Documentación", "Documentation")}</Link><Link href="/privacy">{t("Privacidad", "Privacy")}</Link><a href="https://github.com/croma-labs/transmilenio-live" target="_blank" rel="noreferrer" aria-label={t("Repositorio público de referencia", "Public reference repository")}><Github size={18}/></a></div><span className="footer-data"><span className="status-dot"/> {t("Impulsado por datos abiertos de CDMX", "Powered by open CDMX data")}</span></div><div className="footer-bottom"><span>© {new Date().getFullYear()} MetroBusCDMX-Live. {t("Proyecto independiente, no oficial.", "Independent, unofficial project.")}</span><span>{t("Versión demo · posiciones y alertas simuladas.", "Demo version · simulated positions and alerts.")}</span></div><div className="footer-credit"><span>Hecho por <a href="https://www.karmabytesociety.com" target="_blank" rel="noreferrer">KarmaByte Society 2026 <ArrowUpRight size={12}/></a></span><div className="footer-socials" aria-label="KarmaByte Society en redes sociales"><a href="https://www.linkedin.com/company/karmabyte-society-ai-agency-automation/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><LinkedInMark/></a><a href="https://www.instagram.com/karmabytesocietyagency/" target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramMark/></a><a href="https://www.facebook.com/profile.php?id=61594707387349" target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookMark/></a></div></div></footer>
  </div>;
}
