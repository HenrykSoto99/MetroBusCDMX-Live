#!/usr/bin/env python3
"""Importa el feed GTFS de Metrobus CDMX sin usar LLMs.

El feed de rutas, paradas, shapes y metadatos puede vivir en ``--source-dir``.
``trips.txt`` y ``stop_times.txt`` se leen desde la misma carpeta (o mediante
``--trips``/``--stop-times``), pero no son copiados por este proyecto porque
stop_times.txt es un archivo grande. La ejecución escribe:

* public/data/network.json
* public/data/realtime-snapshot.json (solo si el protobuf se puede decodificar)

Ejemplo:
    python3 scripts/import_gtfs.py --source-dir /home/ubuntu/upload
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


# IDs seleccionados por el encargo: son las variantes largas principales de
# cada línea, no necesariamente todas las variantes/ramales del feed.
LINE_CONFIG: list[dict[str, str]] = [
    {
        "id": "1",
        "code": "L1",
        "name": "Insurgentes",
        "color": "#D40D0D",
        "from": "Indios Verdes",
        "to": "El Caminero",
        "route_id": "19499",
    },
    {
        "id": "2",
        "code": "L2",
        "name": "Eje 4 Sur",
        "color": "#8D1A96",
        "from": "Tepalcates",
        "to": "Tacubaya",
        "route_id": "19563",
    },
    {
        "id": "3",
        "code": "L3",
        "name": "Eje 1 Poniente",
        "color": "#7A9A01",
        "from": "Tenayuca",
        "to": "Pueblo Sta. Cruz Atoyac",
        "route_id": "19459",
    },
    {
        "id": "4",
        "code": "L4",
        "name": "Centro Histórico",
        "color": "#FF9A03",
        "from": "Buenavista",
        "to": "San Lázaro Pte",
        "route_id": "19517",
    },
    {
        "id": "5",
        "code": "L5",
        "name": "Eje 3 Oriente",
        "color": "#141982",
        "from": "Río de los Remedios",
        "to": "Preparatoria 1",
        "route_id": "19559",
    },
    {
        "id": "6",
        "code": "L6",
        "name": "Eje 5 Norte",
        "color": "#E44599",
        "from": "Villa de Aragón",
        "to": "El Rosario",
        "route_id": "19470",
    },
    {
        "id": "7",
        "code": "L7",
        "name": "Paseo de la Reforma",
        "color": "#116633",
        "from": "Indios Verdes",
        "to": "Campo Marte",
        "route_id": "19576",
    },
]

REALTIME_FILENAME = "pasted_file_G5iMSO_Metrobus_GTFS_RT.proto"
MAX_ROUTE_POINTS = 450


def utc_now_iso() -> str:
    """Devuelve un timestamp ISO-8601 UTC sin microsegundos."""

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def timestamp_iso(timestamp: int | None) -> str | None:
    if not timestamp:
        return None
    return datetime.fromtimestamp(timestamp, timezone.utc).replace(
        microsecond=0
    ).isoformat().replace("+00:00", "Z")


def csv_rows(path: Path) -> Iterable[dict[str, str]]:
    """Itera filas CSV GTFS, aceptando BOM UTF-8 y líneas nuevas normales."""

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def require_file(path: Path, label: str) -> Path:
    if not path.is_file():
        raise FileNotFoundError(f"No se encontró {label}: {path}")
    return path


def parse_float(value: str, field: str, row_id: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} inválido para {row_id}: {value!r}") from exc
    if not math.isfinite(number):
        raise ValueError(f"{field} no finito para {row_id}: {value!r}")
    return number


def parse_int(value: str, field: str, row_id: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} inválido para {row_id}: {value!r}") from exc


def load_feed_info(path: Path) -> dict[str, str]:
    rows = list(csv_rows(require_file(path, "feed_info.txt")))
    if not rows:
        raise ValueError("feed_info.txt no contiene filas")
    row = rows[0]
    return {
        "publisher": row.get("feed_publisher_name", "").strip(),
        # GTFS define estas fechas como YYYYMMDD; se conservan en el mismo
        # formato para no perder fidelidad con la fuente.
        "startDate": row.get("feed_start_date", "").strip(),
        "endDate": row.get("feed_end_date", "").strip(),
    }


def load_routes(path: Path, selected_ids: set[str]) -> dict[str, dict[str, str]]:
    routes: dict[str, dict[str, str]] = {}
    for row in csv_rows(require_file(path, "routes.txt")):
        route_id = row.get("route_id", "").strip()
        if route_id in selected_ids:
            routes[route_id] = row
    missing = sorted(selected_ids - routes.keys())
    if missing:
        raise ValueError(f"route_id principal ausente en routes.txt: {', '.join(missing)}")
    return routes


def load_stops(path: Path) -> dict[str, dict[str, Any]]:
    stops: dict[str, dict[str, Any]] = {}
    for row in csv_rows(require_file(path, "stops.txt")):
        stop_id = row.get("stop_id", "").strip()
        if not stop_id:
            continue
        lat = row.get("stop_lat", "").strip()
        lon = row.get("stop_lon", "").strip()
        if not lat or not lon:
            # Una parada sin coordenadas no puede formar parte de la salida
            # solicitada; se conserva fuera del resultado y se reporta luego.
            continue
        stops[stop_id] = {
            "id": stop_id,
            "name": row.get("stop_name", "").strip(),
            "lat": parse_float(lat, "stop_lat", stop_id),
            "lon": parse_float(lon, "stop_lon", stop_id),
        }
    return stops


def load_trips(
    path: Path, selected_ids: set[str]
) -> tuple[dict[str, dict[str, str]], dict[str, Counter[str]]]:
    """Carga solo los trips de las rutas solicitadas.

    Retorna la ficha por trip_id y un contador de shapes por route_id para
    poder corregir feeds donde el shape_id no coincide con route_id.
    """

    trips: dict[str, dict[str, str]] = {}
    shapes_by_route: dict[str, Counter[str]] = defaultdict(Counter)
    for row in csv_rows(require_file(path, "trips.txt")):
        route_id = row.get("route_id", "").strip()
        if route_id not in selected_ids:
            continue
        trip_id = row.get("trip_id", "").strip()
        shape_id = row.get("shape_id", "").strip()
        if not trip_id:
            continue
        trips[trip_id] = row
        if shape_id:
            shapes_by_route[route_id][shape_id] += 1
    for route_id in selected_ids:
        if not shapes_by_route.get(route_id):
            raise ValueError(f"No hay trips/shapes para route_id {route_id}")
    return trips, shapes_by_route


def choose_shape_ids(
    line_configs: list[dict[str, str]], shapes_by_route: dict[str, Counter[str]]
) -> dict[str, str]:
    chosen: dict[str, str] = {}
    for line in line_configs:
        route_id = line["route_id"]
        counts = shapes_by_route[route_id]
        # En este feed los siete IDs principales también son shape_id. La
        # alternativa de mayor frecuencia mantiene el script reusable.
        chosen[route_id] = route_id if route_id in counts else counts.most_common(1)[0][0]
    return chosen


def load_shapes(path: Path, selected_shape_ids: set[str]) -> dict[str, list[tuple[float, float]]]:
    shapes: dict[str, list[tuple[int, float, float]]] = defaultdict(list)
    for row in csv_rows(require_file(path, "shapes.txt")):
        shape_id = row.get("shape_id", "").strip()
        if shape_id not in selected_shape_ids:
            continue
        sequence = parse_int(row.get("shape_pt_sequence", ""), "shape_pt_sequence", shape_id)
        lat = parse_float(row.get("shape_pt_lat", ""), "shape_pt_lat", shape_id)
        lon = parse_float(row.get("shape_pt_lon", ""), "shape_pt_lon", shape_id)
        shapes[shape_id].append((sequence, lon, lat))
    result: dict[str, list[tuple[float, float]]] = {}
    for shape_id in selected_shape_ids:
        ordered = sorted(shapes.get(shape_id, []), key=lambda item: item[0])
        if len(ordered) < 2:
            raise ValueError(f"shape_id {shape_id} no tiene suficientes puntos")
        points: list[tuple[float, float]] = []
        for _, lon, lat in ordered:
            point = (lon, lat)
            if not points or point != points[-1]:
                points.append(point)
        result[shape_id] = points
    return result


def point_segment_distance_sq(
    point: tuple[float, float], start: tuple[float, float], end: tuple[float, float]
) -> float:
    px, py = point
    sx, sy = start
    ex, ey = end
    dx = ex - sx
    dy = ey - sy
    if dx == 0 and dy == 0:
        return (px - sx) ** 2 + (py - sy) ** 2
    t = ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    qx = sx + t * dx
    qy = sy + t * dy
    return (px - qx) ** 2 + (py - qy) ** 2


def douglas_peucker(
    points: list[tuple[float, float]], epsilon: float
) -> list[tuple[float, float]]:
    if len(points) <= 2:
        return points[:]
    threshold = epsilon * epsilon
    start = points[0]
    end = points[-1]
    greatest = threshold
    split = -1
    for index in range(1, len(points) - 1):
        distance = point_segment_distance_sq(points[index], start, end)
        if distance > greatest:
            greatest = distance
            split = index
    if split < 0:
        return [start, end]
    left = douglas_peucker(points[: split + 1], epsilon)
    right = douglas_peucker(points[split:], epsilon)
    return left[:-1] + right


def simplify_points(
    points: list[tuple[float, float]], max_points: int = MAX_ROUTE_POINTS
) -> list[tuple[float, float]]:
    """Reduce puntos con Douglas-Peucker sin exceder el límite solicitado."""

    if len(points) <= max_points:
        return points
    low = 0.0
    high = 1e-6
    while len(douglas_peucker(points, high)) > max_points:
        high *= 2.0
        if high > 10.0:  # protección para un feed geográficamente anómalo
            break
    best = douglas_peucker(points, high)
    for _ in range(35):
        middle = (low + high) / 2.0
        candidate = douglas_peucker(points, middle)
        if len(candidate) > max_points:
            low = middle
        else:
            high = middle
            if len(candidate) > len(best):
                best = candidate
    return best[:max_points]


def orient_points_to_stations(
    points: list[tuple[float, float]], stations: list[dict[str, Any]]
) -> list[tuple[float, float]]:
    """Alinea el sentido del shape con la secuencia GTFS de estaciones."""

    if len(points) < 2 or len(stations) < 2:
        return points
    first_station = stations[0]["coordinates"]
    last_station = stations[-1]["coordinates"]
    forward_error = math.dist(points[0], first_station) + math.dist(
        points[-1], last_station
    )
    reverse_error = math.dist(points[0], last_station) + math.dist(
        points[-1], first_station
    )
    return list(reversed(points)) if reverse_error < forward_error else points


def load_station_orders(
    stop_times_path: Path,
    trips: dict[str, dict[str, str]],
    selected_route_ids: set[str],
) -> dict[str, list[tuple[int, str]]]:
    """Lee stop_times en streaming y obtiene la secuencia de cada ruta."""

    # route_id -> stop_id -> menor stop_sequence visto
    order_by_route: dict[str, dict[str, int]] = {
        route_id: {} for route_id in selected_route_ids
    }
    with require_file(stop_times_path, "stop_times.txt").open(
        "r", encoding="utf-8-sig", newline=""
    ) as handle:
        for row in csv.DictReader(handle):
            trip_id = row.get("trip_id", "").strip()
            trip = trips.get(trip_id)
            if trip is None:
                continue
            route_id = trip.get("route_id", "").strip()
            stop_id = row.get("stop_id", "").strip()
            if route_id not in selected_route_ids or not stop_id:
                continue
            sequence = parse_int(row.get("stop_sequence", ""), "stop_sequence", trip_id)
            previous = order_by_route[route_id].get(stop_id)
            if previous is None or sequence < previous:
                order_by_route[route_id][stop_id] = sequence
    return {
        # El consumidor espera (stop_sequence, stop_id), no el orden natural
        # de dict.items() que sería (stop_id, stop_sequence).
        route_id: sorted(
            ((sequence, stop_id) for stop_id, sequence in mapping.items()),
            key=lambda item: (item[0], item[1]),
        )
        for route_id, mapping in order_by_route.items()
    }


def build_network(
    source_dir: Path,
    generated_at: str,
    line_configs: list[dict[str, str]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    selected_ids = {line["route_id"] for line in line_configs}
    feed_info = load_feed_info(source_dir / "feed_info.txt")
    routes = load_routes(source_dir / "routes.txt", selected_ids)
    stops = load_stops(source_dir / "stops.txt")
    trips, shapes_by_route = load_trips(source_dir / "trips.txt", selected_ids)
    chosen_shape_by_route = choose_shape_ids(line_configs, shapes_by_route)
    shapes = load_shapes(source_dir / "shapes.txt", set(chosen_shape_by_route.values()))
    station_orders = load_station_orders(
        source_dir / "stop_times.txt", trips, selected_ids
    )

    lines: list[dict[str, Any]] = []
    diagnostics: dict[str, Any] = {"missingStations": {}, "shapeIds": {}}
    for line in line_configs:
        route_id = line["route_id"]
        shape_id = chosen_shape_by_route[route_id]
        stations: list[dict[str, Any]] = []
        missing_stations: list[str] = []
        for _, stop_id in station_orders[route_id]:
            stop = stops.get(stop_id)
            if stop is None:
                missing_stations.append(stop_id)
                continue
            stations.append(
                {
                    "id": stop["id"],
                    "name": stop["name"],
                    "coordinates": [stop["lon"], stop["lat"]],
                }
            )
        if len(stations) < 2:
            raise ValueError(f"route_id {route_id} quedó con menos de dos estaciones")
        points = simplify_points(orient_points_to_stations(shapes[shape_id], stations))
        lines.append(
            {
                "id": int(line["id"]),
                "code": line["code"],
                "name": line["name"],
                "color": line["color"],
                "from": line["from"],
                "to": line["to"],
                "routeId": route_id,
                "coordinates": [[lon, lat] for lon, lat in points],
                "stations": stations,
            }
        )
        diagnostics["shapeIds"][line["code"]] = {
            "routeId": route_id,
            "shapeId": shape_id,
            "originalPoints": len(shapes[shape_id]),
            "outputPoints": len(points),
            "stations": len(stations),
        }
        if missing_stations:
            diagnostics["missingStations"][line["code"]] = missing_stations

    network = {"generatedAt": generated_at, "feed": feed_info, "lines": lines}
    return network, diagnostics


def decode_realtime_snapshot(
    realtime_path: Path, generated_at: str
) -> tuple[dict[str, Any] | None, str | None]:
    """Resume un FeedMessage histórico sin intentar tratarlo como live data."""

    if not realtime_path.is_file():
        return None, f"No se encontró snapshot realtime: {realtime_path}"
    try:
        from google.transit import gtfs_realtime_pb2  # type: ignore
    except ImportError:
        return (
            None,
            "No se pudo importar gtfs-realtime-bindings; se omitió el resumen realtime.",
        )

    feed = gtfs_realtime_pb2.FeedMessage()
    try:
        feed.ParseFromString(realtime_path.read_bytes())
    except Exception as exc:  # protobuf puede usar DecodeError según versión
        return None, f"No se pudo decodificar el snapshot realtime: {exc}"

    entity_types: Counter[str] = Counter()
    route_ids: Counter[str] = Counter()
    vehicle_timestamps: list[int] = []
    vehicle_examples: list[dict[str, Any]] = []
    for entity in feed.entity:
        if entity.HasField("vehicle"):
            entity_types["vehicle"] += 1
            vehicle = entity.vehicle
            route_id = vehicle.trip.route_id if vehicle.HasField("trip") else ""
            if route_id:
                route_ids[route_id] += 1
            if vehicle.HasField("timestamp"):
                vehicle_timestamps.append(int(vehicle.timestamp))
            if len(vehicle_examples) < 5:
                example: dict[str, Any] = {"entityId": entity.id}
                if vehicle.HasField("vehicle"):
                    example["vehicleId"] = vehicle.vehicle.id
                    if vehicle.vehicle.HasField("label"):
                        example["label"] = vehicle.vehicle.label
                if route_id:
                    example["routeId"] = route_id
                if vehicle.HasField("trip"):
                    example["startDate"] = vehicle.trip.start_date
                    example["startTime"] = vehicle.trip.start_time
                if vehicle.HasField("position"):
                    example["position"] = [
                        vehicle.position.longitude,
                        vehicle.position.latitude,
                    ]
                vehicle_examples.append(example)
        if entity.HasField("trip_update"):
            entity_types["tripUpdate"] += 1
            if entity.trip_update.HasField("trip") and entity.trip_update.trip.route_id:
                route_ids[entity.trip_update.trip.route_id] += 1
        if entity.HasField("alert"):
            entity_types["alert"] += 1
        if entity.HasField("shape"):
            entity_types["shape"] += 1
        if entity.HasField("stop"):
            entity_types["stop"] += 1

    header_timestamp = int(feed.header.timestamp) if feed.header.HasField("timestamp") else None
    snapshot = {
        "generatedAt": generated_at,
        "historical": True,
        "isLive": False,
        "sourceFile": realtime_path.name,
        "note": (
            "Snapshot GTFS Realtime histórico decodificado; no representa datos en vivo. "
            "Los route_id/trip_id del snapshot pueden no coincidir con el feed GTFS estático."
        ),
        "feed": {
            "gtfsRealtimeVersion": feed.header.gtfs_realtime_version,
            "incrementality": (
                gtfs_realtime_pb2.FeedHeader.Incrementality.Name(
                    feed.header.incrementality
                )
                if feed.header.HasField("incrementality")
                else None
            ),
            "timestamp": header_timestamp,
            "timestampIso": timestamp_iso(header_timestamp),
        },
        "entities": {
            "total": len(feed.entity),
            "types": dict(sorted(entity_types.items())),
            "routeIds": dict(sorted(route_ids.items())),
            "vehicleTimestampMin": timestamp_iso(min(vehicle_timestamps))
            if vehicle_timestamps
            else None,
            "vehicleTimestampMax": timestamp_iso(max(vehicle_timestamps))
            if vehicle_timestamps
            else None,
            "vehicleExamples": vehicle_examples,
        },
    }
    return snapshot, None


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def choose_default_source(project_root: Path) -> Path:
    upload = Path("/home/ubuntu/upload")
    return upload if upload.is_dir() else project_root / "data" / "gtfs"


def parse_args() -> argparse.Namespace:
    project_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=choose_default_source(project_root),
        help="Directorio con las fuentes GTFS; por defecto /home/ubuntu/upload si existe.",
    )
    parser.add_argument("--trips", type=Path, help="Ruta explícita a trips.txt.")
    parser.add_argument("--stop-times", type=Path, help="Ruta explícita a stop_times.txt.")
    parser.add_argument(
        "--realtime",
        type=Path,
        help="Ruta explícita al snapshot GTFS Realtime binario.",
    )
    parser.add_argument(
        "--network-output",
        type=Path,
        default=project_root / "public" / "data" / "network.json",
    )
    parser.add_argument(
        "--realtime-output",
        type=Path,
        default=project_root / "public" / "data" / "realtime-snapshot.json",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_dir = args.source_dir.resolve()
    generated_at = utc_now_iso()
    trips_path = (args.trips or source_dir / "trips.txt").resolve()
    stop_times_path = (args.stop_times or source_dir / "stop_times.txt").resolve()
    realtime_path = (
        args.realtime
        or source_dir / REALTIME_FILENAME
    ).resolve()

    # build_network usa los nombres estándar dentro de source_dir; permitir
    # explícitamente archivos grandes ubicados fuera sin copiarlos al repo.
    if trips_path != source_dir / "trips.txt" or stop_times_path != source_dir / "stop_times.txt":
        temp_source = source_dir
        network, diagnostics = build_network_with_overrides(
            temp_source,
            trips_path,
            stop_times_path,
            generated_at,
            LINE_CONFIG,
        )
    else:
        network, diagnostics = build_network(source_dir, generated_at, LINE_CONFIG)

    write_json(args.network_output, network)
    realtime, realtime_warning = decode_realtime_snapshot(realtime_path, generated_at)
    if realtime is not None:
        write_json(args.realtime_output, realtime)

    summary = {
        "networkOutput": str(args.network_output.resolve()),
        "realtimeOutput": str(args.realtime_output.resolve()) if realtime is not None else None,
        "generatedAt": generated_at,
        "feed": network["feed"],
        "lines": [
            {
                "id": line["id"],
                "code": line["code"],
                "routeId": line["routeId"],
                "points": len(line["coordinates"]),
                "stations": len(line["stations"]),
            }
            for line in network["lines"]
        ],
        "diagnostics": diagnostics,
    }
    if realtime is not None:
        summary["realtime"] = {
            "historical": realtime["historical"],
            "timestamp": realtime["feed"]["timestamp"],
            "timestampIso": realtime["feed"]["timestampIso"],
            "entities": realtime["entities"]["total"],
            "types": realtime["entities"]["types"],
        }
    if realtime_warning:
        summary["realtimeWarning"] = realtime_warning
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def build_network_with_overrides(
    source_dir: Path,
    trips_path: Path,
    stop_times_path: Path,
    generated_at: str,
    line_configs: list[dict[str, str]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Variante de build_network para trips/stop_times fuera de source_dir."""

    selected_ids = {line["route_id"] for line in line_configs}
    feed_info = load_feed_info(source_dir / "feed_info.txt")
    routes = load_routes(source_dir / "routes.txt", selected_ids)
    stops = load_stops(source_dir / "stops.txt")
    trips, shapes_by_route = load_trips(trips_path, selected_ids)
    chosen_shape_by_route = choose_shape_ids(line_configs, shapes_by_route)
    shapes = load_shapes(source_dir / "shapes.txt", set(chosen_shape_by_route.values()))
    station_orders = load_station_orders(stop_times_path, trips, selected_ids)

    lines: list[dict[str, Any]] = []
    diagnostics: dict[str, Any] = {"missingStations": {}, "shapeIds": {}}
    for line in line_configs:
        route_id = line["route_id"]
        shape_id = chosen_shape_by_route[route_id]
        original_points = shapes[shape_id]
        stations: list[dict[str, Any]] = []
        missing_stations: list[str] = []
        for _, stop_id in station_orders[route_id]:
            stop = stops.get(stop_id)
            if stop is None:
                missing_stations.append(stop_id)
                continue
            stations.append(
                {
                    "id": stop["id"],
                    "name": stop["name"],
                    "coordinates": [stop["lon"], stop["lat"]],
                }
            )
        if len(stations) < 2:
            raise ValueError(f"route_id {route_id} quedó con menos de dos estaciones")
        points = simplify_points(orient_points_to_stations(original_points, stations))
        lines.append(
            {
                "id": int(line["id"]),
                "code": line["code"],
                "name": line["name"],
                "color": line["color"],
                "from": line["from"],
                "to": line["to"],
                "routeId": route_id,
                "coordinates": [[lon, lat] for lon, lat in points],
                "stations": stations,
            }
        )
        diagnostics["shapeIds"][line["code"]] = {
            "routeId": route_id,
            "shapeId": shape_id,
            "originalPoints": len(original_points),
            "outputPoints": len(points),
            "stations": len(stations),
        }
        if missing_stations:
            diagnostics["missingStations"][line["code"]] = missing_stations

    return {"generatedAt": generated_at, "feed": feed_info, "lines": lines}, diagnostics


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
