"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import { Activity, ArrowUpRight, Bell, BusFront, Check, ChevronDown, ChevronLeft, ChevronRight, Code2, ExternalLink, HelpCircle, Layers3, LogOut, Route, Search, Video, X } from "lucide-react";
import { useDashboard } from "@/stores/dashboard";
import { SERVICE_LABELS, type Coordinate, type FleetSnapshot, type Station, type TransitLine, type TransitNetwork } from "@/lib/transit-types";
import type { ApiTrace } from "@/lib/useLiveBuses";
import { AnimatedCounter } from "./animated-counter";

export interface SidebarUser {
  name?: string | null;
  email?: string | null;
}

export interface SidebarProps {
  network: TransitNetwork;
  fleet: FleetSnapshot;
  user: SidebarUser;
  refreshing: boolean;
  calls: number;
  traces: ApiTrace[];
  onClose: () => void;
  onMobileClose: () => void;
  onAlertsOpen: () => void;
  onToggleRecording: () => void;
  onLineFocus: (line: TransitLine) => void;
  onStationFocus: (station: Station, lineId: number) => void;
  onSelectionReset: () => void;
}

interface SearchResult {
  key: string;
  line: TransitLine;
  station?: Station;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  });
}

export function Sidebar({
  network,
  fleet,
  user,
  refreshing,
  calls,
  traces,
  onClose,
  onMobileClose,
  onAlertsOpen,
  onToggleRecording,
  onLineFocus,
  onStationFocus,
  onSelectionReset,
}: SidebarProps) {
  const state = useDashboard();
  const [query, setQuery] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const allLineIds = useMemo(() => network.lines.map((line) => line.id), [network.lines]);
  const allLinesSelected = allLineIds.length > 0 && allLineIds.every((id) => state.selectedLines.includes(id));

  const visibleVehicles = useMemo(
    () => fleet.vehicles.filter((vehicle) => state.selectedLines.includes(vehicle.line_id) && (state.serviceFilter === "all" || vehicle.service_type === state.serviceFilter)),
    [fleet.vehicles, state.selectedLines, state.serviceFilter],
  );
  const lineCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const vehicle of fleet.vehicles) {
      if (state.serviceFilter !== "all" && vehicle.service_type !== state.serviceFilter) continue;
      counts.set(vehicle.line_id, (counts.get(vehicle.line_id) ?? 0) + 1);
    }
    return counts;
  }, [fleet.vehicles, state.serviceFilter]);
  const ranking = useMemo(
    () => network.lines
      .map((line) => ({ ...line, count: lineCounts.get(line.id) ?? 0 }))
      .filter((line) => state.selectedLines.includes(line.id) && line.count > 0)
      .sort((a, b) => b.count - a.count || a.id - b.id)
      .slice(0, 3),
    [lineCounts, network.lines, state.selectedLines],
  );
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const term = normalize(query.trim());
    const matches: SearchResult[] = [];
    for (const line of network.lines) {
      if (normalize(`${line.code} ${line.name} linea ${line.id} ${line.from} ${line.to}`).includes(term)) matches.push({ key: line.code, line });
      for (const station of line.stations) {
        if (normalize(station.name).includes(term)) matches.push({ key: `${line.id}-${station.id}`, line, station });
      }
    }
    return matches.slice(0, 8);
  }, [network.lines, query]);

  const closeSearch = () => setQuery("");
  const chooseLine = (line: TransitLine) => {
    state.setLines([line.id]);
    closeSearch();
    onMobileClose();
    onLineFocus(line);
  };
  const chooseResult = (result: SearchResult) => {
    state.setLines([result.line.id]);
    closeSearch();
    onMobileClose();
    if (result.station) onStationFocus(result.station, result.line.id);
    else onLineFocus(result.line);
  };
  const toggleLine = (lineId: number) => {
    state.toggleLine(lineId);
    onSelectionReset();
  };
  const toggleAllLines = () => {
    state.setLines(allLinesSelected ? [] : allLineIds);
    onSelectionReset();
  };
  const setServiceFilter = (service: string) => {
    state.setServiceFilter(service);
    onSelectionReset();
  };
  const sourceLabel = fleet.source === "gtfs-rt" ? "GTFS-RT" : "SIMULACIÓN";

  return (
    <div className="sidebar-content">
      <div className="panel-heading"><span className="eyebrow">EL PULSO DE LA CDMX</span><button className="icon-button panel-close" aria-label="Cerrar panel" onClick={onClose}><ChevronLeft size={17}/></button></div>
      <div className="panel-counter"><AnimatedCounter value={visibleVehicles.length} aria-label={`${visibleVehicles.length} buses visibles`} className="panel-counter-value"/><span>buses de Metrobús<br/>en vía ahora mismo</span></div>
      <div className="update-label"><span className="status-dot"/>{refreshing ? "Actualizando posiciones…" : `Actualizado ${formatTime(fleet.timestamp)}`}<span className="demo-label">{sourceLabel}</span></div>

      <div className="search-wrapper">
        <div className="dashboard-search"><Search size={17}/><input placeholder="Busca una línea o estación" aria-label="Busca una línea o estación" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && results[0]) chooseResult(results[0]); if (event.key === "Escape") closeSearch(); }}/>{query ? <button onClick={closeSearch} aria-label="Limpiar búsqueda"><X size={14}/></button> : <kbd>↵</kbd>}</div>
        {query && <div className="search-results">{results.length ? results.map((result) => <button key={result.key} onClick={() => chooseResult(result)}><span className="line-badge" style={{ background: result.line.color }}>{result.line.code}</span><span>{result.station?.name ?? result.line.name}<small>{result.station ? "Estación" : `${result.line.from} → ${result.line.to}`}</small></span><ArrowUpRight size={14}/></button>) : <p>No encontramos «{query}». Prueba L1 o Buenavista.</p>}</div>}
      </div>

      <div className="sidebar-section ranking-section"><div className="sidebar-section-title"><span>Más buses en vía</span><Activity size={14}/></div>{ranking.length ? ranking.map((line) => <button className="ranking-row" key={line.id} onClick={() => chooseLine(line)}><span className="line-badge" style={{ background: line.color }}>{line.code}</span><span className="ranking-name">{line.name}<span className="rank-track"><i style={{ width: `${line.count / (ranking[0]?.count || 1) * 100}%`, background: line.color }}/></span></span><span className="mono">{line.count}</span></button>) : <p className="empty-note">Selecciona una línea para ver sus unidades.</p>}</div>

      <div className="sidebar-section filter-section"><div className="sidebar-section-title"><span>Líneas de la red</span><button onClick={toggleAllLines}>{allLinesSelected ? "Ocultar todas" : "Mostrar todas"}</button></div><div className="system-label"><BusFront size={13}/><span>Metrobús CDMX</span><span>{network.lines.length} líneas</span></div>
        {network.lines.map((line) => <label className={`filter-line ${state.selectedLines.includes(line.id) ? "checked" : ""}`} key={line.id}><span className="line-badge" style={{ background: line.color }}>{line.code}</span><span className="filter-line-name">{line.name}</span><span className="filter-line-count">{lineCounts.get(line.id) ?? 0}</span><input type="checkbox" checked={state.selectedLines.includes(line.id)} onChange={() => toggleLine(line.id)}/><span className="custom-checkbox" aria-hidden="true">{state.selectedLines.includes(line.id) && <Check size={11}/>}</span></label>)}
        <label className="service-select"><span>Tipo de unidad</span><select value={state.serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} aria-label="Filtrar por tipo de unidad"><option value="all">Todas las unidades</option>{Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={12}/></label>
      </div>

      <div className="sidebar-toggles"><button className={state.trails ? "active" : ""} onClick={state.toggleTrails} aria-pressed={state.trails}><Route size={17}/><span>Estelas</span><span className="toggle-switch"/></button><button className={state.showRoutes ? "active" : ""} onClick={state.toggleRoutes} aria-pressed={state.showRoutes}><Layers3 size={17}/><span>Recorridos</span><span className="toggle-switch"/></button><button className="record-button" onClick={() => { onToggleRecording(); onMobileClose(); }}><Video size={17}/><span>Modo grabación</span><kbd>R</kbd></button></div>
      <button className="service-alert-button" onClick={onAlertsOpen}><Bell size={15}/><span>Alertas de servicio</span><span className="alert-count">1 demo</span><ChevronRight size={13}/></button>

      <div className="api-inspector"><button className="inspector-heading" onClick={() => setInspectorOpen((open) => !open)} aria-expanded={inspectorOpen}><Code2 size={13}/><span>Inspector de API</span><span className="mono">{calls}</span><ChevronDown size={12} style={{ transform: inspectorOpen ? "rotate(180deg)" : undefined }}/></button>{inspectorOpen && <div className="inspector-body"><p>{fleet.external_api_calls} llamadas externas · {calls} peticiones internas</p><code>GET /api/fleet · cada {fleet.refresh_seconds} s · fuente {fleet.source}</code>{traces.map((trace) => <div className="trace-row" key={trace.id}><span>{formatTime(trace.time)}</span><span className={trace.status === 200 ? "trace-ok" : "trace-fail"}>{trace.status}</span><span>{trace.duration} ms</span></div>)}<Link href="/docs">Adaptador y fuentes <ExternalLink size={11}/></Link></div>}</div>
      <div className="sidebar-footer"><span className="status-dot"/><span>GTFS CDMX · posiciones {fleet.source === "gtfs-rt" ? "en vivo" : "simuladas"}</span><Link href="/docs" aria-label="Información sobre los datos"><HelpCircle size={13}/></Link></div>
      <div className="mobile-user-controls"><span>{user.name ?? "Tu cuenta"}</span><Link href="/">Inicio <ArrowUpRight size={12}/></Link><button onClick={() => void signOut({ redirect: false }).then(() => window.location.assign("/login"))}>Salir <LogOut size={13}/></button></div>
    </div>
  );
}
