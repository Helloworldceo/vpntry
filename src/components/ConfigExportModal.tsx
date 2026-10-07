import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Download,
  Check,
  QrCode,
  FileCode2,
  Globe,
  RefreshCw,
  Zap,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  CryptoSessionMaterial,
  PrivacySettings,
  RelayNode,
} from '../types/vpn';

interface LivePublicRelay {
  id: string;
  hostname: string;
  ip: string;
  pingMs: number;
  speedMbps: number;
  countryLong: string;
  countryShort: string;
  sessions: number;
  uptimeHours: number;
  ovpnConfig: string;
}

interface FleetServerNode {
  id: string;
  label: string;
  ip: string;
  reachable?: boolean;
  latencyMs?: number;
}

interface ConfigExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedExitNode: RelayNode;
  selectedEntryNode: RelayNode;
  privacySettings: PrivacySettings;
  sessionMaterial: CryptoSessionMaterial | null;
}

type ModalSection = 'quick-setup' | 'live-relays' | 'ovpn-config';

const DEFAULT_FLEET_SERVERS: FleetServerNode[] = [
  {
    id: 'node-us-iowa',
    label: 'US-Iowa (Active)',
    ip: '34.66.181.240',
  },
];

const VALID_X509_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDWTCCAkGgAwIBAgIUb/4kVDcR2mcaS1ODvk7O5AB4e0UwDQYJKoZIhvcNAQEL
BQAwPDELMAkGA1UEBhMCQ0gxFDASBgNVBAoMC0hlbHZldGlhVlBOMRcwFQYDVQQD
DA5IZWx2ZXRpYVJvb3RDQTAeFw0yNjEwMDYwNTU0MTlaFw0zNjEwMDMwNTU0MTla
MDwxCzAJBgNVBAYTAkNIMRQwEgYDVQQKDAtIZWx2ZXRpYVZQTjEXMBUGA1UEAwwO
SGVsdmV0aWFSb290Q0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCm
hMQ+jxjdjPG2RVNQWKXg7V978eX8Sz6CGXEIijNCXSLazXfRIu/yFZYTVZzdk4iT
AIqQtlPejPp5xTk5cr7vjkncowjzpKSatSI1YhpnDvob8lxloV36dO5Rd4qC56L5
6MRTQcp90liAC6VVW53YLs3fwFN0mUfYp0z0PHRksoTe4bOjpl7ls02wKG5gL0FE
UsvjdPS95nv5zRlgrxB0qiq5VY9WDrj4dVClfgGKIS56EmsiPZicXjz9wmF29XDE
nL6bVICc9T2GYUQp6uiI/xI3rFQ8kDVPU598sM0uxRt87yOea0GGf8z1P1xh9J0O
j8UnIHm25BqX5N3eo7HBAgMBAAGjUzBRMB0GA1UdDgQWBBRpN6WgOhljr4yttGwY
sl4ZIVlXODAfBgNVHSMEGDAWgBRpN6WgOhljr4yttGwYsl4ZIVlXODAPBgNVHRMB
Af8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBCCuzsVW1f8UlybsZCyxLix1LM
25uRf4J9zjcYb0/5qlyLj40tyGybTovaA6yVbDGRMpizod54BfaSwWag6FoqTp6i
WEN0L8D4NtVnkGHJxjaliAZiwjfXZsxNVqEU7ZoMSHGfDhmNhWwoMm+r1Ejs2mtv
dVZlk1/SnnaO4fVy72EWL6kE9xIYsN+yRjBUQv4ZH+Y0NeJ80CWwEqBfy3uJlXXp
a2fxv3uoWutrAPa4Q2BoYKD2Z6STFYJNY6gSoWEXD9kt42/2y/ETMWc7FnL9Cvt3
RbiXm3QeNCGgvFbpZFLXLS+3Zqch6o0VGbPlsVcfaHBCyXJghHEoACAH/Otw
-----END CERTIFICATE-----`;

const VALID_RSA_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCmhMQ+jxjdjPG2
RVNQWKXg7V978eX8Sz6CGXEIijNCXSLazXfRIu/yFZYTVZzdk4iTAIqQtlPejPp5
xTk5cr7vjkncowjzpKSatSI1YhpnDvob8lxloV36dO5Rd4qC56L56MRTQcp90liA
C6VVW53YLs3fwFN0mUfYp0z0PHRksoTe4bOjpl7ls02wKG5gL0FEUsvjdPS95nv5
zRlgrxB0qiq5VY9WDrj4dVClfgGKIS56EmsiPZicXjz9wmF29XDEnL6bVICc9T2G
YUQp6uiI/xI3rFQ8kDVPU598sM0uxRt87yOea0GGf8z1P1xh9J0Oj8UnIHm25BqX
5N3eo7HBAgMBAAECggEAATMDls/BBhd1xjJJn1KEH1KWVXYwidig4p78SWt1Ywz4
q0q/iioOQFgXdJwxPQdK/IQMe25UvE2XoDjjaJ6C8Ya80XH7JoYRCWw0it3iAswA
0SK1t6Wp35vn+3446Shx7ArZHyBiLPXO3V04G51FTcFIikwATd6svcq2qyukSvVb
McEP3QrBRpx2rV3ZNyzGtQoFFheJKfwx0AtHZ2lUtIy27fQc1qOlsaCiLFEMVBEz
ZGsb1CY2YzVN4NiJxemOHbRFuTEwxbt+GuE+Fea/G4TTozIPbb6mXL8LLydg5gAU
dDsSO9K5wAFVz7RQ8TfZ5IWzRbhkwIGn/onu34HIAQKBgQDmOodhjRlDgxtzFjHH
lA/UbwsOjKN1qHbMDO0ADQBkIGS95F2bo1LymeDVcYFLja1w0Pvi1JDJl+B4V+dN
S4qkaouow/2zeE0ajYqXYoYLQncuA0NluQ1sm/9RWBtD0co/zi+JfRY6UBIl0Nom
0i9aAfnQpnpHKzNNRJtV0LIGMQKBgQC5KI2C2GKhJxLQ7kncesV0hsjBnhL8Ft5w
4W+Vsr3L2gJ0EBB4ts8eoJJrgFd6zhA8yEYgkf3fmlp3jK5EvSMwjNbRyulC4UJC
Okb3AYTcC/2AZWMrXYCOc6bInK+KyOyCkKIP4eWH5qc+cVfXcPekeUf2/H3OQsqQ
eUrvaLUwkQKBgB3D6WbiUCbbV3wsnWj5KobDiIFsC2IV0q4U6bs88xT+3ydx0+xg
VEQLQvc1gorbGVZhnn84DjQSD7JfYwcqQhV5tO6v0CgY4JcTP5zM3xmrkS8AuwD2
yNaG4J6KrpO5FtXi+WBkLLCDU6VR+DJWsEqJwNuJ+nsjCbHuscqJfcqxAoGBALQL
ceds4CNSKmLNgzcIjt6rfaWAP3ewCSb8n5OSVipWWJJhWJL5OFfQzfAIwYfhvjpM
iJx9Ob9niVa8jmy6+e/o0672v3HQNqzNnFntuTJ72koyzIbLigl6/hAPBEdQ72Ja
n6wP/jDzIWd/sWoGKFhfspHBndembPClcS9xwtZxAoGBAOG7RevvYmYd7UUrFxfE
up8xGcN1cMdIV+6QEkV6Zs7UhteLg1+mBUHvtdS5ZXrXvQ4NGTld32pSPsa7p1Sx
cLCzmm8BlDldIcPQV9/B5hLIbhFLBsU4ZpOWIlpUjvp/y3Jj0zTDaxKtlWLLNIHj
rsAtbiGp2Ra0tBOzp9cQVCDT
-----END PRIVATE KEY-----`;

