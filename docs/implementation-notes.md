# Estado de la primera entrega

La landing, /login, /register, /app, /docs y /privacy están conectadas. Next.js sirve HTML significativo de la landing antes de ejecutar JavaScript. El manifiesto de rutas devuelve JSON HTTP 200. Un acceso sin sesión a /app entrega la redirección a /login sin contenido del dashboard; /api/fleet responde HTTP 401. Una ruta inexistente responde HTTP 404.

Las siete geometrías están importadas de GTFS con estaciones reales. La simulación tiene 568 unidades únicas y fuente explícita simulation; snapshots de 12 segundos. El archivo RT contiene 829 entidades históricas y no se consulta como servicio actual. El servidor no realiza llamadas externas de flota en modo demo.

El estilo CARTO Dark Matter, una muestra de tiles, sprite y glyphs devuelven HTTP 200 y CORS público. Durante la inspección se detectó que el CSS MapLibre asignaba position:relative al contenedor de altura cero; la regla específica transit-map.maplibregl-map corrige position:absolute y tamaño100%. La página pública de Preview confirmó mapa listo, calles de CDMX y siete rutas renderizadas. El mapa mantiene atribución CARTO/OpenStreetMap.

Las fuentes variables locales fueron corregidas a contenedor WOFF2 real y se conservaron licencias OFL. La página de registro se inspeccionó tras corregir el layout: no se solapan historia, enlace de regreso ni formulario.

NextAuth utiliza un secreto independiente configurado por tarjeta protegida. /api/auth/csrf devuelve token (no registrado en notas) y cookies HTTP-only/Secure/SameSite=None. /api/auth/session devuelve objeto vacío sin sesión. Respuestas de providers y callback usan rutas relativas. Entradas inválidas de login y registro se rechazan sin crear usuarios. No se inventó un usuario de Preview ni se usó una sesión sintetizada para saltar la protección.

Se corrigió un bug del límite de intentos: el contador saturaba al valor permitido y nunca bloqueaba; ahora satura en limit+1. Una prueba aislada confirma cinco intentos permitidos y el sexto/séptimo bloqueados. El registro tiene además una cota global de 50 intentos por minuto. El límite de IP presupone un proxy confiable que sanee X-Forwarded-For; el global y el de correo no dependen de ese supuesto.

La revisión read-only encontró seguimiento solo por snapshot y selección stale al filtrar: el seguimiento ahora se actualiza en el mismo frame interpolado; cambiar línea/tipo limpia la selección y el seguimiento. El resize del mapa responde al colapso del panel mediante ResizeObserver. Las estelas conservan seis posiciones reportadas, no un anillo de milisegundos.

Tests actuales: validación, scrypt, geometría y flota, regresión de límite de intentos. No crean cuentas en la base compartida. El build de producción inicial pasó; se repiten checks afectados antes del checkpoint final. La versión no se publica automáticamente.

## Dependencias parcheadas

Se consultó el catálogo/auditoría actual del gestor. La primera selección tenía advisories; se actualizaron Next.js a 15.5.29, NextAuth4 a4.24.15, MapLibre a6.16.0, MySQL2 a3.24.6, React/DOM a19.3.1 y Zod a4.6.7. Los overrides revisados de PostCSS8.5.32, sharp0.35.5 y uuid11.1.1 se declararon en pnpm-workspace.yaml, ubicación correcta de pnpm11. La auditoría de dependencias de producción del 5 de noviembre de 2026 terminó con «No known vulnerabilities found». Esto es un resultado puntual, no una garantía permanente.

Los controles de apertura de panel distinguen escritorio de móvil con matchMedia, para no abrir un modal invisible en pantallas grandes; al volver a escritorio se cierra el drawer móvil. El drawer incluye logout y acceso al inicio. La simulación de landing se sincroniza al montar antes de cargar el mapa, evitando un primer desplazamiento largo desde la posición de HTML estático.

El build final exacto (Next.js15.5.29) terminó con éxito después de los ajustes de drawer y landing, junto con TypeScript y siete tests. La ruta raíz, docs y privacidad se prerenderizan; auth y dashboard se sirven dinámicamente. Este resultado no sustituye una prueba de login con una cuenta real del usuario; no se crearon cuentas de prueba ni se sintetizaron sesiones para la comprobación.

## Ampliación deck.gl solicitada después de la primera entrega

El segundo adjunto reemplaza la flota de 568 por100 unidades, repartidas24/15/14/9/17/12/9 enL1–L7. La landing y el endpoint privado comparten el nuevo conteo. La lógica geométrica base permanece parametrizada para preservar las pruebas de otros tamaños de flota.

