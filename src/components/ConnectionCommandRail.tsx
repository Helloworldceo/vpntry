import React from 'react';
import { Power, ShieldCheck, ShieldAlert, RefreshCw, ArrowRight } from 'lucide-react';
import {
  ConnectionState,
  CryptoSessionMaterial,
  PrivacySettings,
  RelayNode,
} from '../types/vpn';
import { USER_ORIGIN } from '../data/relayNodes';
import { PWAInstallControl } from './PWAInstallControl';

interface ConnectionCommandRailProps {
  connectionState: ConnectionState;
  handshakeStep: number;
  uptimeSeconds: number;
  selectedExitNode: RelayNode;
  selectedEntryNode: RelayNode;
  allNodes: RelayNode[];
  privacySettings: PrivacySettings;
  sessionMaterial: CryptoSessionMaterial | null;
  onToggleConnect: () => void;
  onToggleMultiHop: () => void;
  onSelectEntryNode: (node: RelayNode) => void;
  onRotateKey: () => void;
  onOpenQrModal: () => void;
}

const HANDSHAKE_STAGES = [
  '01. ECDHE-Curve25519 Ephemeral Key Exchange',
  '02. AES-256-GCM Session Key Derivation',
  '03. HMAC-SHA384 Tunnel Authentication',
  '04. Zero-Knowledge DNS & IPv6 Leak Lock',
];

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs]
    .map((val) => val.toString().padStart(2, '0'))
    .join(':');
}

