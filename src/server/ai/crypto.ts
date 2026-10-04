import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

/**
 * Derives a deterministic 32-byte encryption key from the environment.
 */
function getDerivedKey(): Buffer {
  const seed =
    process.env.ENCRYPTION_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    (process.env.NODE_ENV === "test"
      ? "glab-test-only-encryption-key-min-32-chars"
      : "");

  if (!seed) {
    throw new Error(
      "Missing ENCRYPTION_KEY or AUTH_SECRET required for AI credential encryption."
    );
  }

  return crypto.createHash("sha256").update(seed).digest();
}

/**
 * Computes safe last 4 characters for display purposes.
 */
export function extractLast4(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.length <= 4) {
    return trimmed.toUpperCase();
  }
  return trimmed.slice(-4).toUpperCase();
}

/**
 * Masks a secret using its last 4 characters.
 */
export function maskSecret(last4: string): string {
  return `••••••••${last4}`;
}

export interface EncryptedResult {
  encryptedSecret: string;
  secretLast4: string;
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 * Never stores or returns plaintext.
 * Returns `${ivHex}:${authTagHex}:${cipherHex}`.
 */
export function encryptSecret(plainText: string): EncryptedResult {
  if (!plainText || typeof plainText !== "string") {
    throw new Error("Plaintext secret is required for encryption.");
  }

  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedSecret: `${iv.toString("hex")}:${authTag}:${encrypted}`,
    secretLast4: extractLast4(plainText),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 * Verifies authenticity tag; throws if tampered or invalid.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload || typeof encryptedPayload !== "string") {
    throw new Error("Encrypted payload is required for decryption.");
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted payload format. Expected iv:authTag:ciphertext.");
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
