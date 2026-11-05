import type { Layer } from "@deck.gl/core";

/** Future Builder integration. Keep provider credentials out of browser code.
 * A published public cartoMapId may be fetched without an administration token.
 * Private data sources need a narrowly scoped read-only token and a documented
 * proxy/allowlist. Do not put a workspace administration token in NEXT_PUBLIC_*.
 *
 * const { fetchMap } = await import('@deck.gl/carto');
 * const builder = await fetchMap({ cartoMapId: PUBLIC_PUBLISHED_MAP_ID });
 * if (builder.basemap?.type === 'maplibre') map.setStyle(builder.basemap.props.style);
 * overlay.setProps({ layers: [...builder.layers, ...metrobusLiveLayers] });
 * const view = builder.initialViewState;
 * map.flyTo({center: [view.longitude, view.latitude], zoom: view.zoom,
 *   pitch: view.pitch, bearing: view.bearing});
 *
 * The exact response should be validated against the active CARTO publication,
 * because published layers, token requirements and basemap schema can change.
 */
export interface BuilderLayerBundle { layers: Layer[]; publicMapId: string }

/** CARTO Builder Embed alternative (intentionally not activated by default).
 * Use the actual public embed URL provided by Builder, not clausa.app.carto.com
 * (the workspace homepage is not an embed URL). If Builder issues a public
 * read-only embed token, treat its scope/lifetime as public and configurable;
 * request any protected access token through the project's secure card.
 *
 * <iframe
 *   src={validatedPublishedEmbedUrl}
 *   title="Mapa Metrobús diseñado en CARTO Builder"
 *   className="absolute inset-0 h-full w-full border-0"
 *   loading="lazy"
 *   referrerPolicy="strict-origin-when-cross-origin"
 *   sandbox="allow-scripts allow-same-origin allow-popups"
 * />
 *
 * An embedded Builder map is an alternative view, not the LiveMap renderer:
 * our ScatterplotLayer/TripsLayer picking cannot be injected into that iframe.
 * Prefer fetchMap integration when the live bus overlay must remain interactive.
 */
export function validateBuilderEmbedUrl(value:string):string {
  const url=new URL(value);
  if(url.protocol!=="https:" || url.username || url.password)throw new Error("La publicación CARTO debe usar HTTPS sin credenciales en la URL.");
  if(!url.hostname.endsWith(".carto.com") && !url.hostname.endsWith(".carto.app"))throw new Error("Usa el enlace publicado oficial de CARTO Builder.");
  return url.toString();
}
