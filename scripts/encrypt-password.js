const { createCipheriv, randomBytes } = require("crypto");

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const KEY_LENGTH_BYTES = 32;
const PAYLOAD_PREFIX = "encv1";

function getKeyFromBase64(key) {
  const decodedKey = Buffer.from(String(key).trim(), "base64");

  if (decodedKey.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `LOOPIN_PASSWORD_KEY must decode to ${KEY_LENGTH_BYTES} bytes of base64 data`
    );
  }

  return decodedKey;
}

function encryptPassword(plainTextPassword, base64Key) {
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

function printUsage() {
  console.log("Usage:");
  console.log("  node scripts/encrypt-password.js <plain-password>");
  console.log(
    "  node scripts/encrypt-password.js --key <base64-key> <plain-password>"
  );
  console.log(
    "  node scripts/encrypt-password.js --generate-key <plain-password>"
  );
}

const args = process.argv.slice(2);

if (args.length === 0) {
  printUsage();
  process.exit(1);
}

let key = process.env.LOOPIN_PASSWORD_KEY?.trim();
let password = "";
let shouldGenerateKey = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === "--generate-key") {
    shouldGenerateKey = true;
    continue;
  }

  if (arg === "--key") {
    key = args[index + 1];
    index += 1;
    continue;
  }

  password = arg;
}

if (!password) {
  printUsage();
  process.exit(1);
}

if (shouldGenerateKey || !key) {
  key = randomBytes(32).toString("base64");
}

try {
  const encryptedPassword = encryptPassword(password, key);

  console.log("");
  console.log("Use these values in your environment:");
  console.log(`LOOPIN_PASSWORD_ENCRYPTED=${encryptedPassword}`);
  console.log(`LOOPIN_PASSWORD_KEY=${key}`);
  console.log("");
  console.log(
    "Security note: keep LOOPIN_PASSWORD_KEY outside the same shared .env file whenever possible."
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