LiveMap usa MapLibreOverlay oficial de @deck.gl/maplibre9.4.1, no un alias de MapboxOverlay. BASEMAP.DARK_MATTER de @deck.gl/carto mantiene CARTO/OpenStreetMap. RutasPathLayer, estaciones/unidadesScatterplotLayer y estelasTripsLayer se dibujan enGPU. La animación usa RAF con máximo60 actualizaciones/s, sin ReactState por frame; los FPS finales dependen del dispositivo y no se prometen sin medición. Se ajustaroncurrentTime y la interpolaciónlineal para alinear frente de estela y bus; seis muestras observadas+endpoint futuro y segundosrelativos evitan timestampsfloat32grandes o no-monótonos.

Sidebar y BusPopup se separaron del dashboard. useLiveBuses usa un storeZustand no persistido y polling12s, preservando autenticación, pausa de consultas al ocultar pestaña y trazas internas reales. El contador de la fuente simulada no inventa llamadas externas.

Los comentarios Builder se contrastaron con tipos activos: basemap nullable, type maplibre y props.style; cámara initialViewState longitude/latitude normalizada a center para MapLibre. Embed queda comentado y requiere URL publicada/token de alcance mínimo, no el homepage del workspace.

Deck.gl introdujo dependencias transversales con avisos. Fflate0.7.5 e image-size2.0.4 corrigen parsers; un pequeño parche reproducible del CLI texture-compressor adapta su llamada antigua porfilepath a lectura de buffer, conservando compatibilidad. El Dockerfile copia patches antes de instalar. La auditoría de producción vuelve a cero advisories conocidos y pasan nueve pruebas. Dos builds de subagentes concurrentes produjeron unmanifestausente trascompilar; main repite un build limpio aislado, sin reutilizar un éxito parcial.

La comprobación de registro real se efectuó mediante el formulario de /register con una cuenta claramente de validación (dominioexample.test, sin envíos de correo) y contraseñaaleatoria, no un usuario sembrado ni un token sintético. El servidor creó la cuenta y NextAuth abrió /app con cookievalidada. El registro→autologin→dashboard quedó observado enPreviewHTTPS.

La revisión pública de celular390×844, tablet768×1024 y laptop1440×900 confirmóformulariossinrecortes. Detectó que el título largo decelular provocaba una líneaextra y solapamiento de la etiqueta de mapa conlafreenote; se ajustófont-size, nowrap y comienzo delárea de mapa. La revisión autenticada detectó el workerURLvacío deMapLibre6 (elbuildno lo detecta): se añadió elpatrónoficialnewURLimportmeta/setWorkerUrl, para workerconhash emitido porNext15. La baseCARTOrespondíaHTTP200. Se repite la comprobación afectada tras elrebuild.

El revisor de la ampliación señaló órbita sincapRAF y snapshotZustandretainedafterremount. La órbita ahora comparte unguard60Hz; el hook usa generación/AbortController y reseteaestadoal montar/desmontar, evitando reutilizar la petición de la instanciaanterior. Ninguna petición de una instancia obsoleta puedepublicar su snapshot.

En laptop, tablet y celular se confirmó el viewportCSSreal, sin overflowhorizontal, overlayinterleaved y popup de estación dentrode límites. La búsquedaBuenavista devolvióestacionesL1/L4 y filtró24 unidadesL1; el drawerrestauró100/7líneas. HoverGPU mostróMB-4006 con línea/sentido/rumbo/velocidad/estación. Sinembargo elclick de capa no abriópopup ni sin escalado, porque el reconocedornativoDeck no recibía elpointerdownconsumido porMapLibre. Se trasladó la selección a map.on('click') conoverlay.pickObject en coordenadasde event.point ylayerIds deunidades/estaciones. No es pickingDOM ni un bypassdeauth. Se eliminóonClickdelascapas para evitardoble callback, se mantienehoverGPUy se desmontaellistener.

### Evidencia final del picking

La versión recompilada abre BusPopup al hacer click en la coordenada GPU de MB-4006: L4, Convencional, sentido Buenavista, velocidad simulada37km/h y próxima estación BuenavistaL4. «Seguir unidad» dejó el botón con estado activo y la cámara siguió la unidad. El popup medido en el viewport normal1280×1100 quedó entre x958–1250 y y798–1056. El mapa permaneció ready. Se comprobó mediante eventosdelcanvas en coordenadas reales, no escribiendo directamente el store. El hover se había observado con cursor real. Pasan TypeScript,11tests/6suites y build deproducción; auditoría deproducción sin avisosconocidos. Lasresoluciones390×844,768×1024 y1440×900 se validaron sin desbordamiento horizontal.

El modo grabación entró y salió mediante sus botones: contador100, clase is-recording activada/desactivada y mapa ready en ambos estados. La cuenta de validación cerró sesión mediante el botón normal. El código se aceptó en origin/main con SHA257ddf2cef3ff5be870055d6c50e3aa9bf14b93c. Auto-publish está desactivado; no se solicitó ni ejecutó publicación.
