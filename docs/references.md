# Referencias y procedencia

Repositorio de UX: https://github.com/croma-labs/transmilenio-live (MIT). Consulta 2026-11-05: snapshots compartidos cada 15 segundos, interpolación de vehículos, estelas de seis puntos, búsqueda de rutas y estaciones, selección/seguimiento de unidades, inspector y modo grabación. Esta implementación adapta esos patrones a CDMX; no usa la API de Colombia ni copia datos de TransMilenio.

Referencia de marca: https://dribbble.com/shots/27863648-Logistic-Logo-Design-Letter-R-Moving-Flow-Logo-Logos . Autor: Nesar U. Rahid. Concepto descrito por su autor: Letter R, Moving Flow, Connection/Container. Imagen guardada en docs/moving-flow-reference.jpg solo para referencia de diseño; no se publica como activo del sitio. Inspira corredores, calidez y tipografía geométrica; no se reutiliza su marca Reival. No se identifican fuentes de forma verificable en esa página. Fuentes de sustitución del proyecto: Space Grotesk e Inter, libres de Google Fonts, alojadas localmente.

Base cartográfica: CARTO Dark Matter GL, https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json . Documentación: https://docs.carto.com/carto-for-developers/carto-for-react/guides/basemaps . Datos de base © OpenStreetMap contributors y © CARTO. El workspace clausa.app.carto.com del usuario no concede acceso automático; se requiere publicación/exportación de estilo o capas para una personalización específica.

GTFS: archivos adjuntos del usuario, publisher Metrobus, https://www.metrobus.cdmx.gob.mx/ . feed_start_date 20260101, feed_end_date 20261231. El proyecto usa geometrías y estaciones del feed, con posiciones simuladas señaladas explícitamente. La precisión operacional no está garantizada por la simulación.

## deck.gl — ampliación

Se verificaron los docs actuales y exports del paquete9.4.1: https://deck.gl/docs/developer-guide/base-maps/using-with-maplibre ahora recomienda MapLibreOverlay de @deck.gl/maplibre para MapLibre4.5.1/5/6; no se usa un alias ficticio de MapboxOverlay. Interleaved comparte el contextoWebGL2; overlaid usa uncanvaspropio como alternativa. https://deck.gl/docs/api-reference/carto/overview ofrece BASEMAP y fetchMap({cartoMapId}) para Builder. ExportsBASEMAP.DARK_MATTER y fetchMap se comprobaron en paquete instalado. https://deck.gl/docs/api-reference/geo-layers/trips-layer requiere timestamps relativos enfloat32, no epoch largo. La familia deck.gl se fijó en9.4.1. Fecha consulta2026-11-05.

La guía oficial https://www.maplibre.org/maplibre-gl-js/docs/ (ESM → Next.js/Turbopack/Webpack) requiere setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs',import.meta.url).toString()) en proyectos con bundler. getWorkerUrl() del paquete6.16.0 era vacío por defecto y el mapa fallaba enruntime aunqueTypeScript/buildpasaban. Next15 emite el worker comoassetconhash; se añadió antes de crear el mapa. No se usa unCDNworker deversióndistinta ni hostnameinterno.
