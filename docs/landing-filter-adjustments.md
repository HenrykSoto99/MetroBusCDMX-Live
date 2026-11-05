# Ajustes de landing y filtros

## Estaciones MB

El mapa público reduce los iconos de estación de15px a10px y el contorno del halo de2px a1px, sin cambiar el atlasMB ni los nombres/datos. El mapa del dashboard conserva20–36px. El fallbackSVG distingue hero/dashboard y usa10px/18px, respectivamente.

## Rueda y vista inicial

MapLibre ya no exigeCtrl para la rueda sobre el mapa de landing. La zona de texto del hero conserva sus eventos normales y su contenedor general deja pasar eventos al mapa. Se añaden botones ES/EN para Acercar,Alejar y Restablecer vista inicial. Restablecer elimina la selección de línea de preview y restaura centro[-99.145,19.426],zoom11.3,pitch42,bearing−15. Desmarcar la línea de preview también vuelve a ese encuadre. Los controles no ejecutan comandos cuando el mapa interactivo no está disponible.

## Filtro de líneas de app

El botón de filtros del rail antes solo abría el panel; no enfocaba la secciónL1–L7 situada bajo contador/búsqueda/ranking. Ahora abre el panel/drawer, desplaza a la sección de líneas y enfoca su primer control visible. Se mantiene separado del control general de mostrar mapa.

La selección se endurece para mouse,touch y teclado con filas completas de tipo checkbox accesible, normalización de IDs válidos y migración de preferencias persistidas. Elegir líneas vuelve a mostrar recorridos, evitando que un estado previo de «Recorridos» ocultos parezca un filtro averiado. La hidratación de preferencias ocurre después de montar el dashboard. Se conserva la opción válida de ninguna línea, el tipo de unidad y el conteo de los vehículos filtrados.

No se crean cuentas nuevas ni se escribe en la base de datos. La comprobación de filtros usa estados y flota mock aislados, no una ruta de bypass de autenticación.

## Comprobación

TypeScript y43 pruebas pasan, incluyendo8 de normalización/migración/selección de filtros y regresiones del montaje del panel, escala deMB y vuelta al encuadre inicial. El build de producción termina con éxito; se recompila la mínima regla CSS de ancho100% para que el build entregado incluya exactamente la última fila accesible. La prueba de filtros es aislada y no reproduce la sesión privada del usuario, por lo que no se atribuye una causa única al fallo reportado.

En navegador público del servidor final, el mapa llegó a ready. Eventoswheel sinCtrl cambiaronzoom11.30→11.56→11.20. Click«Restablecer vista inicial» devolviózoom11.30,pitch42,bearing−15 ycentro[-99.145,19.426], con solo precisión flotante normal. Los tres controles miden36×36px. Build exacto y43 regresiones pasan. Salud ymanifiesto respondenHTTP200. El proxy dePreview mostró un placeholder transitorio; la comprobación se hizo sobre el puerto público del servidor, no sobre un deploy nuevo.
