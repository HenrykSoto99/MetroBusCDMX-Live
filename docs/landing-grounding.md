# Landing: unidades sin efecto de vuelo

## Causa comprobada

El mapa público usaba un snapshot SSR de hora fija. Al montarse, la landing lo sustituía por posiciones de la hora actual. LiveMap podía conservar el snapshot anterior y animar un desplazamiento recto de 12s entre coordenadas separadas varias horas. Esas rectas podían atravesar kilómetros fuera de las rutas, aunque cada endpoint provenía de una geometría GTFS real. La interpolación ordinaria entre snapshots separados12s solo genera desviaciones pequeñas en curvas; no explica por sí sola un salto masivo al inicio.

Además, la cámara inicial tenía pitch42°/bearing−15° y círculos billboard blancos con halos grandes. Ese estilo acentuaba la percepción de unidades suspendidas por encima del plano cartográfico.

## Corrección

La landing monta LiveMap únicamente después de sembrar un snapshot de hora cliente actual; el snapshot SSR se conserva como información inicial para el contador, no como origen de animación. Snapshots separados por más de24s, inválidos o con tiempo inverso no se interpolan: se toman como observaciones nuevas. El historial precargado sigue reservado a la simulación.

La simulación usa un epoch compartido continuo, sin el módulo de10000s que antes reiniciaba toda la flota. Sus recorridos conservan ida/vuelta sobre la geometría de cada línea, IDs, conteos y aviso de datos simulados.

El hero comienza y se restablece a centro[-99.145,19.426],zoom11.3,pitch0,bearing0. Se evita rotación/inclinación accidental, conservando rueda, pinch-zoom y paneo. Los vehículos siguen blancos, con radio3px/borde1px y sin halo expansivo. El dashboard conserva sus tamaños anteriores, halo, selección y modo3D. El fallbackSVG usa la escala compacta solo en hero.

## Comprobación

TypeScript y47 pruebas pasan, incluyendo discontinuidades de reloj, reset2D y montaje después del snapshot cliente. No se crean cuentas, no se escriben datos de producción y no se cambia configuración de NextAuth/MySQL/Netlify en este arreglo.

El build exacto `pnpm build` terminó con código0. En el navegador de Preview, MapLibre/deck.gl quedan ready con100 unidades: los segmentos de dos snapshots consecutivos midieron como máximo69.8m y68.5m, no kilómetros. Acercar cambió zoom11.3→12.3 y Restablecer devolvió centro inicial,zoom11.3,pitch0,bearing0. Se verifica el arreglo en Preview; este registro no afirma que el nuevo commit esté publicado en Netlify.
