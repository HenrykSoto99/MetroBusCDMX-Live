import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

type RateLimitRow = RowDataPacket & { attempts: number };

function bucketId(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export async function consumeRateLimit(
  rawKey: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
): Promise<boolean> {
  const bucketKey = bucketId(rawKey);
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `
        INSERT INTO metrobus_auth_rate_limits
          (bucket_key, attempts, window_started_at, updated_at)
        VALUES (?, 1, ?, UTC_TIMESTAMP(6))
        ON DUPLICATE KEY UPDATE
          attempts = IF(window_started_at < ?, 1, LEAST(attempts + 1, ?)),
          window_started_at = IF(window_started_at < ?, ?, window_started_at),
          updated_at = UTC_TIMESTAMP(6)
      `,
      [bucketKey, now, cutoff, limit + 1, cutoff, now],
    );

    const [rows] = await connection.execute<RateLimitRow[]>(
      "SELECT attempts FROM metrobus_auth_rate_limits WHERE bucket_key = ? LIMIT 1",
      [bucketKey],
    );
    await connection.commit();
    return (rows[0]?.attempts ?? limit + 1) <= limit;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
