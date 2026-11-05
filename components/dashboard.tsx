"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bell, Compass, Code2, Crosshair, HelpCircle, Layers3, Loader2, LogOut, Map as MapIcon, Menu, Minus, Plus, Route, X } from "lucide-react";
import { Brand } from "./brand";
import { BusPopup } from "./BusPopup";
import { Sidebar } from "./Sidebar";
import { useDashboard } from "@/stores/dashboard";
import { useLiveBuses } from "@/lib/useLiveBuses";
import type { Coordinate, FleetSnapshot, Station, TransitNetwork } from "@/lib/transit-types";

const LiveMap = dynamic(() => import("./LiveMap").then((module) => module.LiveMap), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="loading-ring"/>Conectando con la ciudad…</div>,
});

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  });
}

interface DashboardProps {
  network: TransitNetwork;
  initialFleet: FleetSnapshot;
  user: { name?: string | null; email?: string | null };
}

export function Dashboard({ network, initialFleet, user }: DashboardProps) {
  const state = useDashboard();
  const { fleet, refreshing, error, traces, calls, refresh } = useLiveBuses(initialFleet);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [focus, setFocus] = useState<{ key: string; lineId?: number; coordinates?: Coordinate; zoom?: number } | null>(null);
  const [command, setCommand] = useState<{ type: "zoom-in" | "zoom-out" | "reset" | "pitch"; nonce: number } | null>(null);
  const [selectedStation, setSelectedStation] = useState<{ station: Station; lineId: number } | null>(null);
  const [clock, setClock] = useState(initialFleet.timestamp);

  const openPanel = () => {
    setSidebarOpen(true);
    setMobileOpen(window.matchMedia("(max-width: 900px)").matches);
  };
  const closePanel = () => {
    setSidebarOpen(false);
    setMobileOpen(false);
  };

  useEffect(() => {
    const clockTimer = window.setInterval(() => setClock(new Date().toISOString()), 1000);
    return () => window.clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const closeDesktopDrawer = () => { if (!media.matches) setMobileOpen(false); };
    media.addEventListener("change", closeDesktopDrawer);
    return () => media.removeEventListener("change", closeDesktopDrawer);
  }, []);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable]")) return;
      if (event.key.toLowerCase() === "r") { state.toggleRecording(); setMobileOpen(false); }
      if (event.key === "Escape") {
        if (state.recording) state.toggleRecording();
        state.selectVehicle(null);
        setSelectedStation(null);
        setAlertsOpen(false);
        setHelpOpen(false);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [state]);

  const visibleVehicles = useMemo(
    () => fleet.vehicles.filter((vehicle) => state.selectedLines.includes(vehicle.line_id) && (state.serviceFilter === "all" || vehicle.service_type === state.serviceFilter)),
    [fleet.vehicles, state.selectedLines, state.serviceFilter],
  );
  const selectedVehicle = visibleVehicles.find((vehicle) => vehicle.id === state.selectedId);
  const selectedVehicleLine = network.lines.find((line) => line.id === selectedVehicle?.line_id);
  const stationLine = network.lines.find((line) => line.id === selectedStation?.lineId);

  const focusLine = (line: { id: number; code: string }) => {
    setSelectedStation(null);
    setFocus({ key: `line-${line.id}-${Date.now()}`, lineId: line.id });
  };
  const focusStation = (station: Station, lineId: number) => {
    setFocus({ key: `${lineId}-${station.id}-${Date.now()}`, coordinates: station.coordinates, zoom: 15.2 });
    setSelectedStation({ station, lineId });
  };
  const runCommand = (type: "zoom-in" | "zoom-out" | "reset" | "pitch") => {
    setCommand({ type, nonce: Date.now() });
    if (type === "reset") {
      setFocus(null);
      state.selectVehicle(null);
      setSelectedStation(null);
    }
  };
  const resetFilters = () => {
    const lineIds = network.lines.map((line) => line.id);
    state.setLines(lineIds);
    state.setServiceFilter("all");
    setSelectedStation(null);
  };

  const sidebarProps = {
    network,
    fleet,
    user,
    refreshing,
    calls,
    traces,
    onClose: closePanel,
    onMobileClose: () => setMobileOpen(false),
    onAlertsOpen: () => setAlertsOpen(true),
    onToggleRecording: state.toggleRecording,
    onLineFocus: focusLine,
    onStationFocus: focusStation,
    onSelectionReset: () => setSelectedStation(null),
  };

  return <main className={`dashboard ${state.recording ? "is-recording" : ""} ${sidebarOpen ? "sidebar-visible" : "sidebar-collapsed"}`}>
    {!state.recording && <>
      <aside className="app-rail">
        <Brand compact/>
        <div className="rail-main"><button className="rail-button active" aria-label="Mostrar mapa" onClick={() => setSidebarOpen(!sidebarOpen)}><MapIcon size={20}/></button><button className="rail-button" aria-label="Ver filtros de líneas" onClick={openPanel}><Route size={20}/></button><button className={`rail-button ${alertsOpen ? "active" : ""}`} aria-label="Alertas de servicio" onClick={() => setAlertsOpen(!alertsOpen)}><Bell size={20}/><i/></button></div>
        <div className="rail-bottom"><button className="rail-button" onClick={() => setHelpOpen(true)} aria-label="Ayuda de los controles"><HelpCircle size={20}/></button><Link className="rail-button" href="/docs" aria-label="Documentación"><Code2 size={20}/></Link><div className="rail-divider"/><button className="user-avatar" aria-label={`Cerrar sesión de ${user.name ?? user.email ?? "usuario"}`} title="Cerrar sesión" onClick={() => void signOut({ redirect: false }).then(() => window.location.assign("/login"))}>{(user.name ?? user.email ?? "M").charAt(0).toUpperCase()}<LogOut size={12}/></button></div>
      </aside>
      {sidebarOpen && <aside className="dashboard-sidebar" aria-label="Panel de Metrobús"><Sidebar {...sidebarProps}/></aside>}
    </>}

    <section className="dashboard-map-area" aria-label="Mapa interactivo de Metrobús CDMX">
      <LiveMap network={network} vehicles={fleet.vehicles} selectedLines={state.selectedLines} serviceFilter={state.serviceFilter} showRoutes={state.showRoutes} trails={state.trails} recording={state.recording} selectedId={state.selectedId} following={state.following} focus={focus} command={command} onVehicleSelect={(id) => { state.selectVehicle(id); setSelectedStation(null); }} onStationSelect={(station, lineId) => { setSelectedStation({ station, lineId }); state.selectVehicle(null); }}/>
      {!state.recording && <>
        <div className="map-header"><button className="map-panel-button icon-button" onClick={openPanel} aria-label="Abrir panel de líneas"><Menu size={18}/></button><div className="map-heading"><span className="map-heading-title">Ciudad de México <ArrowUpRight size={12}/></span><span>METROBÚS / VISTA DE RED</span></div><div className="map-header-right"><span className="map-demo"><span className="status-dot"/> SIMULACIÓN</span><span className="map-clock mono">{formatTime(clock)} <small>CDMX</small></span></div></div>
        <div className="map-controls"><button aria-label="Acercar mapa" onClick={() => runCommand("zoom-in")}><Plus size={19}/></button><button aria-label="Alejar mapa" onClick={() => runCommand("zoom-out")}><Minus size={19}/></button><span/><button aria-label="Centrar toda la red" onClick={() => runCommand("reset")}><Crosshair size={18}/></button><button aria-label="Alternar perspectiva 3D" onClick={() => runCommand("pitch")}><Compass size={19}/></button></div>
        <div className="map-bottom-status"><span className="status-dot"/><span>{visibleVehicles.length} unidades visibles</span><i/><span>{state.selectedLines.length} / {network.lines.length} líneas</span><span className="desktop-only">CARTO DARK MATTER</span></div>
        {error && <div className="connection-error" role="alert"><span>{error}</span><button onClick={() => void refresh()} disabled={refreshing}>{refreshing ? <Loader2 size={15} className="spin"/> : "Reintentar"}</button></div>}
        {!visibleVehicles.length && <div className="map-empty-state"><Layers3 size={28}/><h3>No hay unidades visibles</h3><p>Activa una línea o restablece el tipo de unidad.</p><button className="primary-button" onClick={resetFilters}>Mostrar toda la red</button></div>}
        {selectedVehicle && selectedVehicleLine && <BusPopup vehicle={selectedVehicle} line={selectedVehicleLine} network={network} following={state.following} onToggleFollow={state.toggleFollow} onClose={() => state.selectVehicle(null)}/>}
        {selectedStation && stationLine && <BusPopup station={selectedStation.station} line={stationLine} network={network} vehicles={visibleVehicles} onClose={() => setSelectedStation(null)}/>}
      </>}
      {state.recording && <><div className="recording-counter"><Brand/><span className="recording-eyebrow"><span className="record-dot"/> MODO GRABACIÓN · DEMO</span><strong>{visibleVehicles.length}</strong><span>buses en vía ahora mismo</span></div><button className="exit-recording" onClick={state.toggleRecording}><X size={17}/> Salir del modo grabación <kbd>Esc</kbd></button><span className="recording-note">Vista cinematográfica · posiciones simuladas · usa tu capturador de pantalla</span></>}
    </section>

    <Dialog.Root open={mobileOpen && !state.recording} onOpenChange={setMobileOpen}><Dialog.Portal><Dialog.Overlay className="drawer-overlay"/><Dialog.Content className="mobile-panel"><Dialog.Title className="sr-only">Panel de líneas y filtros</Dialog.Title><Dialog.Description className="sr-only">Busca estaciones y selecciona las líneas de Metrobús visibles.</Dialog.Description><Dialog.Close className="mobile-panel-close icon-button" aria-label="Cerrar panel"><X size={18}/></Dialog.Close><Sidebar {...sidebarProps}/></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={alertsOpen} onOpenChange={setAlertsOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="info-dialog"><Dialog.Title>Alertas de servicio <Bell size={20}/></Dialog.Title><Dialog.Description>Ejemplos de alertas para la versión de demostración.</Dialog.Description><div className="service-alert"><span className="line-badge" style={{ background: "#D40D0D" }}>L1</span><div><span className="demo-label">EJEMPLO SIMULADO</span><h3>Mayor afluencia en Insurgentes</h3><p>Una alerta real aparecerá aquí cuando se conecte una fuente oficial. Este mensaje no describe una incidencia actual.</p></div></div><Link className="text-link" target="_blank" href="https://www.metrobus.cdmx.gob.mx/">Consulta los avisos oficiales <ArrowUpRight size={15}/></Link><Dialog.Close className="dialog-close icon-button" aria-label="Cerrar alertas"><X size={18}/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="info-dialog"><Dialog.Title>Explora a tu ritmo <Compass size={21}/></Dialog.Title><Dialog.Description>El mapa es interactivo y los filtros son reversibles.</Dialog.Description><div className="help-content"><p><strong>Busca</strong> una línea o estación y presiona Enter para enfocarla.</p><p><strong>Selecciona</strong> una unidad para ver su información y seguirla.</p><p><strong>Activa estelas</strong> para ver las seis últimas posiciones reportadas.</p><p><kbd>R</kbd> abre el modo grabación. <kbd>Esc</kbd> vuelve al mapa normal. Este modo no genera un archivo de video.</p><p>Rutas GTFS reales. Posiciones, velocidades y alertas simuladas.</p></div><Dialog.Close className="dialog-close icon-button" aria-label="Cerrar ayuda"><X size={18}/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </main>;
}
