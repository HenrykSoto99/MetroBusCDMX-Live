# MetroBusCDMX-Live

Landing y dashboard de movilidad en español con Next.js 15, TypeScript, Tailwind CSS 4, componentes shadcn/Radix, MapLibre GL JS y deck.gl sobre CARTO Dark Matter, Zustand y autenticación email/contraseña con NextAuth y MySQL.

**Es una demo independiente, no oficial.** Las siete geometrías y estaciones proceden del GTFS adjunto de Metrobús. Las 100 unidades, velocidades, estimaciones y alertas se simulan y se identifican como tales. El nuevo adjunto pidió 80–120 unidades y reemplazó el conteo de la primera versión. El archivo GTFS Realtime adjunto es un snapshot guardado de 829 vehículos, no una conexión en vivo.

## Ejecución

Requisitos: Node 22, pnpm 11.25.0 y MySQL compatible. En el entorno Manus, `DATABASE_URL` y el secreto independiente `NEXTAUTH_SECRET` se inyectan de forma protegida; no se guardan en Git.

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
# Completa solo en tu entorno local. No comitees .env.local.
pnpm db:migrate
pnpm dev
```

Las variables definidas en `.env.local` deben estar cargadas para el script de migración si no las inyecta tu entorno. En una terminal local puedes usar `node --env-file=.env.local scripts/migrate.mjs`. Next.js carga automáticamente `.env.local` para desarrollo/build. Las migraciones son aditivas e idempotentes y se ejecutan por separado del arranque; nunca generan cuentas de prueba.

`http://localhost:3000` solo en local. En Preview HTTPS no establezcas `AUTH_COOKIE_SECURE=false`. Para HTTP localhost, usa esa opción de forma explícita; en cualquier hosting HTTPS debes mantener cookies Secure/SameSite=None. Algunas políticas del navegador bloquean cookies de terceros incluso con estos atributos: abre la app en una pestaña independiente si tu navegador lo requiere.

## Variables

`DATABASE_URL`: DSN MySQL privado, obligatorio para cuentas y límites de intentos; usar TLS según el servidor. `NEXTAUTH_SECRET`: secreto criptográfico aleatorio de al menos 32 caracteres. `NEXTAUTH_URL`: origen HTTPS canónico del despliegue cuando se conoce; para local usa `http://localhost:3000`. No uses el hostname interno del contenedor. `AUTH_COOKIE_SECURE`: omitida equivale a true; false exclusivamente para localhost HTTP. `NEXT_PUBLIC_MAP_STYLE_URL`: opcional; URL pública de un `style.json` compatible con MapLibre. Predeterminado: CARTO Dark Matter.

En Vercel, declara los valores en el panel de variables protegidas. En Manus, usa la tarjeta segura del proyecto; no pegues secretos en chats, código o URLs públicas. No se requiere una API key de CARTO para el estilo público utilizado.

## Rutas y estructura

`/` es la landing pública; `/login` y `/register` gestionan sesiones reales; `/app` requiere sesión validada del lado servidor. `/docs` explica fuentes y límites y `/privacy` describe el uso real de los datos. `/api/fleet` requiere autenticación y sirve snapshots privados; `/api/network` ofrece la red GTFS pública. `/api/health` es el health check público. `public/manus-routes.json` enumera las páginas del proyecto.

`components/landing.tsx`, `auth-form.tsx`, `dashboard.tsx` y `bus-map.tsx` separan experiencia pública, acceso, panel y render cartográfico. `lib/auth.ts`, `password.ts`, `db.ts` y `rate-limit.ts` encapsulan auth y persistencia. `lib/transit-types.ts`, `transit.ts` y `simulation.ts` definen el contrato, proveedor y simulación. `stores/dashboard.ts` conserva preferencias no sensibles en el navegador. `scripts/import_gtfs.py` genera la red y decodifica el snapshot opcional. `data/README.md` documenta las fuentes y selección de rutas.

La ampliación separa `components/LiveMap.tsx`, `Sidebar.tsx` y `BusPopup.tsx`. `lib/metrobus-mock.ts` define las 100 unidades y `lib/useLiveBuses.ts` guarda snapshots, estado de conexión y trazas en Zustand sin persistir vehículos en localStorage. `lib/carto-builder.ts` deja un punto de extensión documentado para fetchMap y la alternativa embed.

## Mapa CARTO y workspace personalizado

Se usa `BASEMAP.DARK_MATTER` de `@deck.gl/carto` (resuelve a `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`) con atribución © CARTO y © OpenStreetMap contributors. El overlay oficial `MapLibreOverlay` de `@deck.gl/maplibre` usa el contexto WebGL2 interleaved cuando está disponible. `PathLayer` dibuja las rutas, `ScatterplotLayer` los buses y `TripsLayer` las estelas con timestamps relativos. Zoom, perspectiva, centrado, selección, búsqueda y seguimiento son interactivos. Si falla WebGL o el estilo, se presenta una vista SVG honesta de la red real y un reintento.

