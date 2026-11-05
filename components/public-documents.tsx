"use client";

import Link from "next/link";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { Brand } from "@/components/brand";
import { PreferenceControls } from "@/components/preference-controls";
import { useTranslation } from "@/lib/preferences";

const headerToolsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
} as const;

const headerLinkStyle = {
  fontSize: "11px",
  color: "var(--muted)",
} as const;

export function PublicHeader() {
  const { t } = useTranslation();

  return (
    <header className="document-header" style={{ width: "100%" }}>
      <Brand />
      <div style={headerToolsStyle}>
        <Link href="/" style={headerLinkStyle}>
          {t("Volver al inicio ↗", "Back to home ↗")}
        </Link>
        <PreferenceControls />
      </div>
    </header>
  );
}

export function DocsContent() {
  const { t } = useTranslation();

  return (
    <main className="document-page">
      <PublicHeader />
      <article className="document-body">
        <span className="eyebrow">{t("DATOS ABIERTOS / CDMX", "OPEN DATA / CDMX")}</span>
        <h1>
          {t("Una red abierta.", "An open network.")}
          <br />
          {t("Un mapa transparente.", "A transparent map.")}
        </h1>
        <p className="lead">
          {t(
            "MetroBusCDMX-Live es un proyecto independiente para explorar las siete líneas del Metrobús en un mapa interactivo.",
            "MetroBusCDMX-Live is an independent project for exploring the seven Metrobús lines on an interactive map.",
          )}
        </p>

        <div className="doc-notice">
          <p>
            <strong>{t("Esta versión es una demostración.", "This version is a demonstration.")}</strong>{" "}
            {t(
              "Las rutas y estaciones provienen del GTFS adjunto. Las posiciones, velocidades, tiempos estimados y alertas se simulan. No representan la operación actual del sistema.",
              "Routes and stations come from the attached GTFS. Positions, speeds, estimated times, and alerts are simulated. They do not represent the system's current operation.",
            )}
          </p>
        </div>

        <h2>{t("Las fuentes de la red", "The network sources")}</h2>
        <p>
          {t(
            "El GTFS estático contiene geometrías, estaciones, rutas y colores oficiales. Su vigencia declarada es del 1 de enero al 31 de diciembre de 2026. Se incluye una variante principal por línea, no todos los ramales y servicios, como la variante aeroportuaria de L4.",
            "The static GTFS contains official geometries, stations, routes, and colors. Its declared validity runs from January 1 through December 31, 2026. It includes one main variant per line, not every branch and service, such as the L4 airport variant.",
          )}
        </p>
        <p>
          {t("Fuente: ", "Source: ")}
          <a href="https://www.metrobus.cdmx.gob.mx/" target="_blank" rel="noreferrer">
            {t("Metrobús de la Ciudad de México", "Mexico City Metrobús")}
          </a>
          {t(". Consulta la ", ". See the ")}
          <Link href="/data/network.json" target="_blank">
            {t("red transformada en JSON", "network transformed into JSON")}
          </Link>
          {t(".", ".")}
        </p>

        <h2>{t("Qué significa «en movimiento»", "What “in motion” means")}</h2>
        <p>
          {t(
            "La demo distribuye ",
            "The demo distributes ",
          )}
          <strong>{t("100 autobuses simulados", "100 simulated buses")}</strong>
          {t(
            " sobre las geometrías reales y calcula una nueva posición cada 12 segundos. El mapa interpola el movimiento y conserva seis posiciones para las estelas. El contador mide la simulación, no es un reporte oficial.",
            " across the real geometries and calculates a new position every 12 seconds. The map interpolates movement and keeps six positions for trails. The counter measures the simulation; it is not an official report.",
          )}
        </p>
        <p>
          {t(
            "El archivo Realtime adjunto se decodificó como una captura guardada de 829 vehículos del 4 de noviembre de 2026, a las 18:52:58 en CDMX. Es un snapshot histórico, no una API activa. El ",
            "The attached Realtime file was decoded as a saved capture of 829 vehicles from November 4, 2026, at 18:52:58 in Mexico City. It is a historical snapshot, not an active API. The ",
          )}
          <Link href="/data/realtime-snapshot.json" target="_blank">
            {t("resumen", "summary")}
          </Link>
          {t(" conserva su procedencia.", " preserves its provenance.")}
        </p>

        <h2>{t("MapLibre + deck.gl + CARTO", "MapLibre + deck.gl + CARTO")}</h2>
        <p>
          {t(
            "CARTO Positron se usa como base en modo claro y CARTO Dark Matter como base en modo oscuro. MapLibre gestiona la cámara; MapLibreOverlay comparte su contexto WebGL2 en modo interleaved. Las capas GPU PathLayer y ScatterplotLayer dibujan rutas y unidades, TripsLayer dibuja estelas temporales e IconLayer dibuja los símbolos de las estaciones del Metrobús. Los timestamps de estelas son relativos para evitar pérdida de precisión.",
            "CARTO Positron is used as the light-theme basemap and CARTO Dark Matter as the dark-theme basemap. MapLibre manages the camera; MapLibreOverlay shares its WebGL2 context in interleaved mode. The GPU PathLayer and ScatterplotLayer render routes and vehicles, TripsLayer renders temporal trails, and IconLayer renders Metrobús station symbols. Trail timestamps are relative to avoid precision loss.",
          )}
        </p>
        <p>
          {t(
            "El mapa permite zoom, perspectiva 3D, hover, selección y seguimiento. Acredita a CARTO y OpenStreetMap. El basemap público no necesita acceso al workspace privado.",
            "The map supports zoom, 3D perspective, hover, selection, and following a vehicle. It credits CARTO and OpenStreetMap. The public basemap does not need access to the private workspace.",
          )}
        </p>

        <h2>{t("Un mapa propio desde CARTO Builder", "A custom map from CARTO Builder")}</h2>
        <p>
          {t(
            "La extensión está preparada para ",
            "The extension is prepared for ",
          )}
          <code>fetchMap</code>
          {t(
            " de una publicación Builder. Se necesita su ID o enlace público, no solo la página del workspace ",
            " from a Builder publication. Its ID or public link is required, not only the workspace page ",
          )}
          <code>clausa.app.carto.com</code>
          {t(
            ". Un ",
            ". A compatible ",
          )}
          <code>style.json</code>
          {t(
            " compatible también permite cambiar la base. Las capas privadas requieren un token de solo lectura y alcance mínimo, nunca credenciales de administración en el navegador.",
            " file can also change the basemap. Private layers require a read-only token with the minimum scope; administrative credentials must never be placed in the browser.",
          )}
        </p>
        <p>
          {t(
            "La alternativa «CARTO Builder Embed» está documentada como iframe de una URL publicada. Es otra vista: no permite inyectar automáticamente nuestras unidades y estelas en el iframe. Para conservar interacción de flota, se prefiere fetchMap.",
            "The “CARTO Builder Embed” alternative is documented as an iframe for a published URL. It is a different view: it cannot automatically inject our vehicles and trails into the iframe. To preserve fleet interaction, fetchMap is preferred.",
          )}
        </p>

        <h2>{t("Conectar una fuente real", "Connecting a real source")}</h2>
        <p>
          {t(
            "La capa TransitProvider está separada de la interfaz. Una futura integración debe validar el feed, vincular IDs Realtime con el GTFS, conservar el timestamp y normalizar los vehículos:",
            "The TransitProvider layer is separate from the interface. A future integration must validate the feed, link Realtime IDs to the GTFS, preserve the timestamp, and normalize vehicles:",
          )}
        </p>
        <pre>{`{
  vehicles: [{
    id, line_id, route_id, latitude, longitude,
    bearing, speed, direction, next_stop, timestamp
  }],
  source: "gtfs-rt",
  timestamp, refresh_seconds, external_api_calls
}`}</pre>
        <p>
          {t(
            "Sin una URL Realtime activa y sus permisos, mantenemos source: simulation. El inspector distingue peticiones internas reales a la demo y llamadas externas, que son cero.",
            "Without an active Realtime URL and its permissions, we keep source: simulation. The inspector distinguishes real internal requests to the demo from external calls, which are zero.",
          )}
        </p>

        <h2>{t("Controles y privacidad", "Controls and privacy")}</h2>
        <p>
          {t(
            "Busca L1–L7 o una estación, selecciona una unidad para seguirla y activa estelas. R abre la vista cinematográfica y Esc sale. El modo grabación no exporta video; está preparado para tu capturador de pantalla.",
            "Search for L1–L7 or a station, select a vehicle to follow it, and enable trails. R opens the cinematic view and Esc exits. Recording mode does not export video; it is prepared for your screen recorder.",
          )}
        </p>
        <p>
          {t("No solicitamos ubicación ni guardamos recorridos. Lee la ", "We do not request location or store journeys. Read the ")}
          <Link href="/privacy">{t("política de privacidad", "privacy policy")}</Link>
          {t(" para conocer qué conserva tu cuenta.", " to learn what data is retained for your account.")}
        </p>
        <Link className="primary-button" href="/register">
          {t("Explorar la red", "Explore the network")} <ArrowUpRight size={17} />
        </Link>
        <footer className="document-footer">
          {t(
            "Proyecto independiente, no afiliado a Metrobús. Base © CARTO · © OpenStreetMap contributors.",
            "Independent project, not affiliated with Metrobús. Basemap © CARTO · © OpenStreetMap contributors.",
          )}
        </footer>
      </article>
    </main>
  );
}

