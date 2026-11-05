import mysql, { type Pool, type PoolOptions } from "mysql2/promise";

let connectionPool: Pool | undefined;

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sslFromDsn(url: URL): PoolOptions["ssl"] | undefined {
  const raw = url.searchParams.get("ssl") ?? url.searchParams.get("tls");
  const mode = (url.searchParams.get("ssl-mode") ?? url.searchParams.get("sslmode") ?? "").toLowerCase();

  if (raw && ["false", "0", "off", "disabled", "disable"].includes(raw.toLowerCase())) {
    return undefined;
  }

  if (raw) {
    if (["true", "1", "on", "required", "verify-ca", "verify-full"].includes(raw.toLowerCase())) {
      return { rejectUnauthorized: raw.toLowerCase() === "verify-full" };
    }

    try {
      const parsed = JSON.parse(raw) as PoolOptions["ssl"];
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Treat an unrecognised ssl value as the managed TLS default below.
    }

    return { rejectUnauthorized: true };
  }

  if (["required", "verify-ca", "verify-full"].includes(mode)) {
    return { rejectUnauthorized: mode === "verify-full" };
  }

  const ca = url.searchParams.get("ssl-ca") ?? url.searchParams.get("ssl_ca");
  if (ca) return { ca: decode(ca), rejectUnauthorized: true };

  return undefined;
}

function createPoolFromDsn(dsn: string): Pool {
  const url = new URL(dsn);
  if (url.protocol !== "mysql:" && url.protocol !== "mysql2:") {
    throw new Error("DATABASE_URL debe usar el protocolo mysql://.");
  }

  const database = decode(url.pathname.replace(/^\//, ""));
  if (!url.hostname || !database) {
    throw new Error("DATABASE_URL no contiene host y base de datos válidos.");
  }

  const config: PoolOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decode(url.username),
    password: decode(url.password),
    database,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60_000,
    queueLimit: 0,
    enableKeepAlive: true,
  };

  const ssl = sslFromDsn(url);
  if (ssl) config.ssl = ssl;

  return mysql.createPool(config);
}

export function getPool(): Pool {
  if (!connectionPool) {
    const dsn = process.env.DATABASE_URL;
    if (!dsn) throw new Error("DATABASE_URL no está configurada.");
    connectionPool = createPoolFromDsn(dsn);
  }

  return connectionPool;
}

export const getDb = getPool;

export async function closePool(): Promise<void> {
  if (!connectionPool) return;
  const activePool = connectionPool;
  connectionPool = undefined;
  await activePool.end();
}
