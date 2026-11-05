# Identidad de estaciones

Las estaciones se identifican con un símbolo MB rojo local, generado como SVG y atlas PNG128×128 para IconLayer. En el dashboard se muestran con20–36px según zoom, frente al punto anterior de6px de diámetro. El halo conserva el color de su línea. En la landing el símbolo se reduce a15px para no tapar la visualización de la red. El icono es una etiqueta MB propia de esta interfaz, no el pictograma individual oficial de una estación.

Hover muestra nombre, línea/corredor, ID y coordenadasGTFS. Click/tap selecciona la estación y abre la tarjeta con identidad de48px, datos y unidades cercanas/estimaciones claramente señaladas como demo. El tooltip se coloca dentro del mapa, evitando salirse al borde. La vistaSVGde respaldo conserva MB y selección accesible con Enter/Space.

Station permite `pictogramUrl` y `pictogramSourceUrl` opcionales. Si se incorpora un activo individual verificado, tooltip y tarjeta lo muestran; si la imagen falla, vuelven aMB. No se añaden logos inventados. Se localizó la [sección oficial de significado de estacionesL1](https://www.metrobus.cdmx.gob.mx/mapas-de-sistema/mapa-linea-1/L1-estaciones), pero el servidor cerró conexiones al intentar inspeccionar los activos individuales tanto desdeHTTPcomo desde navegador. No se extrajo ni publicó un catálogo oficial en esta entrega. LosGTFSadjuntos no incluyen esas imágenes.

El cambio no convierte velocidades, alertas o tiempos simulados en datos operativos. Los nombres propios y coordenadas se conservan en ambosidiomas.

## Identidad aportada por el usuario

Los logos suministrados posteriormente se utilizan como marca de landing y app. Se conservan sus PNG originales y las copias optimizadas mantienen los colores. Esto no atribuye esos logos como pictogramas de una estación individual. Los iconos MB de mapa siguen siendo la identificación general de estación, y los campos de pictograma permiten incorporar un catálogo verificado más adelante.
