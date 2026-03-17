import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;
const PAYLOAD_PREFIX = "encv1";

function getKeyFromBase64(key: string): Buffer {
  const normalizedKey = key.trim();
  const decodedKey = Buffer.from(normalizedKey, "base64");

  if (decodedKey.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `[ENV] LOOPIN_PASSWORD_KEY must decode to ${KEY_LENGTH_BYTES} bytes of base64 data`
    );
  }

  return decodedKey;
}

export function encryptPassword(
  plainTextPassword: string,
  base64Key: string
): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const key = getKeyFromBase64(base64Key);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainTextPassword, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    PAYLOAD_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptPassword(
  encryptedPassword: string,
  base64Key: string
): string {
  const [prefix, ivBase64, authTagBase64, encryptedBase64] =
    encryptedPassword.trim().split(":");

  if (!prefix || !ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error(
      "[ENV] LOOPIN_PASSWORD_ENCRYPTED must use the format encv1:<iv>:<tag>:<ciphertext>"
    );
  }

  if (prefix !== PAYLOAD_PREFIX) {
    throw new Error(
      `[ENV] Unsupported encrypted password format '${prefix}'. Expected '${PAYLOAD_PREFIX}'`
    );
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error(
      `[ENV] Encrypted password IV must be ${IV_LENGTH_BYTES} bytes`
    );
  }

  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error(
      `[ENV] Encrypted password auth tag must be ${AUTH_TAG_LENGTH_BYTES} bytes`
    );
  }

  const key = getKeyFromBase64(base64Key);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
