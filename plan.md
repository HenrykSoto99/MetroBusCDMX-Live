# MetroBusCDMX-Live — implementación aprobada

Se implementa el Blueprint confirmado: landing, autenticación y dashboard protegido, en ese orden. Stack: Next.js 15 App Router, TypeScript, Tailwind CSS y componentes UI locales basados en shadcn/Radix, MapLibre GL JS y Zustand. Auth: NextAuth con Credentials y usuarios persistentes en MySQL administrado; contraseñas derivadas con scrypt, secreto independiente de NextAuth por variable protegida. Registro válido inicia sesión y dirige a /app. Las sesiones usan cookies Secure/SameSite=None para HTTPS Preview. No se inventan usuarios ni se omite la protección.

## Dirección visual

La referencia de Dribbble (Logistic Logo / Moving Flow de Nesar U. Rahid) inspira el movimiento tipográfico, los corredores y el contraste cálido de flujo, sin copiar su símbolo ni su composición. La app adopta una estética editorial de control urbano: negro carbón, superficies cálidas en grafito, rojo Metrobús #E30613, blanco hueso y los siete colores oficiales de línea. El mapa ocupa una escena lateral en el hero y toda la superficie del dashboard. Se evitan tarjetas genéricas repetidas y se usa una retícula operacional con líneas finas, números prominentes y paneles sobrios.

Principios: jerarquía tipográfica fuerte; datos honestos y legibles; movimiento contenido; espacio oscuro amplio. Motivos: monograma MB formado por dos vías, cuadrículas de coordenadas, puntos vivos de ruta. Tipografía: Space Grotesk para títulos y marca; Inter para UI; monospace para métricas, coordenadas e inspector. No hay archivos de fuentes adjuntos; las fuentes del enlace no se identifican de forma verificable, por lo que se usa una pareja libre similar, documentada como sustitución.

Marca: «La ciudad, en movimiento». Personalidad: urbana, precisa, accesible. Voz: frases cortas concretas; «Tu próxima ruta empieza aquí» y «Sigue el pulso de la CDMX». Interacción: filtros reversibles, búsqueda inmediata, transiciones de 180–250 ms y desplazamiento suave del mapa. Animación: vehículos interpolados cada 12 segundos, pulsos discretos; respeto a prefers-reduced-motion. No se usan ilustraciones decorativas; la visualización cartográfica es el asset principal.

## Estructura

- app/: rutas públicas /, /login, /register, /docs, /privacy y protegida /app; APIs de auth, registro, red y fleet.
- components/: marca, navegación, landing, auth, dashboard, mapa y primitivas UI.
- lib/: base de datos, NextAuth, validación y adaptadores transit tipados.
- stores/: estado de filtros, selección y controles.
- public/data/: red GTFS transformada y resumen histórico RT; public/: fuentes, icono y manifiesto de rutas.
- scripts/: importación GTFS y migración aditiva MySQL.
- data/: fuentes mínimas GTFS y notas de procedencia.

## Datos y comportamiento

Los GTFS adjuntos aportan rutas, colores, shapes y estaciones reales. El feed está fechado 2026. El archivo con extensión .proto es binario: se tratará como snapshot GTFS Realtime histórico, nunca como API activa. La primera entrega usa fleet simulada (aprox. 568 vehículos) sobre geometrías reales, con source=simulation visible tanto en landing como en panel. No se afirma operación oficial ni datos en vivo reales.

Un adaptador desacoplado ofrece vehicles[], route_id, latitude, longitude, bearing, speed, next_stop y timestamp. /api/fleet comparte snapshots por intervalo de 12 segundos. Se interpolan en cliente y se guardan seis posiciones para estelas. La búsqueda cubre L1–L7 y estaciones; filtros por línea y servicio; contador y ranking reflejan filtros. Selección de unidad, zoom, centrado, seguimiento, estelas y modo grabación (incluida tecla R) son funcionales. Modo grabación oculta paneles y orbita la cámara, sin prometer captura de archivo de video. Alertas se presentan como ejemplos simulados. Inspector distingue peticiones internas de llamadas externas (cero en simulación).

## Servicios y despliegue

El frontend y las APIs se sirven en el mismo proceso Next.js, puerto 3000, sin origen interno en enlaces del navegador. MySQL conserva cuentas y límites de acceso; migraciones aditivas y repetibles separadas del startup. El despliegue usa Docker standalone Next.js y es compatible con Vercel usando una base MySQL externa. La landing se renderiza con HTML inicial; auth y /app no se indexan. La publicación no se ejecutará automáticamente. La versión quedará guardada como checkpoint y accesible en Preview.

## CARTO

La guía adicional del usuario pide un mapa profesional con CARTO (workspace clausa.app.carto.com). Se integra de inmediato el estilo público CARTO Dark Matter mediante MapLibre, con atribución de CARTO/OpenStreetMap. No se necesita acceder al workspace para ese basemap. Se permite sustituir el basemap con NEXT_PUBLIC_MAP_STYLE_URL (style.json compatible con MapLibre). Una capa privada de CARTO Builder requerirá un mapa publicado, TileJSON/estilo o acceso documentado y token mínimo suministrado de forma protegida; no se inventarán permisos ni se expondrán credenciales de administración.

## Ampliación del usuario — mapa deck.gl

El adjunto adicional pasted_content_2.txt pasa a ser el requisito activo de render cartográfico: MapLibre + @deck.gl/layers/@deck.gl/geo-layers/@deck.gl/carto, ScatterplotLayer para unidades, TripsLayer para estelas temporales, overlay interleaved cuando el contexto lo soporte y BASEMAP.DARK_MATTER. Se conserva la landing en / y dashboard protegido en /app; el árbol nuevo era sugerido y no desplaza el flujo de acceso aprobado.

La nueva solicitud de 80–120 unidades reemplaza el conteo anterior de 568/450–650: se usará una simulación coherente de 100 vehículos tanto en hero como en dashboard, marcada explícitamente como demo. Se crearán components/LiveMap.tsx, lib/metrobus-mock.ts y lib/useLiveBuses.ts. El estado de snapshots/peticiones pasará a un store Zustand no persistido; las preferencias de filtros siguen separadas y persistidas. Sidebar y BusPopup se separarán del dashboard. La integración Builder se documentará y dejará preparada como sección comentada con fetchMap y alternativa iframe de URL publicada/token de alcance mínimo. No se inventa una URL privada ni se accede al workspace sin autorización.

Las posiciones se interpolan cada12s; las estelas TripsLayer conservan tiempos y seis snapshots por unidad. El contador de llamadas se mantiene honesto: peticiones internas reales a la fuente simulada, señaladas como demo; llamadas externas reales cero. Se prioriza render GPU sin recrear el mapa cada refresh. Hay fallback no-interleaved cuando se necesite y vistaSVG honesta si fallaWebGL, sin sacrificar protección de sesión ni las rutas públicas.
