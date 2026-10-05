import { describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret, extractLast4, maskSecret } from "./crypto";

describe("AI Credential Encryption (AES-256-GCM)", () => {
  it("encrypts and decrypts secret correctly", () => {
    const rawKey = "sk-302ai-test-abcdef123456789039AF";
    const encrypted = encryptSecret(rawKey);

    expect(encrypted.encryptedSecret).not.toBe(rawKey);
    expect(encrypted.encryptedSecret).not.toContain(rawKey);
    expect(encrypted.secretLast4).toBe("39AF");

    const decrypted = decryptSecret(encrypted.encryptedSecret);
    expect(decrypted).toBe(rawKey);
  });

  it("produces different ciphertexts for the same plaintext due to random IV", () => {
    const rawKey = "sk-302ai-constant-key";
    const enc1 = encryptSecret(rawKey);
    const enc2 = encryptSecret(rawKey);

    expect(enc1.encryptedSecret).not.toBe(enc2.encryptedSecret);
    expect(decryptSecret(enc1.encryptedSecret)).toBe(rawKey);
    expect(decryptSecret(enc2.encryptedSecret)).toBe(rawKey);
  });

  it("fails decryption if payload is tampered with (GCM authentication check)", () => {
    const rawKey = "sk-302ai-sensitive-token";
    const encrypted = encryptSecret(rawKey);
    const parts = encrypted.encryptedSecret.split(":");

    // Tamper with ciphertext
    const lastTwo = parts[2].slice(-2);
    const tamperedCipher = parts[2].slice(0, -2) + (lastTwo === "aa" ? "bb" : "aa");
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

    expect(() => decryptSecret(tamperedPayload)).toThrow();
  });

  it("extracts last 4 characters and formats mask correctly", () => {
    expect(extractLast4("1234567839af")).toBe("39AF");
    expect(extractLast4("ABCD")).toBe("ABCD");
    expect(maskSecret("39AF")).toBe("••••••••39AF");
  });
});
