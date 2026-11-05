"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bell, Compass, Code2, Crosshair, HelpCircle, Layers3, Loader2, LogOut, Map as MapIcon, Menu, Minus, Plus, Route, X } from "lucide-react";
import { Brand } from "./brand";
import { BusPopup } from "./BusPopup";
import { PreferenceControls } from "@/components/preference-controls";
import { Sidebar } from "./Sidebar";
import { useDashboard } from "@/stores/dashboard";
import { useLiveBuses } from "@/lib/useLiveBuses";
import { usePreferences, useTranslation } from "@/lib/preferences";
import type { Coordinate, FleetSnapshot, Station, TransitNetwork } from "@/lib/transit-types";

type Translate = (es: string, en: string) => string;

function formatTime(value: string, locale: string) {
  return new Date(value).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  });
}

function translateError(message: string, t: Translate) {
  const messages: Record<string, [string, string]> = {
    "No pudimos actualizar la simulación.": ["No pudimos actualizar la simulación.", "We couldn't update the simulation."],
    "La respuesta de la red no es válida.": ["La respuesta de la red no es válida.", "The network response is not valid."],
    "No hay conexión. Conservamos la última posición.": ["No hay conexión. Conservamos la última posición.", "There's no connection. We kept the last position."],
  };
  const translated = messages[message];
  return translated ? t(...translated) : t("No pudimos actualizar los datos. Conservamos la última posición; intenta de nuevo.", "We couldn't update the data. We kept the last position; please try again.");
}

function MapLoading() {
  const { t } = useTranslation();
  return <div className="map-loading"><span className="loading-ring" />{t("Conectando con la ciudad…", "Connecting to the city…")}</div>;
}

const LiveMap = dynamic(() => import("./LiveMap").then((module) => module.LiveMap), {
  ssr: false,
  loading: () => <MapLoading />,
});

interface DashboardProps {
  network: TransitNetwork;
  initialFleet: FleetSnapshot;
  user: { name?: string | null; email?: string | null };
}