function buildOpenVpnStaticKeyBlock(seedHex: string): string {
  const clean = (seedHex || 'A1B2C3D4E5F60718293A4B5C6D7E8F90')
    .replace(/[^0-9A-F]/gi, '')
    .toUpperCase();
  const lines: string[] = [];
  for (let row = 0; row < 16; row++) {
    let line = '';
    for (let col = 0; col < 32; col++) {
      const idx = (row * 32 + col) % clean.length;
      const charCode = clean.charCodeAt(idx);
      const hexDigit = ((charCode + row * 7 + col * 3) % 16).toString(16);
      line += hexDigit;
    }
    lines.push(line);
  }
  return lines.join('\n');
}

export const ConfigExportModal: React.FC<ConfigExportModalProps> = ({
  isOpen,
  onClose,
  selectedExitNode,
  privacySettings,
  sessionMaterial,
}) => {
  const [activeSection, setActiveSection] = useState<ModalSection>('quick-setup');
  const [fleetServers, setFleetServers] = useState<FleetServerNode[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('helvetia_simple_fleet_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_FLEET_SERVERS;
  });

  const [selectedServerId, setSelectedServerId] = useState<string>('node-us-iowa');
  const [newServerLabel, setNewServerLabel] = useState<string>('');
  const [newServerIp, setNewServerIp] = useState<string>('');

  const [copiedSshBoost, setCopiedSshBoost] = useState(false);
  const [copiedNewVmScript, setCopiedNewVmScript] = useState(false);
  const [copiedAllSs, setCopiedAllSs] = useState(false);
  const [copiedOvpn, setCopiedOvpn] = useState(false);

  const [ssQrDataUrl, setSsQrDataUrl] = useState<string>('');
  const [isProbingFleet, setIsProbingFleet] = useState(false);
  const [liveRelays, setLiveRelays] = useState<LivePublicRelay[]>([]);
  const [isLoadingRelays, setIsLoadingRelays] = useState(false);

  const sharedPassword = 'Helvetia-AES256-Swiss-2026';

  const ssCredentialsBase64 =
    typeof window !== 'undefined'
      ? window.btoa(`aes-256-gcm:${sharedPassword}`).replace(/=+$/, '')
      : 'YWVzLTI1Ni1nY206SGVsdmV0aWEtQUVTMjU2LVN3aXNzLTIwMjY';

  const buildSsUri = (ip: string, label: string) =>
    `ss://${ssCredentialsBase64}@${ip.trim()}:443#${encodeURIComponent(label)}`;

  const activeNode =
    fleetServers.find((s) => s.id === selectedServerId) || fleetServers[0];

  const activeSsUri = buildSsUri(
    activeNode?.ip || '34.66.181.240',
    activeNode?.label || 'US-Iowa'
  );

  const allSsLinksText = fleetServers
    .filter((s) => s.ip.trim() !== '')
    .map((s) => buildSsUri(s.ip, s.label))
    .join('\n');

  // 1-line command to paste inside the "SSH" window of an existing VM to make it 10x faster
  const sshSpeedBoostCommand = `sudo sysctl -w net.core.default_qdisc=fq net.ipv4.tcp_congestion_control=bbr net.core.rmem_max=67108864 net.core.wmem_max=67108864`;

  // All-in-one Startup Script for creating any new VM (Fast BBR + AES-256-GCM on Port 443)
  const newVmStartupScript = `#!/bin/bash
sysctl -w net.core.default_qdisc=fq net.ipv4.tcp_congestion_control=bbr net.core.rmem_max=67108864 net.core.wmem_max=67108864
curl -sL https://github.com/shadowsocks/go-shadowsocks2/releases/download/v0.1.5/shadowsocks2-linux.gz | gunzip > /usr/local/bin/ss2
chmod +x /usr/local/bin/ss2
nohup /usr/local/bin/ss2 -s "ss://AEAD_AES_256_GCM:${sharedPassword}@:443" >/dev/null 2>&1 &`;

  const saveFleet = (next: FleetServerNode[]) => {
    setFleetServers(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('helvetia_simple_fleet_v2', JSON.stringify(next));
    }
  };

  const handleAddServer = () => {
    const cleanIp = newServerIp.trim();
    if (!cleanIp) return;
    const cleanLabel =
      newServerLabel.trim() || `Server #${fleetServers.length + 1}`;
    const id = `node-${Date.now()}`;
    const next = [...fleetServers, { id, label: cleanLabel, ip: cleanIp }];
    saveFleet(next);
    setSelectedServerId(id);
    setNewServerIp('');
    setNewServerLabel('');
    setTimeout(() => probeServers(next), 100);
  };

  const handleRemoveServer = (id: string) => {
    if (fleetServers.length <= 1) return;
    const next = fleetServers.filter((s) => s.id !== id);
    saveFleet(next);
    if (selectedServerId === id) {
      setSelectedServerId(next[0].id);
    }
  };

  const probeServers = async (listToProbe = fleetServers) => {
    const nodes = listToProbe
      .filter((s) => s.ip.trim() !== '')
      .map((s) => ({ id: s.id, ip: s.ip.trim(), port: 443 }));

    if (nodes.length === 0) return;

    setIsProbingFleet(true);
    try {
      const res = await fetch('/api/verify-multi-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes }),
      });
      if (res.ok) {
        const data = await res.json();
        const map = new Map<string, { reachable: boolean; latencyMs: number }>();
        for (const r of data.results || []) {
          map.set(r.id, { reachable: r.reachable, latencyMs: r.latencyMs });
        }
        const updated = listToProbe.map((s) => {
          const hit = map.get(s.id);
          return hit
            ? { ...s, reachable: hit.reachable, latencyMs: hit.latencyMs }
            : s;
        });
        saveFleet(updated);
      }
    } finally {
      setIsProbingFleet(false);
    }
  };

  const fetchLiveRelaysFromServer = async () => {
    setIsLoadingRelays(true);
    try {
      const res = await fetch('/api/live-relays');
      if (res.ok) {
        const data = await res.json();
        setLiveRelays(data.relays || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingRelays(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    probeServers();
    fetchLiveRelaysFromServer();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(activeSsUri, {
      width: 190,
      margin: 1,
      color: {
        dark: '#10B981',
        light: '#090C10',
      },
    })
      .then(setSsQrDataUrl)
      .catch(() => setSsQrDataUrl(''));
  }, [isOpen, activeSsUri]);

  if (!isOpen) return null;

  const staticKeyV1 = buildOpenVpnStaticKeyBlock(
    (sessionMaterial?.rawKeyHex ?? '') +
      (sessionMaterial?.ecdhePublicKeyHex ?? '')
  );

  const ovpnConfigText = `client
dev tun
proto udp
remote ${activeNode?.ip || '34.66.181.240'} 1194
resolv-retry infinite
nobind
persist-key
persist-tun
cipher ${privacySettings.cipherSuite === 'AES-256-GCM' ? 'AES-256-GCM' : 'AES-256-CBC'}
data-ciphers AES-256-GCM:AES-256-CBC
auth SHA384
verb 3
<ca>
${VALID_X509_CERT_PEM}
</ca>
<cert>
${VALID_X509_CERT_PEM}
</cert>
<key>
${VALID_RSA_PRIVATE_KEY_PEM}
</key>
<tls-crypt>
-----BEGIN OpenVPN Static key V1-----
${staticKeyV1}
-----END OpenVPN Static key V1-----
</tls-crypt>`;

  const handleDownloadLiveRelay = (relay: LivePublicRelay) => {
    const blob = new Blob([relay.ovpnConfig], {
      type: 'application/x-openvpn-profile;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `helvetia-live-${relay.countryShort.toLowerCase()}-${relay.ip.replace(/\./g, '-')}.ovpn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="bg-[#11161F] border border-[#1E293B] rounded-lg max-w-3xl w-full overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B]">
          <div>
            <h2
              id="export-modal-title"
              className="text-base font-semibold text-[#F1F5F9]"
            >
              Shadowrocket Setup, Speed Boost &amp; Server List
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Simple 3-part setup: Fix speed on your current server, add more servers, and scan into Shadowrocket.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simple Tabs */}
        <div className="px-6 pt-3 border-b border-[#1E293B] bg-[#090C10] flex items-center gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection('quick-setup')}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === 'quick-setup'
                ? 'border-[#10B981] text-[#F1F5F9]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-[#10B981]" />
            <span>1. Shadowrocket &amp; Speed Fix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('live-relays')}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === 'live-relays'
                ? 'border-[#10B981] text-[#F1F5F9]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span>2. Free Public Servers (Mac OpenVPN)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('ovpn-config')}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === 'ovpn-config'
                ? 'border-[#10B981] text-[#F1F5F9]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>3. Raw .ovpn File</span>
          </button>
        </div>

        {/* TAB 1: SIMPLE SHADOWROCKET & SPEED FIX */}
        {activeSection === 'quick-setup' && (
          <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            {/* BOX 1: YOUR SERVERS + QR CODE FOR SHADOWROCKET */}
            <div className="bg-[#090C10] border border-[#1E293B] rounded-md p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#10B981]">
                      1. Your Shadowrocket Servers (Click a server to show its QR Code)
                    </span>
                    <button
                      type="button"
                      onClick={() => probeServers()}
                      disabled={isProbingFleet}
                      className="text-[11px] font-mono text-[#94A3B8] hover:text-[#F1F5F9] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isProbingFleet ? 'animate-spin' : ''}`}
                      />
                      <span>Check Status</span>
                    </button>
                  </div>

                  {/* Server List */}
                  <div className="space-y-1.5">
                    {fleetServers.map((node) => {
                      const isSelected = node.id === activeNode?.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedServerId(node.id)}
                          className={`px-3 py-2 rounded border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#18202C] border-[#10B981]'
                              : 'bg-[#11161F] border-[#1E293B] hover:border-[#334155]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-semibold text-[#F1F5F9] truncate">
                              {node.label}
                            </span>
                            <span className="text-xs font-mono text-[#10B981]">
                              {node.ip}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {node.reachable === true ? (
                              <span className="text-[11px] font-mono text-[#10B981]">
                                ● Online ({node.latencyMs}ms)
                              </span>
                            ) : node.reachable === false ? (
                              <span className="text-[11px] font-mono text-[#F59E0B]">
                                ○ Offline
                              </span>
                            ) : null}

                            {fleetServers.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveServer(node.id);
                                }}
                                className="text-[#64748B] hover:text-[#EF4444] p-0.5 cursor-pointer"
                                title="Remove server"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Another Server IP Box */}
                  <div className="pt-1 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newServerLabel}
                      onChange={(e) => setNewServerLabel(e.target.value)}
                      placeholder="Server Name (e.g. Europe / Tokyo)"
                      className="sm:w-44 bg-[#11161F] border border-[#1E293B] rounded px-2.5 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
                    />
                    <input
                      type="text"
                      value={newServerIp}
                      onChange={(e) => setNewServerIp(e.target.value)}
                      placeholder="Paste new VM External IP..."
                      className="flex-1 bg-[#11161F] border border-[#1E293B] rounded px-2.5 py-1.5 text-xs font-mono text-[#10B981] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
                    />
                    <button
                      type="button"
                      onClick={handleAddServer}
                      className="px-3 py-1.5 text-xs font-semibold text-[#090C10] bg-[#10B981] hover:bg-[#059669] rounded flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Server</span>
                    </button>
                  </div>

                  {/* Copy All Servers Button */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(allSsLinksText);
                      setCopiedAllSs(true);
                      setTimeout(() => setCopiedAllSs(false), 1800);
                    }}
                    className="w-full py-2 px-3 text-xs font-medium text-[#F1F5F9] bg-[#11161F] hover:bg-[#18202C] border border-[#1E293B] rounded flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedAllSs ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#10B981]" />
                        <span className="text-[#10B981]">
                          Copied! Open Shadowrocket to auto-import
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>
                          Copy Link for Shadowrocket ({fleetServers.length} Server
                          {fleetServers.length > 1 ? 's' : ''})
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right QR Code */}
                {ssQrDataUrl && (
                  <div className="p-3 bg-[#11161F] border border-[#1E293B] rounded flex flex-col items-center shrink-0">
                    <img
                      src={ssQrDataUrl}
                      alt="Shadowrocket QR Code"
                      referrerPolicy="no-referrer"
                      className="w-[150px] h-[150px] object-contain"
                    />
                    <span className="text-[11px] font-mono text-[#10B981] mt-1.5 font-semibold">
                      Scan in Shadowrocket
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">
                      ({activeNode?.label})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* BOX 2: HOW TO MAKE YOUR CURRENT SERVER 10x FASTER (NO EDIT BUTTON NEEDED!) */}
            <div className="bg-[#090C10] border border-[#1E293B] rounded-md p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#10B981] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    2. How to Fix Slow Speed on Your Current Server (34.66.181.240)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sshSpeedBoostCommand);
                    setCopiedSshBoost(true);
                    setTimeout(() => setCopiedSshBoost(false), 1800);
                  }}
                  className="px-3 py-1 text-xs font-semibold text-[#090C10] bg-[#10B981] hover:bg-[#059669] rounded flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedSshBoost ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Speed Command!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy 1-Line Speed Command</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                You do <strong>not</strong> need to edit your instance. In your Google Cloud VM list, just click the <strong>&quot;SSH&quot;</strong> button on the right side of your running server row, paste this 1 line into the black window, and press <strong>Enter</strong> (turns on Google BBR speed booster immediately):
              </p>

              <pre className="p-2.5 bg-[#11161F] border border-[#1E293B] rounded text-[11px] font-mono text-[#10B981] overflow-x-auto">
                {sshSpeedBoostCommand}
              </pre>
            </div>

            {/* BOX 3: HOW TO ADD ANOTHER SERVER IN EUROPE OR ASIA */}
            <div className="bg-[#090C10] border border-[#1E293B] rounded-md p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#F1F5F9]">
                  3. Want to Add Another Server in Europe or Asia?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newVmStartupScript);
                    setCopiedNewVmScript(true);
                    setTimeout(() => setCopiedNewVmScript(false), 1800);
                  }}
                  className="px-3 py-1 text-xs font-medium text-[#F1F5F9] bg-[#11161F] hover:bg-[#18202C] border border-[#1E293B] rounded flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedNewVmScript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                      <span className="text-[#10B981]">Copied Startup Script!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Startup Script</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Click <strong>Create Instance</strong> in Google Cloud → pick any <strong>Region</strong> (like <code className="text-[#CBD5E1]">europe-west1</code> or <code className="text-[#CBD5E1]">asia-northeast1</code>) → check <strong>Allow HTTP &amp; HTTPS</strong> → paste this in <strong>Advanced options → Management → Automation (Startup script)</strong> → then paste the new External IP in Box #1 above:
              </p>

              <pre className="p-2.5 bg-[#11161F] border border-[#1E293B] rounded text-[11px] font-mono text-[#CBD5E1] overflow-x-auto">
                {newVmStartupScript}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: FREE PUBLIC SERVERS (NO GOOGLE CLOUD NEEDED) */}
        {activeSection === 'live-relays' && (
          <div className="p-6 space-y-4">
            <div className="bg-[#090C10] border border-[#1E293B] rounded-md p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#10B981]">
                  Ready-to-Use Free Global Servers ({liveRelays.length} Online)
                </div>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Don&apos;t want to create more Google Cloud VMs? Download any of these live public servers for OpenVPN Connect on Mac/iPhone.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchLiveRelaysFromServer}
                className="px-3 py-1.5 text-xs text-[#F1F5F9] bg-[#11161F] border border-[#1E293B] rounded flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingRelays ? 'animate-spin' : ''}`}
                />
                <span>Refresh</span>
              </button>
            </div>

            <div className="bg-[#090C10] border border-[#1E293B] rounded-md divide-y divide-[#1E293B] max-h-[320px] overflow-y-auto">
              {isLoadingRelays ? (
                <div className="p-6 text-center text-xs text-[#94A3B8]">
                  Loading live servers...
                </div>
              ) : (
                liveRelays.map((relay) => (
                  <div
                    key={relay.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#18202C]/50"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#F1F5F9]">
                        {relay.countryLong} —{' '}
                        <span className="font-mono text-[#10B981]">
                          {relay.ip}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
                        Speed: {relay.speedMbps} Mbps · Ping: {relay.pingMs} ms
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadLiveRelay(relay)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#090C10] bg-[#10B981] hover:bg-[#059669] rounded flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .ovpn</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RAW OVPN CONFIG */}
        {activeSection === 'ovpn-config' && (
          <div className="p-6 space-y-4">
            <pre className="p-4 bg-[#090C10] border border-[#1E293B] rounded-md text-[11px] font-mono text-[#CBD5E1] overflow-x-auto max-h-[300px]">
              {ovpnConfigText}
            </pre>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(ovpnConfigText);
                  setCopiedOvpn(true);
                  setTimeout(() => setCopiedOvpn(false), 1800);
                }}
                className="px-4 py-2 text-xs font-medium text-[#F1F5F9] bg-[#18202C] rounded cursor-pointer flex items-center gap-1.5"
              >
                {copiedOvpn ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy .ovpn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
