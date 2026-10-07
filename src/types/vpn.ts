export type ConnectionState = 'disconnected' | 'handshaking' | 'connected' | 'killswitch';

export type ActiveTab = 'network' | 'inspector' | 'privacy';

export type CipherSuite = 'AES-256-GCM' | 'AES-256-CBC-SHA512';

export type TunnelProtocol = 'OpenVPN-UDP-1194' | 'WireGuard-AES256-Hybrid' | 'IKEv2-IPsec-GCM';

export interface RelayNode {
  id: string;
  code: string;
  city: string;
  country: string;
  countryCode: string;
  region: 'Europe' | 'Americas' | 'Asia-Pacific';
  coordinates: {
    /** Normalized SVG projection coordinates (0-1000 x, 0-500 y) */
    x: number;
    y: number;
    lat: string;
    lon: string;
  };
  exitIp: string;
  ipv6Prefix: string;
  baseLatencyMs: number;
  loadPercent: number;
  ramOnlyDiskless: boolean;
  multiHopCapable: boolean;
  ownedCore: boolean;
  bandwidthGbps: number;
  jurisdictionNote: string;
}

export interface CryptoSessionMaterial {
  keyId: string;
  rawKeyHex: string;
  ivHex: string;
  authTagHex: string;
  sha384Fingerprint: string;
  ecdhePublicKeyHex: string;
  rotatedAt: string;
  rotationCount: number;
  keyObject?: CryptoKey;
}

export interface EncryptedPacketResult {
  plaintext: string;
  plaintextBytes: number;
  ivHex: string;
  ciphertextHex: string;
  authTagHex: string;
  sha384HmacHex: string;
  executionTimeMs: number;
  timestamp: string;
  verifiedDecryption?: string;
}

export interface PrivacySettings {
  cipherSuite: CipherSuite;
  protocol: TunnelProtocol;
  multiHop: boolean;
  dnsOverHttps: boolean;
  ipv6LeakProtection: boolean;
  webrtcBlock: boolean;
  stealthObfs4: boolean;
  ramOnlyStrict: boolean;
  autoKeyRotationMinutes: number;
}

export interface TelemetryPoint {
  timestamp: number;
  downMbps: number;
  upMbps: number;
  encryptedPackets: number;
}

export interface AuditCheckItem {
  id: string;
  title: string;
  mechanism: string;
  status: 'idle' | 'running' | 'passed' | 'warning';
  detail: string;
  verifiedValue: string;
}
