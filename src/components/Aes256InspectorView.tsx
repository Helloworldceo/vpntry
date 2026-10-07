import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, CheckCircle2, Copy, Check } from 'lucide-react';
import {
  CryptoSessionMaterial,
  PrivacySettings,
  RelayNode,
} from '../types/vpn';
import {
  encryptPacketWithAes256Gcm,
  formatHexBlocks,
  LiveEncryptionResult,
} from '../utils/cryptoEngine';

interface Aes256InspectorViewProps {
  sessionMaterial: CryptoSessionMaterial | null;
  privacySettings: PrivacySettings;
  selectedExitNode: RelayNode;
  onRotateKey: () => void;
}

const SAMPLE_PAYLOADS = [
  'GET /resolve?name=vault.proton.ch&type=AAAA HTTP/2.0',
  'POST /api/v2/wireguard-handshake-auth {"ephemeral":"curve25519","pfs":true}',
  'SSH-2.0-OpenSSH_9.6p1 Zero-Knowledge Session Frame #4092',
];

export const Aes256InspectorView: React.FC<Aes256InspectorViewProps> = ({
  sessionMaterial,
  privacySettings,
  selectedExitNode,
  onRotateKey,
}) => {
  const [payloadInput, setPayloadInput] = useState(SAMPLE_PAYLOADS[0]);
  const [encryptionResult, setEncryptionResult] = useState<LiveEncryptionResult | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const runLiveEncryption = async (textToEncrypt: string) => {
    if (!sessionMaterial) return;
    setIsEncrypting(true);
    try {
      const result = await encryptPacketWithAes256Gcm(textToEncrypt, sessionMaterial);
      setEncryptionResult(result);
    } finally {
      setIsEncrypting(false);
    }
  };

  useEffect(() => {
    if (sessionMaterial) {
      runLiveEncryption(payloadInput);
    }
  }, [sessionMaterial]);

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1600);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#090C10] p-6 lg:p-8">
      <div className="max-w-[1280px] mx-auto space-y-8">
        {/* Top Section Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1E293B] pb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">
              AES-256-GCM Cryptographic Tunnel Inspector
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-2xl">
              Live Web Crypto API (<code className="font-mono text-[#10B981]">window.crypto.subtle</code>) verification of NIST SP 800-38D 256-bit Galois/Counter Mode authenticated encryption, 96-bit initialization vectors, and SHA-384 integrity digests.
            </p>
          </div>

          <button
            type="button"
            onClick={onRotateKey}
            className="px-4 py-2 text-xs font-medium text-[#090C10] bg-[#10B981] hover:bg-[#059669] rounded-md transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate New 256-Bit Ephemeral Key</span>
          </button>
        </div>

        {/* Cryptographic Specification Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#11161F] border border-[#1E293B] rounded-md p-4">
            <div className="text-xs text-[#94A3B8]">Symmetric Block Cipher</div>
            <div className="text-base font-semibold text-[#F1F5F9] font-mono mt-1">
              {privacySettings.cipherSuite}
            </div>
            <div className="text-xs text-[#64748B] mt-1">
              256-bit key · 14 rounds · 128-bit block
            </div>
          </div>

          <div className="bg-[#11161F] border border-[#1E293B] rounded-md p-4">
            <div className="text-xs text-[#94A3B8]">Forward Secrecy Handshake</div>
            <div className="text-base font-semibold text-[#F1F5F9] font-mono mt-1">
              ECDHE-Curve25519
            </div>
            <div className="text-xs text-[#64748B] mt-1">
              Ephemeral Diffie-Hellman key agreement
            </div>
          </div>

          <div className="bg-[#11161F] border border-[#1E293B] rounded-md p-4">
            <div className="text-xs text-[#94A3B8]">Message Authentication</div>
            <div className="text-base font-semibold text-[#F1F5F9] font-mono mt-1">
              128-Bit GCM Tag + SHA-384
            </div>
            <div className="text-xs text-[#64748B] mt-1">
              AEAD tamper-proof frame verification
            </div>
          </div>

          <div className="bg-[#11161F] border border-[#1E293B] rounded-md p-4">
            <div className="text-xs text-[#94A3B8]">Active Ephemeral Key ID</div>
            <div className="text-base font-semibold text-[#10B981] font-mono tabular-nums mt-1">
              {sessionMaterial?.keyId ?? 'Initializing'}
            </div>
            <div className="text-xs text-[#64748B] font-mono tabular-nums mt-1">
              Rotated {sessionMaterial?.rotationCount ?? 1}x · Exit {selectedExitNode.code}
            </div>
          </div>
        </div>

        {/* Active 256-Bit Session Key Material Breakdown */}
        <div className="bg-[#11161F] border border-[#1E293B] rounded-md p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#F1F5F9]">
                01. Active 256-Bit Session Key Material (RAM-Only Volatile Register)
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Exported directly from browser CSPRNG &amp; Web Crypto API <code className="font-mono">AES-GCM</code> 256-bit key generator
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#10B981]">
              Last Rotated: {sessionMaterial?.rotatedAt}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs tabular-nums">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>256-Bit Raw Session Key (32 Bytes / 64 Hex Chars)</span>
                <button
                  type="button"
                  onClick={() =>
                    sessionMaterial && handleCopy('rawKey', sessionMaterial.rawKeyHex)
                  }
                  className="text-[#10B981] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'rawKey' ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Hex</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 bg-[#090C10] border border-[#1E293B] rounded text-[#F1F5F9] break-all leading-relaxed">
                {sessionMaterial ? formatHexBlocks(sessionMaterial.rawKeyHex, 8) : '—'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>ECDHE Curve25519 Public Point (256-Bit Ephemeral)</span>
                <span className="text-[#64748B]">PFS Verified</span>
              </div>
              <div className="p-3 bg-[#090C10] border border-[#1E293B] rounded text-[#06B6D4] break-all leading-relaxed">
                {sessionMaterial
                  ? formatHexBlocks(sessionMaterial.ecdhePublicKeyHex, 8)
                  : '—'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Session Initialization Vector (96-Bit Nonce / 12 Bytes)</span>
                <span className="text-[#64748B]">NIST SP 800-38D</span>
              </div>
              <div className="p-3 bg-[#090C10] border border-[#1E293B] rounded text-[#F1F5F9] break-all">
                {sessionMaterial ? formatHexBlocks(sessionMaterial.ivHex, 4) : '—'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>SHA-384 Key Authentication Digest</span>
                <span className="text-[#64748B]">HMAC-SHA384</span>
              </div>
              <div className="p-3 bg-[#090C10] border border-[#1E293B] rounded text-[#10B981] break-all">
                {sessionMaterial
                  ? formatHexBlocks(sessionMaterial.sha384Fingerprint, 8)
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Live Packet Encapsulation Sandbox */}
        <div className="bg-[#11161F] border border-[#1E293B] rounded-md p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#F1F5F9]">
                02. Interactive AES-256-GCM Packet Encapsulation Verifier
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Test how plaintext network frames are encapsulated with a fresh 96-bit nonce, encrypted via AES-256-GCM, and verified with a 128-bit authentication tag.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {SAMPLE_PAYLOADS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPayloadInput(sample);
                    runLiveEncryption(sample);
                  }}
                  className="px-2.5 py-1 text-xs font-mono text-[#94A3B8] hover:text-[#F1F5F9] bg-[#090C10] border border-[#1E293B] rounded cursor-pointer"
                >
                  Preset #{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Input Controls */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-[#94A3B8]">
              Plaintext Network Packet Payload (UTF-8):
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={payloadInput}
                onChange={(e) => setPayloadInput(e.target.value)}
                className="flex-1 bg-[#090C10] border border-[#1E293B] rounded px-3.5 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#10B981]"
                placeholder="Enter custom packet payload to encrypt with AES-256-GCM..."
              />
              <button
                type="button"
                onClick={() => runLiveEncryption(payloadInput)}
                disabled={isEncrypting}
                className="px-4 py-2 text-xs font-medium text-[#090C10] bg-[#10B981] hover:bg-[#059669] rounded flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Encrypt &amp; Verify Frame</span>
              </button>
            </div>
          </div>

          {/* Encapsulated Output Display */}
          {encryptionResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono text-xs tabular-nums">
              <div className="p-4 bg-[#090C10] border border-[#1E293B] rounded space-y-2">
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Packet Nonce / IV (96-Bit)</span>
                  <span>12 Bytes</span>
                </div>
                <div className="text-[#06B6D4] break-all leading-relaxed">
                  {encryptionResult.ivHex}
                </div>
                <div className="pt-2 border-t border-[#1E293B] text-[11px] text-[#64748B]">
                  Execution Time: {encryptionResult.executionTimeMs} ms ·{' '}
                  {encryptionResult.plaintextBytes} Bytes
                </div>
              </div>

              <div className="p-4 bg-[#090C10] border border-[#1E293B] rounded space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>AES-256-GCM Ciphertext Payload (Hexadecimal)</span>
                  <span className="text-[#10B981]">Confidentiality Protected</span>
                </div>
                <div className="text-[#F1F5F9] break-all leading-relaxed">
                  {encryptionResult.ciphertextHex}
                </div>
              </div>

              <div className="p-4 bg-[#090C10] border border-[#1E293B] rounded space-y-2">
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>128-Bit GCM Auth Tag (MAC)</span>
                  <span>16 Bytes</span>
                </div>
                <div className="text-[#10B981] break-all leading-relaxed">
                  {encryptionResult.authTagHex}
                </div>
              </div>

              <div className="p-4 bg-[#090C10] border border-[#1E293B] rounded space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Round-Trip Decryption Verification (crypto.subtle.decrypt)</span>
                  <span className="text-[#10B981] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>AEAD Tag Authenticated</span>
                  </span>
                </div>
                <div className="text-[#F1F5F9] break-all">
                  {encryptionResult.decryptedPlaintext}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
