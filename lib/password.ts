import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const OPTIONS: ScryptOptions = { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

function scryptAsync(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH, OPTIONS);
  return ["scrypt", OPTIONS.N, OPTIONS.r, OPTIONS.p, salt.toString("base64url"), derivedKey.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, n, r, p, encodedSalt, encodedDigest] = encodedHash.split("$");
  if (algorithm !== "scrypt" || n !== String(OPTIONS.N) || r !== String(OPTIONS.r) || p !== String(OPTIONS.p) || !encodedSalt || !encodedDigest) {
    return false;
  }

  try {
    const salt = Buffer.from(encodedSalt, "base64url");
    const expectedDigest = Buffer.from(encodedDigest, "base64url");
    if (salt.length !== SALT_LENGTH || expectedDigest.length !== KEY_LENGTH) return false;
    const actualDigest = await scryptAsync(password, salt, KEY_LENGTH, OPTIONS);
    return timingSafeEqual(actualDigest, expectedDigest);
  } catch {
    return false;
  }
}
