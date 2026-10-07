import React from 'react';
import {
  RelayNode,
  ConnectionState,
  TelemetryPoint,
  PrivacySettings,
  CryptoSessionMaterial,
} from '../types/vpn';
import { USER_ORIGIN } from '../data/relayNodes';

interface GlobalRouteMapProps {
  nodes: RelayNode[];
  selectedExitNode: RelayNode;
  selectedEntryNode: RelayNode;
  connectionState: ConnectionState;
  privacySettings: PrivacySettings;
  telemetry: TelemetryPoint[];
  totalDownMb: number;
  totalUpMb: number;
  totalEncryptedPackets: number;
  sessionMaterial: CryptoSessionMaterial | null;
  onSelectExitNode: (node: RelayNode) => void;
  onSelectEntryNode: (node: RelayNode) => void;
  onRotateKey: () => void;
  onInspectCipher: () => void;
}

/**
 * Generates a quadratic SVG Bezier curve path between two map coordinates
 * with an upward arc proportional to horizontal distance.
 */
function buildGeodesicArc(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const arcLift = Math.min(95, dist * 0.28);
  const my = Math.min(y1, y2) - arcLift;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

export const GlobalRouteMap: React.FC<GlobalRouteMapProps> = ({
  nodes,
  selectedExitNode,
  selectedEntryNode,
  connectionState,
  privacySettings,
  telemetry,
  totalDownMb,
  totalUpMb,
  totalEncryptedPackets,
  sessionMaterial,
  onSelectExitNode,
  onRotateKey,
  onInspectCipher,
}) => {
  const isConnected = connectionState === 'connected';
  const isHandshaking = connectionState === 'handshaking';
  const isKillSwitch = connectionState === 'killswitch';
  const isMultiHop = privacySettings.multiHop && selectedEntryNode.id !== selectedExitNode.id;

  const latestPoint = telemetry[telemetry.length - 1] || {
    downMbps: 0,
    upMbps: 0,
    encryptedPackets: 0,
  };

  // Build SVG polyline paths for the 60-second dual-stream area chart
  const chartWidth = 640;
  const chartHeight = 110;
  const maxMbps = 420;

  const downPoints = telemetry
    .map((pt, idx) => {
      const x = (idx / Math.max(1, telemetry.length - 1)) * chartWidth;
      const y = chartHeight - Math.min(chartHeight - 8, (pt.downMbps / maxMbps) * (chartHeight - 16)) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const upPoints = telemetry
    .map((pt, idx) => {
      const x = (idx / Math.max(1, telemetry.length - 1)) * chartWidth;
      const y = chartHeight - Math.min(chartHeight - 8, (pt.upMbps / maxMbps) * (chartHeight - 16)) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const downAreaPath =
    telemetry.length > 1
      ? `M 0,${chartHeight} L ${downPoints.replace(/ /g, ' L ')} L ${chartWidth},${chartHeight} Z`
      : '';

  const singleHopPath = buildGeodesicArc(
    USER_ORIGIN.x,
    USER_ORIGIN.y,
    selectedExitNode.coordinates.x,
    selectedExitNode.coordinates.y
  );

  const entryHopPath = buildGeodesicArc(
    USER_ORIGIN.x,
    USER_ORIGIN.y,
    selectedEntryNode.coordinates.x,
    selectedEntryNode.coordinates.y
  );

  const exitHopPath = buildGeodesicArc(
    selectedEntryNode.coordinates.x,
    selectedEntryNode.coordinates.y,
    selectedExitNode.coordinates.x,
    selectedExitNode.coordinates.y
  );

  return (
    <div className="flex flex-col h-full bg-[#090C10] overflow-hidden select-none">
      {/* Top Vector Map Header Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1E293B] bg-[#090C10]">
        <div>
          <h2 className="text-sm font-semibold text-[#F1F5F9]">
            Global Cryptographic Routing Topology
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5 font-mono tabular-nums">
            {isMultiHop
              ? `Multi-Hop Circuit: ${USER_ORIGIN.city} → ${selectedEntryNode.code} (Entry) → ${selectedExitNode.code} (Exit)`
              : `Direct Circuit: ${USER_ORIGIN.city} → ${selectedExitNode.code} (${selectedExitNode.city}, ${selectedExitNode.country})`}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#94A3B8] font-mono tabular-nums">
          <span>
            Cipher: <strong className="text-[#F1F5F9] font-medium">{privacySettings.cipherSuite}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Key ID: <strong className="text-[#10B981] font-medium">{sessionMaterial?.keyId ?? 'INIT'}</strong>
          </span>
          <button
            type="button"
            onClick={onInspectCipher}
            className="px-2.5 py-1 text-xs font-sans font-medium text-[#F1F5F9] bg-[#11161F] hover:bg-[#18202C] border border-[#1E293B] rounded transition-colors cursor-pointer"
          >
            Inspect Hex Key
          </button>
        </div>
      </div>

      {/* Interactive SVG World Map Canvas */}
      <div className="relative flex-1 min-h-[290px] bg-[#090C10] overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 1000 460"
          className="w-full h-full max-h-[460px] object-contain"
          role="img"
          aria-label="Interactive global relay server map"
        >
          <defs>
            <radialGradient id="emeraldNodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="cyanNodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="tunnelArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Tactical Graticule Latitude / Longitude Hairlines */}
          <g stroke="#1E293B" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.55">
            {[80, 150, 220, 290, 360].map((y) => (
              <line key={`lat-${y}`} x1="20" y1={y} x2="980" y2={y} />
            ))}
            {[150, 300, 450, 600, 750, 900].map((x) => (
              <line key={`lon-${x}`} x1={x} y1="20" x2={x} y2="430" />
            ))}
          </g>

          {/* Equator & Prime Meridian Reference Hairlines */}
          <line x1="20" y1="235" x2="980" y2="235" stroke="#1E293B" strokeWidth="0.9" opacity="0.75" />
          <line x1="485" y1="20" x2="485" y2="430" stroke="#1E293B" strokeWidth="0.9" opacity="0.75" />

          {/* Stylized High-Precision Continental Landmass Polygons */}
          <g fill="#11161F" stroke="#1E293B" strokeWidth="1.1">
            {/* North America */}
            <path d="M 115 72 L 245 64 L 328 112 L 315 168 L 268 212 L 248 252 L 222 240 L 185 190 L 138 152 Z" />
            {/* Greenland / North Atlantic */}
            <path d="M 345 45 L 418 42 L 405 86 L 352 84 Z" />
            {/* South America */}
            <path d="M 258 258 L 325 276 L 356 332 L 322 418 L 285 424 L 265 348 Z" />
            {/* Europe */}
            <path d="M 448 82 L 548 68 L 598 96 L 585 162 L 525 174 L 466 164 L 452 128 Z" />
            {/* Africa */}
            <path d="M 455 186 L 555 186 L 602 246 L 575 368 L 516 382 L 485 305 L 444 242 Z" />
            {/* Asia */}
            <path d="M 598 78 L 828 74 L 885 135 L 856 226 L 782 268 L 705 248 L 625 196 L 592 146 Z" />
            {/* Japan & Archipelago */}
            <path d="M 838 158 L 862 166 L 855 194 L 834 186 Z" />
            {/* Australia & Oceania */}
            <path d="M 758 318 L 866 312 L 882 378 L 806 396 L 752 365 Z" />
          </g>

          {/* Coordinate System Corner Readouts */}
          <text x="32" y="42" fill="#475569" className="text-[10px] font-mono">
            WGS-84 GEODESIC PROJECTION · NIST SP 800-38D TUNNEL MESH
          </text>
          <text x="32" y="424" fill="#475569" className="text-[10px] font-mono">
            ACTIVE EXIT: {selectedExitNode.coordinates.lat} / {selectedExitNode.coordinates.lon}
          </text>

          {/* Geodesic Encrypted Tunnel Arcs */}
          {!isKillSwitch && (
            <g>
              {isMultiHop ? (
                <>
                  {/* Hop 1: Origin -> Entry Node */}
                  <path
                    d={entryHopPath}
                    fill="none"
                    stroke="#06B6D4"
                    strokeWidth={isConnected ? '2.2' : '1.5'}
                    strokeDasharray={isConnected ? 'none' : '5 5'}
                    opacity={isConnected || isHandshaking ? 0.9 : 0.35}
                  />
                  {/* Hop 2: Entry Node -> Exit Node */}
                  <path
                    d={exitHopPath}
                    fill="none"
                    stroke="url(#tunnelArcGradient)"
                    strokeWidth={isConnected ? '2.6' : '1.5'}
                    strokeDasharray={isConnected ? 'none' : '6 5'}
                    opacity={isConnected || isHandshaking ? 0.95 : 0.35}
                  />
                </>
              ) : (
                <>
                  {/* Single Hop: Origin -> Exit Node */}
                  <path
                    d={singleHopPath}
                    fill="none"
                    stroke={isConnected ? 'url(#tunnelArcGradient)' : '#F59E0B'}
                    strokeWidth={isConnected ? '2.5' : '1.6'}
                    strokeDasharray={isConnected ? 'none' : '6 5'}
                    opacity={isConnected || isHandshaking ? 0.95 : 0.3}
                  />
                </>
              )}
            </g>
          )}

          {/* Origin Marker (Local Unencrypted ISP Point) */}
          <g transform={`translate(${USER_ORIGIN.x}, ${USER_ORIGIN.y})`}>
            <circle r="12" fill="#06B6D4" opacity="0.14" />
            <circle r="4.5" fill="#06B6D4" stroke="#090C10" strokeWidth="1.5" />
            <text
              x="-8"
              y="18"
              textAnchor="end"
              fill="#94A3B8"
              className="text-[10px] font-mono"
            >
              ORIGIN (ISP)
            </text>
          </g>

          {/* Interactive Global Relay Nodes */}
          {nodes.map((node) => {
            const isSelectedExit = node.id === selectedExitNode.id;
            const isSelectedEntry = isMultiHop && node.id === selectedEntryNode.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.coordinates.x}, ${node.coordinates.y})`}
                onClick={() => onSelectExitNode(node)}
                className="cursor-pointer group"
                role="button"
                tabIndex={0}
                aria-label={`Select ${node.city}, ${node.country} relay node (${node.baseLatencyMs}ms)`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectExitNode(node);
                  }
                }}
              >
                {/* Halo for active exit or entry node */}
                {isSelectedExit && (
                  <circle
                    r="22"
                    fill="url(#emeraldNodeGlow)"
                    className="transition-opacity duration-200"
                  />
                )}
                {isSelectedEntry && (
                  <circle
                    r="18"
                    fill="url(#cyanNodeGlow)"
                    className="transition-opacity duration-200"
                  />
                )}

                {/* Outer Target Ring */}
                <circle
                  r={isSelectedExit ? 8.5 : isSelectedEntry ? 7.5 : 5.5}
                  fill="none"
                  stroke={
                    isSelectedExit
                      ? '#10B981'
                      : isSelectedEntry
                      ? '#06B6D4'
                      : '#475569'
                  }
                  strokeWidth={isSelectedExit || isSelectedEntry ? '1.6' : '1'}
                />

                {/* Core Pin */}
                <circle
                  r={isSelectedExit ? 4.5 : isSelectedEntry ? 4 : 3}
                  fill={
                    isSelectedExit
                      ? '#10B981'
                      : isSelectedEntry
                      ? '#06B6D4'
                      : '#94A3B8'
                  }
                />

                {/* Node Callout Label */}
                <g
                  transform={`translate(10, ${
                    node.id === 'nl-ams-03'
                      ? -8
                      : node.id === 'de-fra-04'
                      ? 4
                      : node.id === 'ch-zrh-01'
                      ? 14
                      : 3
                  })`}
                >
                  <text
                    fill={
                      isSelectedExit
                        ? '#10B981'
                        : isSelectedEntry
                        ? '#06B6D4'
                        : '#CBD5E1'
                    }
                    className="text-[10px] font-mono font-medium"
                  >
                    {node.code} · {node.baseLatencyMs}ms
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Bottom-Left Map Legend Overlay (Clean Hairline Box) */}
        <div className="absolute bottom-3 left-4 bg-[#11161F]/90 border border-[#1E293B] rounded px-3 py-2 flex items-center gap-4 text-[11px] text-[#94A3B8] font-mono tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4] inline-block" />
            <span>Origin / Entry Hop</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
            <span>AES-256 Exit Node ({selectedExitNode.code})</span>
          </span>
          <button
            type="button"
            onClick={onRotateKey}
            className="text-[#10B981] hover:underline cursor-pointer ml-1"
          >
            Rotate 256-Bit Key ({sessionMaterial?.rotationCount ?? 1}x)
          </button>
        </div>
      </div>

      {/* Bottom Live Dual-Stream Encrypted Throughput & Packet Telemetry */}
      <div className="border-t border-[#1E293B] bg-[#11161F] px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-xs font-semibold text-[#F1F5F9]">
              AES-256-GCM Encrypted Tunnel Throughput (60s Rolling Window)
            </h3>
            <p className="text-[11px] text-[#94A3B8] font-mono tabular-nums mt-0.5">
              Authenticated Ephemeral Key {sessionMaterial?.keyId ?? 'K256'} · SHA-384 Digest:{' '}
              {sessionMaterial?.sha384Fingerprint.slice(0, 20) ?? '—'}...
            </p>
          </div>

          {/* Live Numeric Readouts (Tabular Numerals) */}
          <div className="flex items-center gap-6 font-mono tabular-nums">
            <div>
              <div className="text-[11px] text-[#94A3B8]">Downlink Stream</div>
              <div className="text-sm font-semibold text-[#10B981]">
                {isConnected ? `${latestPoint.downMbps.toFixed(1)} Mbps` : '0.0 Mbps'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#94A3B8]">Uplink Stream</div>
              <div className="text-sm font-semibold text-[#06B6D4]">
                {isConnected ? `${latestPoint.upMbps.toFixed(1)} Mbps` : '0.0 Mbps'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#94A3B8]">Session Encrypted</div>
              <div className="text-sm font-semibold text-[#F1F5F9]">
                {(totalDownMb + totalUpMb).toFixed(2)} MB
              </div>
            </div>
            <div className="hidden xl:block">
              <div className="text-[11px] text-[#94A3B8]">GCM Packets Verified</div>
              <div className="text-sm font-semibold text-[#F1F5F9]">
                {totalEncryptedPackets.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* SVG Dual-Stream Area Chart */}
        <div className="h-[92px] w-full bg-[#090C10] border border-[#1E293B] rounded overflow-hidden relative">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="downAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            <line x1="0" y1="28" x2={chartWidth} y2="28" stroke="#1E293B" strokeWidth="0.7" strokeDasharray="3 3" />
            <line x1="0" y1="56" x2={chartWidth} y2="56" stroke="#1E293B" strokeWidth="0.7" strokeDasharray="3 3" />
            <line x1="0" y1="84" x2={chartWidth} y2="84" stroke="#1E293B" strokeWidth="0.7" strokeDasharray="3 3" />

            {downAreaPath && <path d={downAreaPath} fill="url(#downAreaFill)" />}

            {downPoints && (
              <polyline
                fill="none"
                stroke="#10B981"
                strokeWidth="1.8"
                points={downPoints}
              />
            )}

            {upPoints && (
              <polyline
                fill="none"
                stroke="#06B6D4"
                strokeWidth="1.4"
                strokeDasharray="3 2"
                points={upPoints}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
