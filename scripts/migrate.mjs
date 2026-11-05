import mysql from "mysql2/promise";

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sslFromDsn(url) {
  const raw = url.searchParams.get("ssl") ?? url.searchParams.get("tls");
  const mode = (url.searchParams.get("ssl-mode") ?? url.searchParams.get("sslmode") ?? "").toLowerCase();

  if (raw && ["false", "0", "off", "disabled", "disable"].includes(raw.toLowerCase())) return undefined;
  if (raw) {
    if (["true", "1", "on", "required"].includes(raw.toLowerCase())) return { rejectUnauthorized: true };
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Fall through to the managed TLS default.
    }
    return { rejectUnauthorized: true };
  }

  if (["required", "verify-ca", "verify-full"].includes(mode)) {
    return { rejectUnauthorized: mode === "verify-full" };
  }

  const ca = url.searchParams.get("ssl-ca") ?? url.searchParams.get("ssl_ca");
  return ca ? { ca: decode(ca), rejectUnauthorized: true } : undefined;
}

function connectionConfig(dsn) {
  const url = new URL(dsn);
  if (url.protocol !== "mysql:" && url.protocol !== "mysql2:") {
    throw new Error("DATABASE_URL debe usar el protocolo mysql://.");
  }

  const config = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decode(url.username),
    password: decode(url.password),
    database: decode(url.pathname.replace(/^\//, "")),
    multipleStatements: false,
  };
  const ssl = sslFromDsn(url);
  if (ssl) config.ssl = ssl;
  return config;
}

const dsn = process.env.DATABASE_URL;
if (!dsn) throw new Error("DATABASE_URL no está configurada.");

const connection = await mysql.createConnection(connectionConfig(dsn));
try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS metrobus_users (
      id CHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(70) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS metrobus_auth_rate_limits (
      bucket_key VARCHAR(191) NOT NULL PRIMARY KEY,
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      window_started_at DATETIME(6) NOT NULL,
      updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log("Migración aditiva confirmada: metrobus_users y metrobus_auth_rate_limits.");
} finally {
  await connection.end();
}
