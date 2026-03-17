import * as speakeasy from "speakeasy";
import { ENV } from "../config/env.config";

/**
 * Generates a 6-digit TOTP code using the Speakeasy library.
 * Returns null when no secret is available (MFA step will be skipped).
 */
export function generateTOTP(secret?: string): string | null {
  const totpSecret = secret || ENV.TOTP_SECRET;

  if (!totpSecret) {
    console.log("[TOTP] No secret configured – MFA step will be skipped");
    return null;
  }

  const token = speakeasy.totp({
    secret: totpSecret,
    encoding: "base32",
    algorithm: "sha1",
    digits: 6,
    step: 30,
  });

  console.log("[TOTP] Code generated successfully");
  return token;
}
