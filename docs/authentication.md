# Autenticación de MetroBusCDMX-Live

La autenticación usa NextAuth 4 con `CredentialsProvider`, sesiones JWT y usuarios persistentes en la tabla `metrobus_users` de MySQL. Las contraseñas se almacenan únicamente como hashes `scrypt` con salt aleatorio; no se guardan tokens en `localStorage`.

## Variables

- `DATABASE_URL`: DSN protegido de MySQL. `lib/db.ts` y `scripts/migrate.mjs` leen su host, credenciales, base y parámetros TLS desde el DSN.
- `NEXTAUTH_SECRET`: secreto protegido requerido por NextAuth para firmar la sesión JWT.
- `AUTH_COOKIE_SECURE`: se asume `true` cuando se omite. Solo puede definirse como `false` para ejecutar HTTP en `localhost`; nunca se debe usar así en Preview HTTPS ni producción.

En Preview HTTPS la cookie de sesión se llama `metrobus_session` y se emite como `HttpOnly; Secure; SameSite=None`. Las cookies CSRF y callback de NextAuth conservan sus nombres compatibles y reciben los mismos atributos de contexto embebido. La configuración no depende de `NODE_ENV` ni del esquema interno que vea el servidor detrás del proxy.

## Migración

Con `DATABASE_URL` disponible, ejecutar `pnpm db:migrate`. El script solo crea de forma aditiva e idempotente `metrobus_users` y `metrobus_auth_rate_limits`; no inserta usuarios de prueba ni elimina datos existentes.

## Compatibilidad de Preview y checks

El formulario llama a los endpoints oficiales NextAuth de CSRF y callback Credentials con json=true, valida la sesión y navega con ruta relativa /app. Esto evita que el helper estándar signIn de NextAuth intente new URL('/app') sin origen. El handler normaliza Location y URLs JSON a rutas internas relativas; no se exponen direcciones del contenedor. La sesión sigue siendo cifrada/validada por NextAuth, no un token inventado.

Registro suma una cota global de 50 intentos por minuto al límite por correo e IP. X-Forwarded-For debe ser saneado por el proxy de producción; no se considera identidad autenticada. Una prueba aislada sin DB comprueba que el sexto intento supera el límite. Las migraciones no generan usuarios y los checks de endpoints solo usan entradas inválidas, por lo que no se crean cuentas de prueba en la DB compartida.
