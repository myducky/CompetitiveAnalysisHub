import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

export function buildLocalOpenId(identifier: string) {
  return `local:${normalizeIdentifier(identifier)}`;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) return false;

  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;

  const derivedHash = scryptSync(password, salt, SCRYPT_KEYLEN);
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (derivedHash.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedHash, storedHashBuffer);
}
