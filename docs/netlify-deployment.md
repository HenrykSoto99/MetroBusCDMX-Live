# Revisión de Netlify — MetroBusCDMX-Live

El código es compatible en arquitectura con Next.js 15 sobre el adaptador OpenNext de Netlify: App Router, renderizado del servidor y Route Handlers están soportados. No debe publicarse como HTML estático ni subirse solamente la carpeta `public`. El registro y login requieren funciones Node y una base de datos externa. Un build correcto no demuestra todavía conectividad con esa base ni login en el dominio final. [1]

El repositorio privado confirmado es [HenrykSoto99/MetroBusCDMX-Live](https://github.com/HenrykSoto99/MetroBusCDMX-Live). Se transfirió `main` con su historial y se verificó la conexión administrada. La consulta de proyectos Netlify con nombre parcial `metrobus` devolvió una lista vacía en la cuenta conectada. Esto no prueba disponibilidad global de un nombre `netlify.app`. No se creó ni publicó un sitio en esta revisión.

## Configuración de build preparada

`netlify.toml` utiliza `pnpm build` y publica `.next`. Node se fija a la rama 22 y `package.json` conserva `packageManager: pnpm@11.25.0`. Netlify obtiene esa versión mediante Corepack y el lockfile permanece en el repositorio. Los flags `--shamefully-hoist --frozen-lockfile` evitan el problema de resolución documentado para pnpm y Next.js y evitan cambios inesperados del lockfile. [2] [3]

El adaptador OpenNext se instala automáticamente; no fijamos una versión antigua del plugin. `next.config.ts` omite `output: standalone` exclusivamente cuando `NETLIFY=true`, para dejar al adaptador gestionar sus artefactos. En Manus y en el Dockerfile se conserva standalone. Netlify no usa ese Dockerfile. No añadimos una regla SPA `/* → /index.html`, ya que interceptaría páginas privadas y APIs. [1]

## Requisitos pendientes para el login

Se necesita una instancia MySQL compatible accesible desde Netlify, con las tablas `metrobus_users` y `metrobus_auth_rate_limits`. Netlify no crea esas tablas al construir Next.js. La base actual del entorno Manus y sus credenciales no se transfirieron al hosting externo; no se debe asumir que son portables o accesibles desde Netlify.

Configurar en el panel de variables de Netlify, con alcance **Functions y Builds**, `DATABASE_URL`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL`. Los dos primeros contienen secretos; no incluirlos en `netlify.toml`, Git ni variables `NEXT_PUBLIC_*`. `NEXTAUTH_URL` debe ser el origen HTTPS definitivo, por ejemplo `https://nombre-elegido.netlify.app`, sin utilizar la URL de Preview de Manus. Para previews de ramas se necesitan valores coherentes con ese contexto y, preferiblemente, una base separada. Los cambios de variables requieren un nuevo build y deploy. [4]

`AUTH_COOKIE_SECURE` debe omitirse o ser `true` en HTTPS. La aplicación conserva cookies HTTP-only, `SameSite=None; Secure`, CSRF y sesiones JWT. En localhost HTTP puede usarse `false`; no hacerlo en Netlify. Las redirecciones de NextAuth se normalizan a rutas relativas, y las rutas de auth y registro están explícitamente en runtime Node.

La migración se ejecuta una vez, fuera del build, sobre la base elegida y desde un entorno autorizado:

```bash
# .env.local no se sube al repositorio.
node --env-file=.env.local scripts/migrate.mjs
```

Es aditiva e idempotente. No se ejecutó sobre una base Netlify ni se exportaron cuentas existentes. Si se desea trasladar cuentas del entorno anterior, requiere una operación separada sobre los datos; crear el repositorio no las copia.

## Conectividad, TLS y escala

El proveedor MySQL debe permitir conexiones desde las funciones de Netlify o proporcionar un proxy adecuado. El driver permite `?ssl-mode=verify-full`; utilizar ese modo o un certificado CA verificable según el proveedor. Se detectó que ciertos modos permisivos de TLS no tienen idéntica semántica entre `lib/db.ts` y `scripts/migrate.mjs`, por lo que no se recomiendan como configuración externa de producción. No se modificó la conexión administrada existente ni se desactivó la validación de certificados para facilitar el deploy.

El pool actual permite hasta 10 conexiones por instancia. Varias funciones concurrentes pueden multiplicar ese número; antes de tráfico importante conviene reducir el límite o utilizar un proxy del proveedor. Los límites de intentos de auth se almacenan en MySQL y no dependen de la memoria efímera de una función. El snapshot de los 100 buses sí se reconstruye en memoria, pero es determinista y está claramente identificado como simulación.

`/api/health` es liveness: confirma que la función responde, no la presencia de tablas ni credenciales correctas. La verificación del login debe realizarse posteriormente en el dominio final con una cuenta autorizada.

## Mapa y archivos estáticos

Las fuentes, datos y la marca están en `public`. El worker ESM de MapLibre se genera con hash dentro de `/_next/static/media`; el adaptador debe conservar esos assets. El mapa y deck.gl se cargan en el navegador y no requieren WebGL en las funciones. CARTO Dark Matter es público y no usa una clave privada de la cuenta CARTO. Un estilo personalizado debe permitir CORS para tiles, sprites y glyphs. [1]

## Alcance de esta revisión

La auditoría de código comprobó persistencia, cookies, runtimes, dependencias y assets sin escrituras a la base. Se preparó la configuración de build para Netlify. No se autorizaron ni ejecutaron una publicación, una migración externa o un cambio de DNS. El resultado del empaquetado local y los checks finales se registra al completarse.

## References

[1]: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/ "Next.js on Netlify — OpenNext support and limitations"
[2]: https://opennext.js.org/netlify "OpenNext Netlify — build settings and pnpm support"
[3]: https://docs.netlify.com/build/configure-builds/manage-dependencies/ "Netlify dependency management — Node and packageManager"
[4]: https://docs.netlify.com/build/environment-variables/overview/ "Netlify environment variables — scopes and contexts"

### Resultado de build local

La comprobación ejecutó Netlify CLI27.16.2 en modo `build --offline`, sin `DATABASE_URL`, `NEXTAUTH_SECRET` ni credenciales de plataforma en el proceso. NetlifyBuild37.7.5 detectó Next.jsRuntime5.16.6, compiló Next15.5.29 y empaquetó `___netlify-server-handler.mjs` como función interna. Terminó con código0. También pasaron TypeScript, los11tests y la lectura delTOML. No apareció un conflicto de compilación o empaquetado. Quedan pendientes los valores seguros, MySQL/TLS/tablas y la prueba de acceso en un deploy real; no se realizó publicación.

El ajuste posterior añade un atlas MB de estaciones y preferencias ES/EN/light/dark en el navegador. No añade servidores persistentes ni servicios incompatibles con Functions. Los basemaps públicos oscuros/claros se solicitan directamente a CARTO; la aplicación no necesita una credencial privada para ellos. Las preferencias no cambian los requisitos de NextAuth ni de MySQL. El cierre de sesión navega a la landing `/`.
