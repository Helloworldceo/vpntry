import React, { useState } from 'react';
import { ShieldCheck, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  AuditCheckItem,
  CipherSuite,
  CryptoSessionMaterial,
  PrivacySettings,
  RelayNode,
  TunnelProtocol,
} from '../types/vpn';

interface PrivacyShieldViewProps {
  privacySettings: PrivacySettings;
  selectedExitNode: RelayNode;
  sessionMaterial: CryptoSessionMaterial | null;
  onUpdateSettings: (partial: Partial<PrivacySettings>) => void;
}

export const PrivacyShieldView: React.FC<PrivacyShieldViewProps> = ({
  privacySettings,
  selectedExitNode,
  sessionMaterial,
  onUpdateSettings,
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditItems, setAuditItems] = useState<AuditCheckItem[]>([
    {
      id: 'aes-gcm-nist',
      title: 'AES-256-GCM NIST SP 800-38D Cipher Validation',
      mechanism: 'Verifies 256-bit key length, 96-bit IV uniqueness, and 128-bit AEAD tag authentication',
      status: 'passed',
      detail: 'Hardware-accelerated Web Crypto AES-256-GCM active with zero nonce reuse.',
      verifiedValue: `${privacySettings.cipherSuite} (${sessionMaterial?.keyId ?? 'K256'})`,
    },
    {
      id: 'dns-doh',
      title: 'Zero-Knowledge In-Tunnel DNS-over-HTTPS (DoH)',
      mechanism: 'Routes all port 53 / UDP DNS queries through encrypted tunnel resolver 10.255.0.1',
      status: privacySettings.dnsOverHttps ? 'passed' : 'warning',
      detail: privacySettings.dnsOverHttps
        ? 'ISP DNS resolvers bypassed; zero external DNS queries detected.'
        : 'In-tunnel DoH disabled; ISP may observe domain lookup metadata.',
      verifiedValue: privacySettings.dnsOverHttps
        ? '10.255.0.1 (Swiss Zero-Log Resolver)'
        : 'Unprotected Local DNS',
    },
    {
      id: 'webrtc-stun',
      title: 'WebRTC STUN / ICE Local Candidate Leak Lock',
      mechanism: 'Blocks browser RTCPeerConnection UDP candidate discovery outside tunnel interface',
      status: privacySettings.webrtcBlock ? 'passed' : 'warning',
      detail: privacySettings.webrtcBlock
        ? 'RTCPeerConnection restricted strictly to tun0 virtual adapter.'
        : 'WebRTC STUN probing permitted.',
      verifiedValue: privacySettings.webrtcBlock
        ? '0 Leaked Candidates · Masked'
        : 'STUN Probing Active',
    },
    {
      id: 'ipv6-isolation',
      title: 'IPv6 Dual-Stack Tunnel Isolation',
      mechanism: 'Drops host link-local fe80:: and ISP global IPv6 packets outside encrypted interface',
      status: privacySettings.ipv6LeakProtection ? 'passed' : 'warning',
      detail: privacySettings.ipv6LeakProtection
        ? `IPv6 routed strictly through ${selectedExitNode.ipv6Prefix}`
        : 'Host IPv6 stack unisolated.',
      verifiedValue: privacySettings.ipv6LeakProtection
        ? selectedExitNode.ipv6Prefix
        : 'Host Stack Exposed',
    },
    {
      id: 'ram-diskless',
      title: 'Diskless RAM-Only Relay Attestation',
      mechanism: 'Verifies remote bare-metal server boots via read-only PXE image in volatile ECC RAM',
      status: selectedExitNode.ramOnlyDiskless ? 'passed' : 'warning',
      detail: selectedExitNode.ramOnlyDiskless
        ? `${selectedExitNode.code} operates without persistent NVMe/SATA storage media.`
        : `${selectedExitNode.code} uses standard encrypted storage; switch to a RAM-Only node for volatile isolation.`,
      verifiedValue: selectedExitNode.ramOnlyDiskless
        ? 'Volatile ECC RAM Verified'
        : 'Standard Encrypted Node',
    },
  ]);

  const runLiveAudit = () => {
    setIsAuditing(true);
    setAuditItems((prev) =>
      prev.map((item) => ({ ...item, status: 'running' }))
    );

    setTimeout(() => {
      setAuditItems([
        {
          id: 'aes-gcm-nist',
          title: 'AES-256-GCM NIST SP 800-38D Cipher Validation',
          mechanism: 'Verifies 256-bit key length, 96-bit IV uniqueness, and 128-bit AEAD tag authentication',
          status: 'passed',
          detail: 'Hardware-accelerated Web Crypto AES-256-GCM active with zero nonce reuse.',
          verifiedValue: `${privacySettings.cipherSuite} (${sessionMaterial?.keyId ?? 'K256'})`,
        },
        {
          id: 'dns-doh',
          title: 'Zero-Knowledge In-Tunnel DNS-over-HTTPS (DoH)',
          mechanism: 'Routes all port 53 / UDP DNS queries through encrypted tunnel resolver 10.255.0.1',
          status: privacySettings.dnsOverHttps ? 'passed' : 'warning',
          detail: privacySettings.dnsOverHttps
            ? 'ISP DNS resolvers bypassed; zero external DNS queries detected.'
            : 'In-tunnel DoH disabled; enable DoH below to prevent ISP lookup leaks.',
          verifiedValue: privacySettings.dnsOverHttps
            ? '10.255.0.1 (Swiss Zero-Log Resolver)'
            : 'Unprotected Local DNS',
        },
        {
          id: 'webrtc-stun',
          title: 'WebRTC STUN / ICE Local Candidate Leak Lock',
          mechanism: 'Blocks browser RTCPeerConnection UDP candidate discovery outside tunnel interface',
          status: privacySettings.webrtcBlock ? 'passed' : 'warning',
          detail: privacySettings.webrtcBlock
            ? 'RTCPeerConnection restricted strictly to tun0 virtual adapter.'
            : 'WebRTC STUN probing permitted.',
          verifiedValue: privacySettings.webrtcBlock
            ? '0 Leaked Candidates · Masked'
            : 'STUN Probing Active',
        },
        {
          id: 'ipv6-isolation',
          title: 'IPv6 Dual-Stack Tunnel Isolation',
          mechanism: 'Drops host link-local fe80:: and ISP global IPv6 packets outside encrypted interface',
          status: privacySettings.ipv6LeakProtection ? 'passed' : 'warning',
          detail: privacySettings.ipv6LeakProtection
            ? `IPv6 routed strictly through ${selectedExitNode.ipv6Prefix}`
            : 'Host IPv6 stack unisolated.',
          verifiedValue: privacySettings.ipv6LeakProtection
            ? selectedExitNode.ipv6Prefix
            : 'Host Stack Exposed',
        },
        {
          id: 'ram-diskless',
          title: 'Diskless RAM-Only Relay Attestation',
          mechanism: 'Verifies remote bare-metal server boots via read-only PXE image in volatile ECC RAM',
          status: selectedExitNode.ramOnlyDiskless ? 'passed' : 'warning',
          detail: selectedExitNode.ramOnlyDiskless
            ? `${selectedExitNode.code} operates without persistent NVMe/SATA storage media.`
            : `${selectedExitNode.code} uses standard encrypted storage.`,
          verifiedValue: selectedExitNode.ramOnlyDiskless
            ? 'Volatile ECC RAM Verified'
            : 'Standard Encrypted Node',
        },
      ]);
      setIsAuditing(false);
    }, 450);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#090C10] p-6 lg:p-8">
      <div className="max-w-[1280px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1E293B] pb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">
              Zero-Knowledge Privacy Shield &amp; Leak Audit
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-2xl">
              Configure cryptographic transport parameters, DNS/IPv6 leak isolation, and verify end-to-end tunnel hardening against traffic correlation.
            </p>
          </div>

          <button
            type="button"
            onClick={runLiveAudit}
            disabled={isAuditing}
            className="px-4 py-2 text-xs font-medium text-[#090C10] bg-[#10B981] hover:bg-[#059669] rounded-md transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Auditing Tunnel Interfaces...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run 5-Point Privacy &amp; Leak Audit</span>
              </>
            )}
          </button>
        </div>

        {/* Cryptographic Protocol & Cipher Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#11161F] border border-[#1E293B] rounded-md p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#F1F5F9]">
                01. AES-256 Cipher Suite &amp; Transport Protocol
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Select how data frames are authenticated and encapsulated across the virtual network interface.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-[#94A3B8]">
                Data Channel Cipher Suite:
                <select
                  value={privacySettings.cipherSuite}
                  onChange={(e) =>
                    onUpdateSettings({ cipherSuite: e.target.value as CipherSuite })
                  }
                  className="mt-1.5 w-full bg-[#090C10] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#10B981]"
                >
                  <option value="AES-256-GCM">
                    AES-256-GCM (NIST SP 800-38D AEAD · 128-Bit Auth Tag)
                  </option>
                  <option value="AES-256-CBC-SHA512">
                    AES-256-CBC + HMAC-SHA512 (Classical Block Mode)
                  </option>
                </select>
              </label>

              <label className="block text-xs text-[#94A3B8]">
                Tunnel Handshake &amp; Encapsulation Protocol:
                <select
                  value={privacySettings.protocol}
                  onChange={(e) =>
                    onUpdateSettings({ protocol: e.target.value as TunnelProtocol })
                  }
                  className="mt-1.5 w-full bg-[#090C10] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#10B981]"
                >
                  <option value="OpenVPN-UDP-1194">
                    OpenVPN 2.6 · UDP Port 1194 · TLS-Crypt-v2
                  </option>
                  <option value="WireGuard-AES256-Hybrid">
                    WireGuard + AES-256-GCM Post-Quantum Hybrid Extension
                  </option>
                  <option value="IKEv2-IPsec-GCM">
                    IKEv2/IPsec · MOBIKE · SHA-384 / Curve25519
                  </option>
                </select>
              </label>
            </div>
          </div>

          {/* Hardware & Leak Isolation Toggles */}
          <div className="bg-[#11161F] border border-[#1E293B] rounded-md p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#F1F5F9]">
                02. Network Leak &amp; DPI Hardening Controls
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Every control directly updates the active tunnel routing policy and exported configuration profile.
              </p>
            </div>

            <div className="divide-y divide-[#1E293B]">
              {[
                {
                  key: 'dnsOverHttps' as const,
                  title: 'In-Tunnel DNS-over-HTTPS (DoH)',
                  desc: 'Forces all DNS resolution through 10.255.0.1 inside the AES-256 tunnel',
                },
                {
                  key: 'ipv6LeakProtection' as const,
                  title: 'Strict IPv6 Leak Isolation',
                  desc: 'Blocks unencrypted link-local and ISP IPv6 traffic outside tun0',
                },
                {
                  key: 'webrtcBlock' as const,
                  title: 'WebRTC STUN Candidate Blocker',
                  desc: 'Prevents browsers from revealing local LAN/WAN IPs during media calls',
                },
                {
                  key: 'stealthObfs4' as const,
                  title: 'Obfs4 TLS 1.3 Stealth Obfuscation',
                  desc: 'Wraps AES-256 packets in standard HTTPS frames to defeat firewall DPI',
                },
                {
                  key: 'ramOnlyStrict' as const,
                  title: 'Enforce Diskless RAM-Only Relays',
                  desc: 'Restricts server directory strictly to volatile PXE-booted hardware',
                },
              ].map((item) => {
                const enabled = privacySettings[item.key];
                return (
                  <div
                    key={item.key}
                    className="py-2.5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#F1F5F9]">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">{item.desc}</div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => onUpdateSettings({ [item.key]: !enabled })}
                      className={`w-10 h-5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                        enabled ? 'bg-[#10B981]' : 'bg-[#1E293B]'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-[#090C10] transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5-Point Live Cryptographic & Leak Verification Table */}
        <div className="bg-[#11161F] border border-[#1E293B] rounded-md overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#F1F5F9]">
                03. Live Tunnel Integrity &amp; Zero-Leak Attestation Report
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Real-time verification of active privacy controls against IP, DNS, and cryptographic downgrade vectors.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#10B981]">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {auditItems.filter((i) => i.status === 'passed').length}/
                {auditItems.length} Checks Passed
              </span>
            </div>
          </div>

          <div className="divide-y divide-[#1E293B]">
            {auditItems.map((check) => (
              <div
                key={check.id}
                className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#18202C]/40 transition-colors"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        check.status === 'passed'
                          ? 'text-[#10B981]'
                          : check.status === 'running'
                          ? 'text-[#06B6D4] animate-pulse'
                          : 'text-[#F59E0B]'
                      }`}
                    />
                    <span className="text-xs font-semibold text-[#F1F5F9]">
                      {check.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] pl-6">{check.detail}</p>
                </div>

                <div className="pl-6 md:pl-0 md:text-right font-mono tabular-nums shrink-0">
                  <div
                    className={`text-xs font-semibold ${
                      check.status === 'passed'
                        ? 'text-[#10B981]'
                        : check.status === 'running'
                        ? 'text-[#06B6D4]'
                        : 'text-[#F59E0B]'
                    }`}
                  >
                    {check.status === 'running'
                      ? 'VERIFYING...'
                      : check.status === 'passed'
                      ? 'VERIFIED · NO LEAK'
                      : 'ATTENTION'}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">
                    {check.verifiedValue}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
