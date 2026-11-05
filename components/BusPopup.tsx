"use client";

import { ArrowUpRight, BusFront, Crosshair, X } from "lucide-react";
import { SERVICE_LABELS, type Station, type TransitLine, type TransitNetwork, type Vehicle } from "@/lib/transit-types";

export interface BusPopupProps {
  vehicle?: Vehicle | null;
  line?: TransitLine | null;
  station?: Station | null;
  network: TransitNetwork;
  vehicles?: Vehicle[];
  following?: boolean;
  onToggleFollow?: () => void;
  onClose: () => void;
}

function distanceInDegrees(a: Vehicle, b: Station) {
  const latitudeScale = Math.cos(a.latitude * Math.PI / 180);
  return Math.hypot(
    (a.longitude - b.coordinates[0]) * latitudeScale,
    a.latitude - b.coordinates[1],
  ) * 111;
}

export function BusPopup({
  vehicle = null,
  line = null,
  station = null,
  network,
  vehicles = [],
  following = false,
  onToggleFollow,
  onClose,
}: BusPopupProps) {
  const resolvedLine = line ?? (vehicle ? network.lines.find((candidate) => candidate.id === vehicle.line_id) : undefined) ?? null;

  if (vehicle && resolvedLine) {
    return (
      <div className="vehicle-card">
        <div className="vehicle-card-header">
          <span className="line-badge" style={{ background: resolvedLine.color }}>{resolvedLine.code}</span>
          <div><strong>{vehicle.id}</strong><span>{SERVICE_LABELS[vehicle.service_type]}</span></div>
          <button className="icon-button" aria-label="Cerrar información de unidad" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="vehicle-card-direction"><ArrowUpRight size={16}/><span>Hacia <strong>{vehicle.direction}</strong></span></div>
        <div className="vehicle-details">
          <div><span>VELOCIDAD SIMULADA</span><strong>{vehicle.speed}<small> km/h</small></strong></div>
          <div><span>PRÓXIMA ESTACIÓN</span><strong>{vehicle.next_stop}</strong></div>
        </div>
        <button className={`follow-button ${following ? "active" : ""}`} onClick={onToggleFollow}>
          <Crosshair size={15}/>{following ? "Dejar de seguir" : "Seguir unidad"}
        </button>
        <small className="vehicle-demo">Posición y velocidad de demostración</small>
      </div>
    );
  }

  if (station && resolvedLine) {
    const arrivals = vehicles
      .filter((candidate) => candidate.line_id === resolvedLine.id)
      .map((candidate) => ({ vehicle: candidate, distance: distanceInDegrees(candidate, station) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return (
      <div className="vehicle-card station-card">
        <div className="vehicle-card-header">
          <span className="line-badge" style={{ background: resolvedLine.color }}>{resolvedLine.code}</span>
          <div><strong>{station.name}</strong><span>Estación de Metrobús</span></div>
          <button className="icon-button" aria-label="Cerrar estación" onClick={onClose}><X size={15}/></button>
        </div>
        <p className="station-estimate-label">Unidades cercanas · estimación demo</p>
        {arrivals.map(({ vehicle: arrival, distance }) => (
          <div className="arrival-row" key={arrival.id}>
            <BusFront size={16}/>
            <span>{arrival.direction}<small>{arrival.id}</small></span>
            <strong>{Math.max(1, Math.ceil(distance / (arrival.speed || 20) * 60))}<small> min</small></strong>
          </div>
        ))}
        {!arrivals.length && <p className="empty-note">Activa esta línea para ver sus unidades.</p>}
        <small className="vehicle-demo">Cercanía aproximada, no una predicción de llegada real.</small>
      </div>
    );
  }

  return null;
}