export function Dashboard({ network, initialFleet, user }: DashboardProps) {
  const state = useDashboard();
  const { fleet, refreshing, error, traces, calls, refresh } = useLiveBuses(initialFleet);
  const { locale, t } = useTranslation();
  const theme = usePreferences((preferences) => preferences.theme);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filterRequested, setFilterRequested] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [focus, setFocus] = useState<{ key: string; lineId?: number; coordinates?: Coordinate; zoom?: number } | null>(null);
  const [command, setCommand] = useState<{ type: "zoom-in" | "zoom-out" | "reset" | "pitch"; nonce: number } | null>(null);
  const [selectedStation, setSelectedStation] = useState<{ station: Station; lineId: number } | null>(null);
  const [clock, setClock] = useState(initialFleet.timestamp);
  const [is3D, setIs3D] = useState(false);
  const [mapAvailable, setMapAvailable] = useState(false);
  const unavailableHint = mapAvailable ? undefined : t("El mapa interactivo está cargando o no está disponible. Reintenta el mapa.", "The interactive map is loading or unavailable. Retry the map.");

  const accountName = user.name ?? user.email ?? t("usuario", "user");

  useEffect(() => {
    void useDashboard.persist.rehydrate();
  }, []);

  const openPanel = () => {
    setSidebarOpen(true);
    setMobileOpen(window.matchMedia("(max-width: 900px)").matches);
  };
  const closePanel = () => {
    setSidebarOpen(false);
    setMobileOpen(false);
  };

  const openLineFilters = () => {
    openPanel();
    setFilterRequested(true);
  };

  useEffect(() => {
    if (!filterRequested) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const sections = [...document.querySelectorAll<HTMLElement>("[data-line-filter-section]")];
        const section = sections.find(node => node.getBoundingClientRect().width > 0);
        if (section) {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          section.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
          section.querySelector<HTMLElement>('button[role="checkbox"],input[type="checkbox"]')?.focus({ preventScroll: true });
        }
        setFilterRequested(false);
      });
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [filterRequested, sidebarOpen, mobileOpen]);

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
    if (!mapAvailable) return;
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
        <Brand compact />
        <div className="rail-main">
          <button className="rail-button active" aria-label={t("Mostrar mapa", "Show map")} data-icon-hint={t("Mapa", "Map")} onClick={() => setSidebarOpen(!sidebarOpen)}><MapIcon size={20} /></button>
          <button className="rail-button" aria-label={t("Ver filtros de líneas", "View line filters")} data-icon-hint={t("Filtros de líneas", "Line filters")} onClick={openLineFilters}><Route size={20} /></button>
          <button className={`rail-button ${alertsOpen ? "active" : ""}`} aria-label={t("Alertas de servicio", "Service alerts")} data-icon-hint={t("Alertas", "Alerts")} onClick={() => setAlertsOpen(!alertsOpen)}><Bell size={20} /><i /></button>
        </div>
        <div className="rail-bottom">
          <button className="rail-button" onClick={() => setHelpOpen(true)} aria-label={t("Ayuda de los controles", "Controls help")} data-icon-hint={t("Ayuda", "Help")}><HelpCircle size={20} /></button>
          <Link className="rail-button" href="/docs" aria-label={t("Documentación", "Documentation")} data-icon-hint={t("Documentación", "Documentation")}><Code2 size={20} /></Link>
          <div className="rail-divider" />
          <button className="user-avatar" aria-label={t(`Cerrar sesión de ${accountName}`, `Sign out ${accountName}`)} data-icon-hint={t("Cerrar sesión", "Sign out")} onClick={() => void signOut({ redirect: false }).then(() => window.location.assign("/"))}>{accountName.charAt(0).toUpperCase()}<LogOut size={12} /></button>
        </div>
      </aside>
      {sidebarOpen && <aside className="dashboard-sidebar" aria-label={t("Panel de Metrobús", "Metrobús panel")}><Sidebar {...sidebarProps} /></aside>}
    </>}

    <section className="dashboard-map-area" aria-label={t("Mapa interactivo de Metrobús CDMX", "Interactive Metrobús CDMX map")}>
      <LiveMap network={network} vehicles={fleet.vehicles} selectedLines={state.selectedLines} serviceFilter={state.serviceFilter} showRoutes={state.showRoutes} trails={state.trails} recording={state.recording} selectedId={state.selectedId} following={state.following} focus={focus} command={command} dataSource={fleet.source} onViewModeChange={setIs3D} onMapAvailabilityChange={setMapAvailable} onVehicleSelect={(id) => { state.selectVehicle(id); setSelectedStation(null); }} onStationSelect={(station, lineId) => { setSelectedStation({ station, lineId }); state.selectVehicle(null); }} />
      {!state.recording && <>
        <div className="map-header">
          <button className="map-panel-button icon-button" onClick={openLineFilters} aria-label={t("Abrir panel de líneas", "Open line panel")} data-icon-hint={t("Filtros de líneas", "Line filters")}><Menu size={18} /></button>
          <div className="map-heading"><span className="map-heading-title"><img src="/brand/app-logo.png" width={20} height={20} alt="" aria-hidden="true" />{t("Ciudad de México", "Mexico City")}</span><span>{t("METROBÚS / VISTA DE RED", "METROBÚS / NETWORK VIEW")}</span></div>
          <div className="map-header-right"><span className="map-demo"><span className="status-dot" /> {t("SIMULACIÓN", "SIMULATION")}</span><span className="map-clock mono">{formatTime(clock, locale)} <small>CDMX</small></span><PreferenceControls /></div>
        </div>
        <div className="map-controls"><button aria-label={t("Acercar mapa", "Zoom in")} data-icon-hint={t("Acercar", "Zoom in")} data-icon-hint-description={unavailableHint} aria-disabled={!mapAvailable} onClick={() => runCommand("zoom-in")}><Plus size={19} /></button><button aria-label={t("Alejar mapa", "Zoom out")} data-icon-hint={t("Alejar", "Zoom out")} data-icon-hint-description={unavailableHint} aria-disabled={!mapAvailable} onClick={() => runCommand("zoom-out")}><Minus size={19} /></button><span /><button aria-label={t("Centrar toda la red", "Center the full network")} data-icon-hint={t("Centrar", "Center map")} data-icon-hint-description={unavailableHint} aria-disabled={!mapAvailable} onClick={() => runCommand("reset")}><Crosshair size={18} /></button><button aria-label={is3D ? t("Vista 2D", "2D view") : t("Vista 3D", "3D view")} data-icon-hint={is3D ? t("Vista 2D", "2D view") : t("Vista 3D", "3D view")} data-icon-hint-description={unavailableHint} aria-disabled={!mapAvailable} aria-pressed={is3D} onClick={() => runCommand("pitch")}><Compass size={19} /></button></div>
        <div className="map-bottom-status"><span className="status-dot" /><span>{visibleVehicles.length} {t("unidades visibles", "visible units")}</span><span className="white-vehicle-key" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 1px #0008" }} />{t("Todos los tipos · estelas 72 s", "All types · 72 s trails")}</span><i /><span>{state.selectedLines.length} / {network.lines.length} {t("líneas", "lines")}</span><span>{is3D ? t("VISTA 3D", "3D VIEW") : t("VISTA 2D", "2D VIEW")}</span><span className="desktop-only">{theme === "light" ? "CARTO POSITRON" : "CARTO DARK MATTER"}</span></div>
        {error && <div className="connection-error" role="alert"><span>{translateError(error, t)}</span><button onClick={() => void refresh()} disabled={refreshing}>{refreshing ? <Loader2 size={15} className="spin" /> : t("Reintentar", "Retry")}</button></div>}
        {!visibleVehicles.length && <div className="map-empty-state"><Layers3 size={28} /><h3>{t("No hay unidades visibles", "No visible units")}</h3><p>{t("Activa una línea o restablece el tipo de unidad.", "Activate a line or reset the unit type.")}</p><button className="primary-button" onClick={resetFilters}>{t("Mostrar toda la red", "Show the full network")}</button></div>}
        {selectedVehicle && selectedVehicleLine && <BusPopup vehicle={selectedVehicle} line={selectedVehicleLine} network={network} following={state.following} onToggleFollow={state.toggleFollow} onClose={() => state.selectVehicle(null)} />}
        {selectedStation && stationLine && <BusPopup station={selectedStation.station} line={stationLine} network={network} vehicles={visibleVehicles} onClose={() => setSelectedStation(null)} />}
      </>}
      {state.recording && <><div className="recording-counter"><Brand variant="app" /><span className="recording-eyebrow"><span className="record-dot" /> {t("MODO GRABACIÓN · DEMO", "RECORDING MODE · DEMO")}</span><strong>{visibleVehicles.length}</strong><span>{t("buses en vía ahora mismo", "buses currently on route")}</span></div><button className="exit-recording" onClick={state.toggleRecording}><X size={17} /> {t("Salir del modo grabación", "Exit recording mode")} <kbd>Esc</kbd></button><span className="recording-note">{t("Vista cinematográfica · posiciones simuladas · usa tu capturador de pantalla", "Cinematic view · simulated positions · use your screen recorder")}</span></>}
    </section>

    <Dialog.Root open={mobileOpen && !state.recording} onOpenChange={setMobileOpen}><Dialog.Portal><Dialog.Overlay className="drawer-overlay" /><Dialog.Content className="mobile-panel"><Dialog.Title className="sr-only">{t("Panel de líneas y filtros", "Line and filter panel")}</Dialog.Title><Dialog.Description className="sr-only">{t("Busca estaciones y selecciona las líneas de Metrobús visibles.", "Search stations and select visible Metrobús lines.")}</Dialog.Description><Dialog.Close className="mobile-panel-close icon-button" aria-label={t("Cerrar panel", "Close panel")} data-icon-hint={t("Cerrar panel", "Close panel")}><X size={18} /></Dialog.Close><Sidebar {...sidebarProps} /></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={alertsOpen} onOpenChange={setAlertsOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="info-dialog"><Dialog.Title>{t("Alertas de servicio", "Service alerts")} <Bell size={20} /></Dialog.Title><Dialog.Description>{t("Ejemplos de alertas para la versión de demostración.", "Example alerts for the demo version.")}</Dialog.Description><div className="service-alert"><span className="line-badge" style={{ background: "#D40D0D" }}>L1</span><div><span className="demo-label">{t("EJEMPLO SIMULADO", "SIMULATED EXAMPLE")}</span><h3>{t("Mayor afluencia en Insurgentes", "Higher crowding at Insurgentes")}</h3><p>{t("Una alerta real aparecerá aquí cuando se conecte una fuente oficial. Este mensaje no describe una incidencia actual.", "A real alert will appear here when an official source is connected. This message does not describe a current incident.")}</p></div></div><Link className="text-link" target="_blank" href="https://www.metrobus.cdmx.gob.mx/">{t("Consulta los avisos oficiales", "View official notices")} <ArrowUpRight size={15} /></Link><Dialog.Close className="dialog-close icon-button" aria-label={t("Cerrar alertas", "Close alerts")} data-icon-hint={t("Cerrar alertas", "Close alerts")}><X size={18} /></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="info-dialog"><Dialog.Title>{t("Explora a tu ritmo", "Explore at your own pace")} <Compass size={21} /></Dialog.Title><Dialog.Description>{t("El mapa es interactivo y los filtros son reversibles.", "The map is interactive and filters can be reversed.")}</Dialog.Description><div className="help-content"><p><strong>{t("Busca", "Search")}</strong> {t("una línea o estación y presiona Enter para enfocarla.", "for a line or station and press Enter to focus it.")}</p><p><strong>{t("Selecciona", "Select")}</strong> {t("una unidad para ver su información y seguirla.", "a unit to view its information and follow it.")}</p><p><strong>{t("Activa estelas", "Enable vehicle trails")}</strong> {t("para ver un historial de aproximadamente 72 segundos en seis instantáneas; la demo siembra posiciones simuladas al activarlas.", "to see approximately 72 seconds of history across six snapshots; the demo seeds simulated positions when enabled.")}</p><p><kbd>R</kbd> {t("abre el modo grabación.", "opens recording mode.")} <kbd>Esc</kbd> {t("vuelve al mapa normal. Este modo no genera un archivo de video.", "returns to the regular map. This mode does not create a video file.")}</p><p>{t("Rutas GTFS reales. Posiciones, velocidades y alertas simuladas.", "Real GTFS routes. Simulated positions, speeds, and alerts.")}</p></div><Dialog.Close className="dialog-close icon-button" aria-label={t("Cerrar ayuda", "Close help")} data-icon-hint={t("Cerrar ayuda", "Close help")}><X size={18} /></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </main>;
}
