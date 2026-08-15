import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { resolveSessionSecret } from "@questorylabs/shared/session";

const PREFIX = "enc:v1:";

function credsKey(): Buffer {
  const secret =
    (process.env.MUSIC_CREDS_KEY || "").trim() || resolveSessionSecret();
  return createHash("sha256").update(secret, "utf8").digest();
}

/** AES-256-GCM. Plaintext (legacy / empty) is returned unchanged on decrypt. */
export function encryptSecret(plain: string): string {
  if (!plain || plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credsKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored;
  const rest = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = rest.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    credsKey(),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