export const ConnectionCommandRail: React.FC<ConnectionCommandRailProps> = ({
  connectionState,
  handshakeStep,
  uptimeSeconds,
  selectedExitNode,
  selectedEntryNode,
  allNodes,
  privacySettings,
  sessionMaterial,
  onToggleConnect,
  onToggleMultiHop,
  onSelectEntryNode,
  onRotateKey,
  onOpenQrModal,
}) => {
  const isConnected = connectionState === 'connected';
  const isHandshaking = connectionState === 'handshaking';
  const isKillSwitch = connectionState === 'killswitch';

  const multiHopCandidates = allNodes.filter(
    (n) => n.multiHopCapable && n.id !== selectedExitNode.id
  );

  return (
    <aside className="w-full lg:w-[320px] shrink-0 bg-[#11161F] border-b lg:border-b-0 lg:border-r border-[#1E293B] flex flex-col justify-between overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Status Header with Explicit Text State (Never Color Alone) */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div>
            <div className="text-xs text-[#94A3B8]">Tunnel Security Status</div>
            <div className="mt-1 flex items-center gap-2">
              {isConnected && (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span className="text-sm font-semibold text-[#10B981]">
                    Protected · AES-256-GCM
                  </span>
                </>
              )}
              {isHandshaking && (
                <>
                  <RefreshCw className="w-4 h-4 text-[#F59E0B] animate-spin shrink-0" />
                  <span className="text-sm font-semibold text-[#F59E0B]">
                    Negotiating Handshake...
                  </span>
                </>
              )}
              {connectionState === 'disconnected' && (
                <>
                  <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
                  <span className="text-sm font-semibold text-[#EF4444]">
                    Unprotected · Exposed
                  </span>
                </>
              )}
              {isKillSwitch && (
                <>
                  <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
                  <span className="text-sm font-semibold text-[#EF4444]">
                    Kill Switch Engaged
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="text-right font-mono tabular-nums">
            <div className="text-[11px] text-[#94A3B8]">Uptime</div>
            <div className="text-sm font-semibold text-[#F1F5F9]">
              {isConnected ? formatDuration(uptimeSeconds) : '00:00:00'}
            </div>
          </div>
        </div>

        {/* Dominant Focal Anchor: Tactile Connection Core */}
        <div className="flex flex-col items-center py-2">
          <button
            type="button"
            onClick={onToggleConnect}
            aria-label={
              isConnected ? 'Disconnect AES-256 VPN Tunnel' : 'Connect AES-256 VPN Tunnel'
            }
            className={`relative w-[116px] h-[116px] rounded-full flex flex-col items-center justify-center transition-transform duration-150 active:scale-95 cursor-pointer border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
              isConnected
                ? 'bg-[#090C10] border-[#10B981] text-[#10B981] shadow-[0_0_32px_rgba(16,185,129,0.2)]'
                : isHandshaking
                ? 'bg-[#090C10] border-[#F59E0B] text-[#F59E0B]'
                : 'bg-[#090C10] border-[#334155] hover:border-[#94A3B8] text-[#F1F5F9]'
            }`}
          >
            <Power className="w-8 h-8 mb-1.5" />
            <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
              {isConnected
                ? 'Disconnect'
                : isHandshaking
                ? 'Connecting'
                : isKillSwitch
                ? 'Resume Tunnel'
                : 'Connect'}
            </span>
          </button>

          <p className="text-xs text-[#94A3B8] text-center mt-3 font-mono tabular-nums">
            {isConnected
              ? `${selectedExitNode.city}, ${selectedExitNode.country} (${selectedExitNode.baseLatencyMs} ms)`
              : isKillSwitch
              ? 'All non-tunnel sockets blocked at firewall'
              : `Ready: ${selectedExitNode.city} (${selectedExitNode.code})`}
          </p>
        </div>

        {/* 4-Stage Cryptographic Handshake Progress */}
        <div className="border-t border-[#1E293B] pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#94A3B8]">
              Cryptographic Tunnel Pipeline
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[#64748B]">
              {isConnected ? '4/4 Verified' : isHandshaking ? `${handshakeStep}/4` : 'Standby'}
            </span>
          </div>
          <div className="space-y-1.5">
            {HANDSHAKE_STAGES.map((stage, idx) => {
              const stepNum = idx + 1;
              const done = isConnected || (isHandshaking && handshakeStep >= stepNum);
              const active = isHandshaking && handshakeStep === stepNum;

              return (
                <div
                  key={stage}
                  className={`text-[11px] font-mono flex items-center justify-between py-1 px-2 rounded ${
                    done
                      ? 'text-[#F1F5F9] bg-[#090C10]'
                      : active
                      ? 'text-[#F59E0B] bg-[#090C10]'
                      : 'text-[#64748B]'
                  }`}
                >
                  <span className="truncate pr-2">{stage}</span>
                  <span className="shrink-0">
                    {done ? 'OK' : active ? '...' : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-Hop (Double VPN) Circuit Selector */}
        <div className="border-t border-[#1E293B] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#F1F5F9]">
                Multi-Hop Double VPN
              </div>
              <div className="text-[11px] text-[#94A3B8]">
                Dual AES-256 encapsulation across 2 jurisdictions
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={privacySettings.multiHop}
              onClick={onToggleMultiHop}
              className={`w-10 h-5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                privacySettings.multiHop ? 'bg-[#10B981]' : 'bg-[#1E293B]'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-[#090C10] transition-transform ${
                  privacySettings.multiHop ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {privacySettings.multiHop && (
            <div className="bg-[#090C10] border border-[#1E293B] rounded p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#06B6D4]">ENTRY: {selectedEntryNode.code}</span>
                <ArrowRight className="w-3 h-3 text-[#64748B]" />
                <span className="text-[#10B981]">EXIT: {selectedExitNode.code}</span>
              </div>
              <label className="block text-[11px] text-[#94A3B8]">
                Select Entry Hop Jurisdiction:
                <select
                  value={selectedEntryNode.id}
                  onChange={(e) => {
                    const found = allNodes.find((n) => n.id === e.target.value);
                    if (found) onSelectEntryNode(found);
                  }}
                  className="mt-1 w-full bg-[#11161F] border border-[#1E293B] rounded px-2 py-1.5 text-xs text-[#F1F5F9] font-mono focus:outline-none focus:border-[#10B981]"
                >
                  {multiHopCandidates.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.code} · {node.city}, {node.country} ({node.baseLatencyMs}ms)
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        {/* Network IP Masking & Ephemeral Key Readout */}
        <div className="border-t border-[#1E293B] pt-4 space-y-2.5 text-xs font-mono tabular-nums">
          <div className="flex items-center justify-between">
            <span className="text-[#94A3B8] font-sans">ISP Origin IPv4</span>
            <span className={isConnected ? 'line-through text-[#64748B]' : 'text-[#EF4444]'}>
              {USER_ORIGIN.unmaskedIp}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#94A3B8] font-sans">Masked Exit IPv4</span>
            <span className={isConnected ? 'text-[#10B981] font-medium' : 'text-[#64748B]'}>
              {isConnected ? selectedExitNode.exitIp : 'Unmasked'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#94A3B8] font-sans">Tunnel IPv6</span>
            <span className="text-[#F1F5F9] truncate max-w-[165px]">
              {isConnected ? selectedExitNode.ipv6Prefix : 'Blocked (No-Leak)'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#94A3B8] font-sans">In-Tunnel DoH DNS</span>
            <span className="text-[#F1F5F9]">
              {privacySettings.dnsOverHttps ? '10.255.0.1 (Zero-Log)' : 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Ephemeral Key Rotation & Device Install Footer Action */}
      <div className="p-4 border-t border-[#1E293B] bg-[#090C10] space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#94A3B8]">
          <span>256-Bit Key Rotated:</span>
          <span className="text-[#F1F5F9]">{sessionMaterial?.rotatedAt ?? '—'}</span>
        </div>
        <button
          type="button"
          onClick={onRotateKey}
          className="w-full py-2 px-3 text-xs font-medium text-[#F1F5F9] bg-[#11161F] hover:bg-[#18202C] border border-[#1E293B] rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Rotate Ephemeral AES-256 Key</span>
        </button>
        <PWAInstallControl onOpenQrModal={onOpenQrModal} />
      </div>
    </aside>
  );
};
