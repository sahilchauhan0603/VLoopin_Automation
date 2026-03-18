import * as dotenv from "dotenv";
import * as path from "path";
import { decryptPassword } from "../utils/password-crypto";

// Silence dotenvx output logs in the terminal
process.env.DOTENV_QUIET = "true";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[ENV] Missing required variable: ${name}`);
  }
  return value;
}

function getRequiredNumberEnv(name: string): number {
  const value = Number.parseInt(getRequiredEnv(name), 10);
  if (Number.isNaN(value)) {
    throw new Error(`[ENV] ${name} must be a valid number`);
  }
  return value;
}

function getNumberEnv(name: string, defaultValue: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return defaultValue;
  }

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value < 0) {
    throw new Error(`[ENV] ${name} must be a valid non-negative number`);
  }

  return value;
}

function getBooleanEnv(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) {
    return defaultValue;
  }

  return ["1", "true", "yes", "y", "on"].includes(raw);
}

function getLoopinPassword(): string {
  const plainPassword = process.env.LOOPIN_PASSWORD?.trim();
  if (plainPassword) {
    return plainPassword;
  }

  const encryptedPassword = process.env.LOOPIN_PASSWORD_ENCRYPTED?.trim();
  if (!encryptedPassword) {
    throw new Error(
      "[ENV] Missing required variable: LOOPIN_PASSWORD or LOOPIN_PASSWORD_ENCRYPTED"
    );
  }

  const encryptionKey = process.env.LOOPIN_PASSWORD_KEY?.trim();
  if (!encryptionKey) {
    throw new Error(
      "[ENV] LOOPIN_PASSWORD_KEY is required when LOOPIN_PASSWORD_ENCRYPTED is set"
    );
  }

  try {
    return decryptPassword(encryptedPassword, encryptionKey);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown password decryption error";
    throw new Error(`[ENV] Failed to decrypt LOOPIN_PASSWORD_ENCRYPTED: ${message}`);
  }
}

export const ENV = {
  BASE_URL: getRequiredEnv("LOOPIN_BASE_URL"),
  USERNAME: getRequiredEnv("LOOPIN_USERNAME"),
  PASSWORD: getLoopinPassword(),
  TOTP_SECRET: getRequiredEnv("LOOPIN_TOTP_SECRET"),
  STORAGE_STATE_PATH: path.resolve(__dirname, "../../.auth/storage-state.json"),
  TIMEOUT: getRequiredNumberEnv("LOOPIN_TIMEOUT"),
  RETRIES: getNumberEnv("LOOPIN_RETRIES", process.env.CI ? 2 : 1),
  WORKERS: getNumberEnv("LOOPIN_WORKERS", 1),
  FORCE_FRESH_LOGIN: getBooleanEnv("LOOPIN_FORCE_FRESH_LOGIN", false),

  /** Persistent Edge profile directory for Conditional Access compliance */
  EDGE_PROFILE_DIR: path.resolve(
    process.env.EDGE_PROFILE_DIR ||
      path.join(__dirname, "../../.edge-profile")
  ),

  get hasCredentials(): boolean {
    return Boolean(this.USERNAME && this.PASSWORD);
  },
  get hasTOTP(): boolean {
    return Boolean(this.TOTP_SECRET);
  },
} as const;
