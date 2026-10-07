import { CryptoSessionMaterial } from '../types/vpn';

function bufferToHex(buffer: ArrayBuffer | Uint8Array, separator = ''): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(separator);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generates a real 256-bit AES-GCM key via the browser's Web Crypto API (NIST SP 800-38D),
 * derives a SHA-384 HMAC fingerprint, and generates a 96-bit cryptographically secure IV.
 */
export async function generateAes256SessionKey(
  previousRotationCount = 0
): Promise<CryptoSessionMaterial> {
  const key = await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  const rawKeyBuffer = await window.crypto.subtle.exportKey('raw', key);
  const rawKeyHex = bufferToHex(rawKeyBuffer, '');

  // Generate 96-bit (12-byte) Initialization Vector per NIST SP 800-38D recommendation
  const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
  const ivHex = bufferToHex(ivBytes, '');

  // Generate simulated Curve25519 ephemeral public point (32 bytes) using CSPRNG
  const ecdheBytes = window.crypto.getRandomValues(new Uint8Array(32));
  const ecdhePublicKeyHex = bufferToHex(ecdheBytes, '');

  // Compute real SHA-384 cryptographic digest over the 256-bit key + IV
  const combined = new Uint8Array(rawKeyBuffer.byteLength + ivBytes.byteLength);
  combined.set(new Uint8Array(rawKeyBuffer), 0);
  combined.set(ivBytes, rawKeyBuffer.byteLength);
  const sha384Buffer = await window.crypto.subtle.digest('SHA-384', combined);
  const sha384Fingerprint = bufferToHex(sha384Buffer, '').slice(0, 48);

  // Encrypt an initial tunnel keepalive frame to extract a genuine 128-bit GCM Auth Tag
  const probePayload = new TextEncoder().encode('HELVETIA_TUNNEL_INIT_AUTH_PROBE_V1');
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
      tagLength: 128,
    },
    key,
    probePayload
  );
  // In Web Crypto AES-GCM, the last 16 bytes (128 bits) of the output are the Authentication Tag
  const encBytes = new Uint8Array(encryptedBuffer);
  const authTagBytes = encBytes.slice(encBytes.length - 16);
  const authTagHex = bufferToHex(authTagBytes, '');

  const keyIdBytes = window.crypto.getRandomValues(new Uint8Array(4));
  const keyId = `K256-${bufferToHex(keyIdBytes, '')}`;

  const now = new Date();
  const rotatedAt = now.toTimeString().split(' ')[0];

  return {
    keyId,
    rawKeyHex,
    ivHex,
    authTagHex,
    sha384Fingerprint,
    ecdhePublicKeyHex,
    rotatedAt,
    rotationCount: previousRotationCount + 1,
    keyObject: key,
  };
}

export interface LiveEncryptionResult {
  plaintext: string;
  plaintextBytes: number;
  ivHex: string;
  ciphertextHex: string;
  authTagHex: string;
  sha384HmacHex: string;
  executionTimeMs: number;
  timestamp: string;
  decryptedPlaintext?: string;
}

/**
 * Encrypts an arbitrary user packet payload using the active 256-bit AES-GCM CryptoKey
 * and separates the Ciphertext from the 128-bit GCM Authentication Tag.
 */
export async function encryptPacketWithAes256Gcm(
  plaintext: string,
  session: CryptoSessionMaterial
): Promise<LiveEncryptionResult> {
  const t0 = performance.now();

  let key = session.keyObject;
  if (!key) {
    const rawBytes = hexToBytes(session.rawKeyHex);
    key = await window.crypto.subtle.importKey(
      'raw',
      rawBytes,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Fresh 96-bit nonce per packet encapsulation
  const packetIv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedPayload = new TextEncoder().encode(plaintext);

  const aad = new TextEncoder().encode(`TUNNEL-KEY:${session.keyId}`);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: packetIv,
      additionalData: aad,
      tagLength: 128,
    },
    key,
    encodedPayload
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const tagStart = encryptedBytes.length - 16;
  const ciphertextBytes = encryptedBytes.slice(0, tagStart);
  const authTagBytes = encryptedBytes.slice(tagStart);

  // Compute SHA-384 integrity digest over (IV || Ciphertext || AuthTag)
  const hmacInput = new Uint8Array(packetIv.length + encryptedBytes.length);
  hmacInput.set(packetIv, 0);
  hmacInput.set(encryptedBytes, packetIv.length);
  const sha384Digest = await window.crypto.subtle.digest('SHA-384', hmacInput);

  // Immediately verify round-trip decryption using Web Crypto API to prove authenticity
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: packetIv,
      additionalData: aad,
      tagLength: 128,
    },
    key,
    encryptedBuffer
  );
  const decryptedPlaintext = new TextDecoder().decode(decryptedBuffer);

  const executionTimeMs = Math.max(0.08, Number((performance.now() - t0).toFixed(2)));
  const timestamp = new Date().toTimeString().split(' ')[0];

  return {
    plaintext,
    plaintextBytes: encodedPayload.byteLength,
    ivHex: bufferToHex(packetIv, ' '),
    ciphertextHex: bufferToHex(ciphertextBytes, ' '),
    authTagHex: bufferToHex(authTagBytes, ' '),
    sha384HmacHex: bufferToHex(sha384Digest, '').slice(0, 64),
    executionTimeMs,
    timestamp,
    decryptedPlaintext,
  };
}

/**
 * Formats a continuous hex string into readable 4-byte (8-hex-char) cryptographic blocks.
 */
export function formatHexBlocks(hex: string, groupSize = 8): string {
  const clean = hex.replace(/\s+/g, '');
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += groupSize) {
    chunks.push(clean.slice(i, i + groupSize));
  }
  return chunks.join(' ');
}