export function PrivacyContent() {
  const { t } = useTranslation();

  return (
    <main className="document-page">
      <PublicHeader />
      <article className="document-body">
        <span className="eyebrow">{t("TU CUENTA / TU PRIVACIDAD", "YOUR ACCOUNT / YOUR PRIVACY")}</span>
        <h1>{t("Muévete con claridad.", "Move with clarity.")}</h1>
        <p className="lead">
          {t(
            "Esta página describe el comportamiento de la versión de demostración de MetroBusCDMX-Live. Última actualización: 5 de noviembre de 2026.",
            "This page describes the behavior of the MetroBusCDMX-Live demonstration version. Last updated: November 5, 2026.",
          )}
        </p>

        <h2>{t("Información de tu cuenta", "Your account information")}</h2>
        <p>
          {t(
            "El registro conserva tu nombre, correo electrónico, fecha de creación y una derivación criptográfica de tu contraseña en la base de datos del proyecto. No se guarda la contraseña en texto plano. Los datos permiten identificarte y validar el acceso a la app.",
            "Registration stores your name, email address, creation date, and a cryptographic derivation of your password in the project's database. The password is not stored in plain text. This data identifies you and validates access to the app.",
          )}
        </p>

        <h2>{t("Sesiones y seguridad", "Sessions and security")}</h2>
        <p>
          {t(
            "La sesión usa una cookie HTTP-only validada por NextAuth, con atributos Secure y SameSite=None para funcionar en la vista previa HTTPS. Cerrar sesión elimina la cookie de aplicación. Se aplican límites de intentos de autenticación; las claves de esos límites no contienen contraseñas.",
            "The session uses an HTTP-only cookie validated by NextAuth, with Secure and SameSite=None attributes so it works in the HTTPS preview. Signing out removes the application cookie. Authentication attempt limits apply; the keys for those limits do not contain passwords.",
          )}
        </p>

        <h2>{t("Preferencias locales", "Local preferences")}</h2>
        <p>
          {t(
            "Las preferencias de idioma y tema, junto con las líneas seleccionadas, el tipo de unidad, estelas y recorridos visibles, se guardan en el localStorage de tu navegador. Puedes eliminarlas borrando los datos de este sitio. No se usan esos valores para rastrear tus trayectos.",
            "Language and theme preferences, along with selected lines, vehicle type, trails, and visible routes, are stored in your browser's localStorage. You can remove them by clearing this site's data. These values are not used to track your journeys.",
          )}
        </p>

        <h2>{t("Ubicación y mapa", "Location and map")}</h2>
        <p>
          {t(
            "La app no solicita tu ubicación y no guarda un historial personal de viajes. El mapa consulta estilos, fuentes y tiles de CARTO, cuyos servidores reciben información técnica de la conexión, como la dirección IP. Las posiciones mostradas son de unidades simuladas, no de personas.",
            "The app does not request your location and does not store a personal travel history. The map requests styles, fonts, and tiles from CARTO, whose servers receive technical connection information such as the IP address. The displayed positions are simulated vehicles, not people.",
          )}
        </p>

        <h2>{t("Plataforma y límites", "Platform and limits")}</h2>
        <p>
          {t(
            "El sitio está alojado en infraestructura Manus. Las métricas técnicas de la plataforma pueden estar habilitadas para funcionamiento y analítica. El proyecto no vende datos, no incorpora publicidad y no envía correos de marketing. La demo no incluye verificación de correo ni recuperación automatizada de contraseña.",
            "The site is hosted on Manus infrastructure. The platform's technical metrics may be enabled for operation and analytics. The project does not sell data, include advertising, or send marketing emails. The demo does not include email verification or automated password recovery.",
          )}
        </p>

        <h2>{t("Conservación y solicitudes", "Retention and requests")}</h2>
        <p>
          {t(
            "Las cuentas permanecen en la base de datos hasta que el responsable del proyecto las elimine. Esta demo todavía no tiene un panel de eliminación de cuenta ni un canal público de soporte. Si necesitas gestionar tus datos, contacta al responsable que te compartió esta aplicación. Antes de una apertura pública de producción, deberá configurarse un contacto de privacidad y una política de conservación definitiva.",
            "Accounts remain in the database until the project owner deletes them. This demo does not yet have an account-deletion panel or a public support channel. If you need to manage your data, contact the person responsible for the application who shared it with you. Before a public production launch, a privacy contact and a definitive retention policy must be configured.",
          )}
        </p>

        <div className="doc-notice">
          <p>
            {t(
              "MetroBusCDMX-Live es una iniciativa independiente y no un servicio oficial de Metrobús de la CDMX.",
              "MetroBusCDMX-Live is an independent initiative and not an official Metrobús service of Mexico City.",
            )}
          </p>
        </div>
        <Link href="/docs">{t("Conocer las fuentes y la simulación", "Learn about the sources and simulation")}</Link>
        <footer className="document-footer">
          {t("La transparencia también es parte del camino.", "Transparency is also part of the journey.")}
        </footer>
      </article>
    </main>
  );
}

