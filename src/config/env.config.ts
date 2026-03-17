import * as dotenv from "dotenv";
import * as path from "path";

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

function getBooleanEnv(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) {
    return defaultValue;
  }

  return ["1", "true", "yes", "y", "on"].includes(raw);
}

export const ENV = {
  BASE_URL: getRequiredEnv("LOOPIN_BASE_URL"),
  USERNAME: getRequiredEnv("LOOPIN_USERNAME"),
  PASSWORD: getRequiredEnv("LOOPIN_PASSWORD"),
  TOTP_SECRET: getRequiredEnv("LOOPIN_TOTP_SECRET"),
  STORAGE_STATE_PATH: path.resolve(__dirname, "../../.auth/storage-state.json"),
  TIMEOUT: getRequiredNumberEnv("LOOPIN_TIMEOUT"),
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
