# Datos GTFS de Metrobus CDMX

## Procedencia y vigencia

Las fuentes provienen del archivo GTFS entregado para este proyecto y se conservaron sin transformar en `data/gtfs/`:

- `routes.txt`: rutas y colores del feed.
- `stops.txt`: estaciones con nombre y coordenadas WGS84.
- `shapes.txt`: geometrías de las rutas.
- `feed_info.txt`: `Metrobus`, `https://www.metrobus.cdmx.gob.mx/`, vigencia GTFS `20260101`–`20261231` (formato GTFS `YYYYMMDD`).
- `pasted_file_G5iMSO_Metrobus_GTFS_RT.proto`: archivo binario GTFS Realtime; la extensión/sufijo no describe un texto `.proto`.

El importador se encuentra en [`scripts/import_gtfs.py`](../scripts/import_gtfs.py). No utiliza LLMs. Lee `stop_times.txt` en streaming para asociar estaciones a cada `route_id`, y lee `trips.txt` para vincular viajes con rutas y shapes. Esos dos archivos no se copian al repositorio: `stop_times.txt` pesa aproximadamente 60 MB y no es una fuente mínima necesaria para distribuir las salidas generadas. Para regenerar, se pasan desde la ubicación original o mediante `--trips` y `--stop-times`.

Ejemplo con las fuentes completas fuera del repositorio:

```bash
python3 -m pip install --user gtfs-realtime-bindings
python3 scripts/import_gtfs.py --source-dir /home/ubuntu/upload
```

Si las fuentes pequeñas están en `data/gtfs/` y los archivos grandes están en otra ubicación:

```bash
python3 scripts/import_gtfs.py \
  --source-dir data/gtfs \
  --trips /ruta/al/trips.txt \
  --stop-times /ruta/al/stop_times.txt \
  --realtime data/gtfs/pasted_file_G5iMSO_Metrobus_GTFS_RT.proto
```

La ejecución genera `public/data/network.json` y, si `gtfs-realtime-bindings` puede decodificar el binario, `public/data/realtime-snapshot.json`.

## Red estática generada

`network.json` contiene exactamente las siete líneas principales solicitadas, con coordenadas `[lon, lat]`, colores canónicos, terminales y estaciones reales derivadas de GTFS:

| Línea | `routeId` principal | Corredor | Estaciones | Puntos de shape de salida |
|---|---:|---|---:|---:|
| L1 | `19499` | Insurgentes | 46 | 450 |
| L2 | `19563` | Eje 4 Sur | 33 | 450 |
| L3 | `19459` | Eje 1 Poniente | 36 | 89 |
| L4 | `19517` | Centro Histórico | 15 | 169 |
| L5 | `19559` | Eje 3 Oriente | 51 | 450 |
| L6 | `19470` | Eje 5 Norte | 34 | 450 |
| L7 | `19576` | Paseo de la Reforma | 30 | 326 |

Se eligió el shape asociado al `route_id` principal (en este feed coincide con `shape_id`). Las polilíneas largas se reducen con Douglas–Peucker a un máximo de aproximadamente 450 puntos, conservando los extremos y la geometría general. El sentido se orienta para que el primer punto corresponda al primer terminal de `from` y el último al de `to`; el GTFS original tenía los shapes de estas variantes en sentido inverso. No se incluyeron rutas auxiliares: la variante de aeropuerto de L4 queda como posible ampliación posterior.

## Snapshot GTFS Realtime

El archivo binario decodificado tiene:

- versión GTFS Realtime `2.0`;
- `incrementality: FULL_DATASET`;
- timestamp del feed `1793839978`, equivalente a `2026-11-05T00:52:58Z`;
- 829 entidades, todas de tipo `vehicle` en este snapshot.

`public/data/realtime-snapshot.json` marca explícitamente `historical: true` e `isLive: false`. No debe presentarse como posición actual ni consultarse como servicio en vivo. El resumen conserva el timestamp, conteo/tipos de entidades, IDs de ruta presentes y ejemplos de vehículos. Los `route_id`/`trip_id` del snapshot histórico pueden no coincidir con los IDs del GTFS estático vigente; tampoco se infiere una posición actual a partir de este archivo.

## Riesgos y límites

- Las fechas de `feed_info.txt` describen la vigencia del feed estático, no la fecha de generación de cada ejecución.
- La línea principal es una selección intencional de una variante larga por línea; no representa todos los ramales, sentidos ni servicios auxiliares.
- Las paradas se deduplican por `stop_id` y se ordenan por la menor secuencia observada en los viajes de la ruta principal.
- Las coordenadas dependen de la calidad del GTFS entregado y están en orden GeoJSON-like `[longitud, latitud]`, no `[latitud, longitud]`.
- El snapshot realtime es una captura histórica entregada con el proyecto y puede quedar desactualizada o tener IDs incompatibles con el feed estático.
