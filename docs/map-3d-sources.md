# Edificios 3D de Metrobus

## Contrato

`lib/map-3d.ts` exporta exactamente:

```ts
sync3DBuildings(
  map: import("maplibre-gl").Map,
  enabled: boolean,
  theme: "light" | "dark",
): boolean
```

Devuelve `true` cuando encuentra una fuente vectorial y un `source-layer` de edificios compatible, y cuando puede conservar o añadir `metrobus-3d-buildings`. Devuelve `false` para estilos ilegibles, fuentes no vectoriales, capas desconocidas o errores de MapLibre. La función nunca lanza el error al llamador.

La utilidad reconoce solamente los nombres de capa vectorial documentados para los esquemas que se verificaron:

- CARTO Dark Matter y Positron públicos usan la fuente `protomaps`, `source-layer: "buildings"` y capas base `building`/`building-top` desde `minzoom: 13`. [1] [2]
- Protomaps documenta para `buildings` las propiedades numéricas `height` y `min_height`. También aclara que los edificios se fusionan en z0–14 y pasan a edificios OSM individuales desde z15. [3]
- OpenMapTiles documenta una capa `building` con `render_height` y `render_min_height`, ambas alturas aproximadas derivadas de niveles o tags de altura. [4]

Si `queryRenderedFeatures` o metadatos de la fuente están disponibles, la utilidad prefiere comprobar que la propiedad de altura observada sea numérica. Si todavía no hay tiles renderizadas —por ejemplo, durante el primer `style.load`— usa únicamente el par correspondiente al esquema conocido. No usa un valor constante de sustitución: una propiedad ausente o inválida se evalúa a `0`.

## Render y seguridad

La capa se crea como `fill-extrusion` con `minzoom: 13.5`. La altura es una expresión de datos basada en `height`/`render_height`; la base usa `min_height`/`render_min_height` y se limita mediante `min` para no superar la altura. El estilo claro usa `#aeb6bf` y el oscuro `#59636e`, con opacidad moderada y gradiente vertical neutral. Las propiedades de `fill-extrusion-height` y `fill-extrusion-base` son expresiones en metros según la especificación de MapLibre. [5]

La inserción intenta colocar la capa antes de la primera capa de símbolos identificada como etiqueta. Si esa etiqueta desaparece durante una sustitución de estilo, reintenta al final del stack. Cuando `enabled` es `false`, solo cambia `layout.visibility` a `none`; no elimina la capa ni destruye la fuente. Una llamada posterior con el tema contrario actualiza color, opacidad y expresiones de la capa existente.

Un `source-layer` personalizado o un style dinámico que no sea reconocible se rechaza sin excepción. En particular, no se aplica `fill-extrusion` a una capa llamada `footprints` solo porque su `id` contenga una palabra parecida.

## Llamada principal y cambios de estilo

La integración principal debe llamar a la función después del primer estilo cargado y después de cada cambio completo de estilo claro/oscuro. La misma llamada es idempotente:

```ts
const apply3DBuildings = () => sync3DBuildings(map, enabled3D, theme);

map.once("style.load", apply3DBuildings);
apply3DBuildings();

// Después de map.setStyle(lightStyle o darkStyle), volver a registrar:
map.once("style.load", apply3DBuildings);
```

El cambio de tema que reemplaza el style debe volver a registrar el callback porque MapLibre reconstruye las capas del estilo. Si solo cambia el estado de visibilidad sin reemplazar el style, basta con llamar de nuevo a `sync3DBuildings`.

La capa de edificios no debe ocultar las unidades de deck.gl. El código principal que crea las capas de unidades debe usar `parameters: { depthTest: false }` en esas capas; esa bandera pertenece al render de deck.gl y no se puede configurar desde una especificación de capa MapLibre.

Para la vista 3D principal, el llamador conserva la cámara 2D antes de entrar y usa `zoom: 14.5`, `pitch: 58` y `bearing: -20`. Para volver a 2D, restaura el centro, zoom, pitch y bearing guardados en vez de calcular una vista nueva.

## Fuentes

[1]: https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json "CARTO Dark Matter public MapLibre style"
[2]: https://basemaps.cartocdn.com/gl/positron-gl-style/style.json "CARTO Positron public MapLibre style"
[3]: https://docs.protomaps.com/basemaps/layers "Protomaps basemap layers and building properties"
[4]: https://openmaptiles.org/schema/ "OpenMapTiles vector tile schema"
[5]: https://maplibre.org/maplibre-style-spec/layers/#fill-extrusion "MapLibre fill-extrusion layer specification"