El enlace `https://clausa.app.carto.com/` identifica un workspace, no un mapa compartible. Para integrar un diseño propio se necesita una publicación de CARTO Builder o una exportación de `style.json`/TileJSON/capas compatibles. Un iframe de Builder no permite necesariamente superponer la flota con MapLibre. Una integración con capas privadas también requiere un token de acceso con alcance mínimo; no expongas tokens de administración. El hook público `NEXT_PUBLIC_MAP_STYLE_URL` permite cambiar el estilo y requiere un rebuild por ser una variable frontend.

## Simulación y futura API

La simulación compartida usa snapshots cada 12 segundos y posiciones distribuidas a lo largo de las polilíneas GTFS reales. El cliente interpola movimientos, conserva hasta seis posiciones reportadas por unidad y pausa nuevas consultas cuando la pestaña está oculta. El inspector registra el estado y la duración reales de `/api/fleet` y distingue llamadas externas (cero en demo).

Reemplaza `transitProvider` en `lib/transit.ts` por una clase que implemente `TransitProvider`. Mantén la estructura `vehicles[]` con `id`, `line_id`, `route_id`, `latitude`, `longitude`, `bearing`, `speed`, `direction`, `next_stop`, `service_type` y `timestamp`, y `FleetSnapshot.source` explícito. Para GTFS-RT, decodifica el protobuf en servidor, valida rangos y timestamp, resuelve IDs de rutas/viajes contra la red estática y añade cache compartida. Necesitarás la URL activa del feed y su autorización cuando aplique; un archivo adjunto no se actualiza solo. Nunca conviertas un snapshot histórico en dato actual.

Se seleccionó una ruta principal por línea. L4 muestra la variante del Centro Histórico y no todos sus ramales/aeropuerto. Los tiempos de la hoja de estación se basan en cercanía geométrica y velocidad simulada, no son predicciones operativas. El modo grabación (R; Esc para salir) oculta paneles y orbita el mapa, pero no exporta video.

## Seguridad y límites de la demo

Las contraseñas se derivan con scrypt y salt aleatorio. Las consultas SQL están parametrizadas. NextAuth usa cookies HTTP-only, CSRF y JWT cifradas, con redirección limitada a `/app`. La ruta privada y el endpoint de flota verifican sesión; no hay bypass de desarrollo ni cuentas inventadas. Se limitan intentos mediante MySQL. Registro requiere aceptación del aviso de privacidad en el formulario.

Esta primera entrega no incluye verificación de correo, recuperación de contraseña, autenticación Google, eliminación autoservicio ni un contacto público de privacidad. Son extensiones de producción, no botones ficticios. El método de acceso elegido es email/contraseña, permitido por el alcance. Las políticas de retención/contacto deben concretarse antes de una apertura pública masiva.

## Checks y despliegue

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Vercel detecta Next.js. Configura MySQL accesible desde Vercel, `NEXTAUTH_SECRET` y el origen canónico `NEXTAUTH_URL`; ejecuta la migración una vez con el mismo DSN en un entorno autorizado. No ejecutes migraciones en el build. Para un servidor/container, el `Dockerfile` instala dependencias reproducibles y genera `.next/standalone`, ejecutado como usuario no root. Honoriza `PORT` (3000 predeterminado) y sirve `/api/health` sin autenticación. Los datos persistentes permanecen en MySQL, no en el filesystem efímero del contenedor.

## Diseño y referencias

Space Grotesk e Inter variables se alojan localmente bajo sus licencias OFL. No había archivos de fuentes adjuntos ni identificación verificable en el enlace visual. El diseño toma movimiento, tipografía geométrica y bandas cálidas del concepto Moving Flow de Nesar U. Rahid sin reutilizar la marca Reival. El patrón operacional se inspira en el repositorio MIT `croma-labs/transmilenio-live`. Ver `docs/references.md` para procedencia. La app no usa API Croma de Colombia ni se atribuye datos operacionales actuales.

## Detalles de la ampliación GPU

MapLibre6 requiere configurar su worker ESM antes de crear el mapa. LiveMap usa el patrón oficial con newURL del módulo worker e import.meta.url; Next15 publica un archivo con hash en /_next/static/media, sin usar un origen interno ni un workerCDN de otra versión. Tanto los archivos estáticos como el worker se copian al contenedor standalone.

La animación de unidades y la órbita se limitan a 60 actualizaciones por segundo; esto es un presupuesto máximo, no una promesa de FPS en todo hardware. TripsLayer usa segundos relativos y el frente de estela se sincroniza con la interpolación lineal. El hook cancela peticiones al desmontar y descarta respuestas de instancias anteriores. Las preferencias de filtros son locales; las posiciones no se persisten en el navegador.

La familia deck.gl está fijada a9.4.1. Los overrides de parsers y el parche de compatibilidad del CLI de texturas están declarados en pnpm-workspace.yaml y patches/. Son parte del lockfile y del Dockerfile; no se necesita editar node_modules al desplegar.
