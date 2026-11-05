"use client";

import { ArrowUpRight, BusFront, Crosshair, X } from "lucide-react";
import { StationSymbol } from "@/components/station-symbol";
import { useTranslation } from "@/lib/preferences";
import { SERVICE_LABELS, type ServiceType, type Station, type TransitLine, type TransitNetwork, type Vehicle } from "@/lib/transit-types";

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

type StationWithPictogram = Station & {
  pictogramUrl?: string | null;
  pictogramSourceUrl?: string | null;
};

type Translate = (es: string, en: string) => string;

const SERVICE_LABELS_EN: Record<ServiceType, string> = {
  articulado: "Articulated",
  biarticulado: "Bi-articulated",
  "doble-piso": "Double-decker",
  convencional: "Standard",
};

function distanceInDegrees(a: Vehicle, b: Station) {
  const latitudeScale = Math.cos(a.latitude * Math.PI / 180);
  return Math.hypot(
    (a.longitude - b.coordinates[0]) * latitudeScale,
    a.latitude - b.coordinates[1],
  ) * 111;
}

function formatCoordinate(value: number, label: string) {
  return Number.isFinite(value) ? `${label} ${value.toFixed(6)}°` : `${label} —`;
}

function isExternalUrl(value?: string | null): value is string {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function serviceLabel(value: ServiceType, t: Translate) {
  return t(SERVICE_LABELS[value], SERVICE_LABELS_EN[value]);
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
  const { locale, t } = useTranslation();
  const resolvedLine = line ?? (vehicle ? network.lines.find((candidate) => candidate.id === vehicle.line_id) : undefined) ?? null;

  if (vehicle && resolvedLine) {
    return (
      <div className="vehicle-card">
        <div className="vehicle-card-header">
          <span className="line-badge" style={{ background: resolvedLine.color }}>{resolvedLine.code}</span>
          <div><strong>{vehicle.id}</strong><span>{serviceLabel(vehicle.service_type, t)}</span></div>
          <button className="icon-button" aria-label={t("Cerrar información de unidad", "Close unit information")} onClick={onClose}><X size={15} /></button>
        </div>
        <div className="vehicle-card-direction"><ArrowUpRight size={16} /><span>{t("Hacia", "Toward")} <strong>{vehicle.direction}</strong></span></div>
        <div className="vehicle-details">
          <div><span>{t("VELOCIDAD SIMULADA", "SIMULATED SPEED")}</span><strong>{vehicle.speed}<small> km/h</small></strong></div>
          <div><span>{t("PRÓXIMA ESTACIÓN", "NEXT STATION")}</span><strong>{vehicle.next_stop}</strong></div>
        </div>
        <button className={`follow-button ${following ? "active" : ""}`} onClick={onToggleFollow} aria-pressed={following}>
          <Crosshair size={15} />{following ? t("Dejar de seguir", "Stop following") : t("Seguir unidad", "Follow unit")}
        </button>
        <small className="vehicle-demo">{t("Posición y velocidad de demostración", "Demo position and speed")}</small>
      </div>
    );
  }

  if (station && resolvedLine) {
    const stationWithPictogram = station as StationWithPictogram;
    const sourceUrl = isExternalUrl(stationWithPictogram.pictogramSourceUrl)
      ? stationWithPictogram.pictogramSourceUrl
      : null;
    const arrivals = vehicles
      .filter((candidate) => candidate.line_id === resolvedLine.id)
      .map((candidate) => ({ vehicle: candidate, distance: distanceInDegrees(candidate, station) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return (
      <div className="vehicle-card station-card">
        <div className="vehicle-card-header" style={{ alignItems: "flex-start", gap: 12 }}>
          <StationSymbol
            alt={station.name}
            pictogramUrl={stationWithPictogram.pictogramUrl}
            size={48}
          />
          <div style={{ paddingTop: 2 }}>
            <strong>{station.name}</strong>
            <span>{resolvedLine.code} · {resolvedLine.name}</span>
          </div>
          <button className="icon-button" aria-label={t("Cerrar estación", "Close station")} onClick={onClose}><X size={15} /></button>
        </div>

        <dl
          style={{
            display: "grid",
            gap: 9,
            margin: "18px 0 0",
            padding: "13px 0",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "74px minmax(0, 1fr)", gap: 10, alignItems: "baseline" }}>
            <dt style={{ color: "#71828b", font: "6px ui-monospace, monospace", letterSpacing: "0.6px" }}>{t("ID GTFS", "GTFS ID")}</dt>
            <dd style={{ margin: 0, minWidth: 0, color: "#d7dedd", font: "9px ui-monospace, monospace", overflowWrap: "anywhere" }}>{station.id}</dd>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "74px minmax(0, 1fr)", gap: 10, alignItems: "baseline" }}>
            <dt style={{ color: "#71828b", font: "6px ui-monospace, monospace", letterSpacing: "0.6px" }}>{t("COORDENADAS", "COORDINATES")}</dt>
            <dd style={{ margin: 0, minWidth: 0, color: "#d7dedd", font: "8px ui-monospace, monospace", lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {formatCoordinate(station.coordinates[1], "Lat")} · {formatCoordinate(station.coordinates[0], "Lon")}
            </dd>
          </div>
        </dl>

        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, color: "#c5a8a2", fontSize: 8, textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            {t("Fuente del pictograma", "Pictogram source")} <ArrowUpRight size={12} />
          </a>
        ) : null}

        <p className="station-estimate-label">{t("Unidades cercanas · estimación demo", "Nearby units · demo estimate")}</p>
        {arrivals.map(({ vehicle: arrival, distance }) => (
          <div className="arrival-row" key={arrival.id}>
            <BusFront size={16} />
            <span>{arrival.direction || t("Sentido no disponible", "Direction unavailable")}<small>{arrival.id} · {Number.isFinite(distance) ? distance.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"} km {t("aprox.", "approx.")}</small></span>
            <strong>{Math.max(1, Math.ceil(distance / (arrival.speed || 20) * 60))}<small> {t("min", "min")}</small></strong>
          </div>
        ))}
        {!arrivals.length && <p className="empty-note">{t("Activa esta línea para ver sus unidades.", "Activate this line to see its units.")}</p>}
        <small className="vehicle-demo">{t("Cercanía aproximada basada en posiciones simuladas, no una predicción de llegada real.", "Approximate proximity based on simulated positions, not a real arrival prediction.")}</small>
      </div>
    );
  }

  return null;
}
