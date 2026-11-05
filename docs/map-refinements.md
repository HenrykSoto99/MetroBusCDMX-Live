# Cambios de legibilidad del mapa

La estela anterior tenía el mismo color que la línea,2.4px de ancho y comenzaba sin historial, por lo que se confundía con la ruta y tardaba en notarse. La nueva estela usa una sombra contrastante y núcleo blanco más ancho, con desvanecimiento temporal de72s. Las rutas conservan su color oficial y bajan opacidad mientras la estela está activa.

La simulación puede precargar seis muestras anteriores porque su trayectoria es determinista y coincide con el simulador real de la app. No se precargan ni inventan posiciones para GTFS-RT. Cada posición de la estela tiene segundos relativos al origen del render; el vehículo y la cabeza comparten la misma interpolación. Esto sigue el [contrato de TripsLayer](https://deck.gl/docs/api-reference/geo-layers/trips-layer) para currentTime,trailLength y getTimestamps. El historial futuro anterior se reemplaza en cada snapshot, evitando timestamps duplicados o predicciones obsoletas.

Todas las unidades se dibujan como círculos blancos con contorno oscuro independientemente de la línea o el tipo. Halo y selección son neutrales. El contorno mantiene legibilidad sobre Positron; los círculos miran a la cámara también en perspectiva. Las estaciones mantienen su símboloMB y color de línea.

La perspectiva 3D usa inclinación de 58° y se acerca como mínimo a zoom14.3, en lugar de inclinar muy poco una vista de toda la ciudad. Su estado se obtiene de la cámara real y el control cambia entre Vista3D y Vista2D. Al regresar conserva el centro de foco y restaura el zoom/orientación 2D. «Centrar» utiliza una sola animación con pitch y bearing cero; antes, una animación de inclinación podía ser cancelada por otra de fitBounds. El seguimiento espera que termine una transición, evita recursión de eventos y luego acompaña la unidad.

Los edificios se extruyen solamente desde polígonos y alturas del basemap, con altura0 si el proveedor no la informa. El helper soporta CARTO/Protomaps y OpenMapTiles, se reaplica tras cambiar de tema y no inventa alturas. Su alcance y fuentes están en [map-3d-sources.md](./map-3d-sources.md). En estilos sin datos de edificios solo se ofrece perspectiva; el fallback SVG sigue siendo esquemático 2D.

Las etiquetas usan un portal para no ser recortadas por el rail o drawer. Hover y foco muestran el nombre; click/tap ejecuta la acción inmediatamente y mantiene el texto aproximadamente2.5s. La etiqueta se ajusta a los bordes reales de pantalla, admite descripción, se asocia con aria-describedby y se cierra con Escape o interacción externa. Las etiquetas incluyen Seguimiento, Vista3D/Vista2D, Acercar, Alejar, Centrar, líneas, alertas, ayuda, documentación, idioma, tema y cierres.

## Comprobaciones de esta revisión

En la demo pública se comprobó el overlay interleaved listo,100 unidades blancas y billboard activo. A zoom14.3/pitch58, el basemap devolvió124 polígonos de edificios y110 con altura positiva informada. El diagnóstico temporal de capas mostró100 estelas blancas, ancho5, ventana72s y timestamps relativos monótonos; el centro siguió la unidad sin cancelar inclinación o zoom. Esto verifica render/cámara de la demo, no es una nueva prueba de login ni una promesa de cobertura completa de alturas de todos los edificios.

La revisión read-only detectó cuatro bordes y se corrigieron: los comandos/grabación esperan una cámara estable; el fallbackSVG ahora dibuja estelas con el historial disponible y explica la limitación2D; la capa de etiquetas se monta una sola vez globalmente (también landing/login/docs); cambiar de fuente limpia cualquier historial simulado antes de aceptar observacionesGTFS-RT. Los controles cartográficos no disponibles tienen aria-disabled y explicación; no se deja un botón3D aparentemente operativo sobre un SVG.

La etiqueta real del control de tema se mostró tras click y la preferencia cambió a claro. Un target temporal junto al borde izquierdo (equivalente al rail) mostró «Seguimiento» dentro del viewport, mantuvo su descripción tras pointerout de touch y quedó asociado mediante aria-describedby; se retiró el target y la etiqueta al terminar. La capa cubre también botones/enlaces con SVG y un nombre visible o accesible, pero no asigna acciones ficticias a iconos decorativos.

Las pruebas incluyen espera/cancelación de comandos de cámara, precargado demo, tiempos monótonos, reduced motion, colores blancos independientes del tipo/línea, fuente de datos y montaje único de tooltips. No se crearon nuevas cuentas ni se escribió en la base de datos para esta revisión.

El fallback conserva el trazo de posiciones disponibles y lo desvanece por segmento con la misma ventana72s; al pasar de simulación aGTFS-RT se elimina el historial previo. El control3D se describe como no disponible cuando no hay mapa interactivo, pero su etiqueta sigue siendo consultable con teclado/tap. Los comandos esperan moveend antes de capturar una cámara estable y se descartan si otro comando los sustituye.

Resultado final: TypeScript sin errores,32 pruebas pasan y `pnpm build` de Next15.5.29 termina con exit0. No se añadieron dependencias, secretos, rutas de bypass ni tablas de base de datos. El código se guarda en el repositorio GitHub ya conectado; no se solicitó una publicación nueva en Netlify.