export function NotFoundContent() {
  const { t } = useTranslation();

  return (
    <main className="error-page">
      <PublicHeader />
      <span className="error-number">404</span>
      <h1>{t("Esta ruta no existe.", "This route does not exist.")}</h1>
      <p>
        {t(
          "A veces el camino cambia. Vuelve al inicio y encuentra una nueva dirección.",
          "Sometimes the path changes. Go back home and find a new direction.",
        )}
      </p>
      <Link className="primary-button" href="/">
        {t("Volver al inicio", "Back to home")} <ArrowUpRight size={18} />
      </Link>
    </main>
  );
}

export function ErrorContent({ resetAction }: { resetAction: () => void }) {
  const { t } = useTranslation();

  return (
    <main className="error-page">
      <PublicHeader />
      <span className="eyebrow">{t("UN ALTO EN EL CAMINO", "A STOP ALONG THE WAY")}</span>
      <h1>{t("Hagamos otro intento.", "Let's try again.")}</h1>
      <p>
        {t(
          "No pudimos cargar esta parte de la ciudad. Tus datos no se han modificado.",
          "We could not load this part of the city. Your data has not been changed.",
        )}
      </p>
      <div className="error-actions">
        <button className="primary-button" onClick={resetAction}>
          {t("Reintentar", "Try again")} <RotateCcw size={15} />
        </button>
        <Link className="outline-button" href="/">
          {t("Ir al inicio", "Go home")}
        </Link>
      </div>
    </main>
  );
}

export function LoadingContent() {
  const { t } = useTranslation();

  return (
    <div className="map-loading" role="status" aria-live="polite">
      <span className="loading-ring" />
      {t("Preparando tu ruta…", "Preparing your route…")}
    </div>
  );
}
