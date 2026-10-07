/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  ConnectionState,
  CryptoSessionMaterial,
  PrivacySettings,
  RelayNode,
  TelemetryPoint,
} from './types/vpn';
import { RELAY_NODES } from './data/relayNodes';
import { generateAes256SessionKey } from './utils/cryptoEngine';
import { TopBar } from './components/TopBar';
import { ConnectionCommandRail } from './components/ConnectionCommandRail';
import { GlobalRouteMap } from './components/GlobalRouteMap';
import { RelayNodeDirectory } from './components/RelayNodeDirectory';
import { Aes256InspectorView } from './components/Aes256InspectorView';
import { PrivacyShieldView } from './components/PrivacyShieldView';
import { ConfigExportModal } from './components/ConfigExportModal';
import { OfflineIndicator } from './components/PWAInstallControl';

const INITIAL_TELEMETRY: TelemetryPoint[] = Array.from({ length: 36 }, (_, idx) => ({
  timestamp: Date.now() - (36 - idx) * 1000,
  downMbps: 145 + Math.sin(idx * 0.4) * 42,
  upMbps: 38 + Math.cos(idx * 0.35) * 14,
  encryptedPackets: 420,
}));

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('network');
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [handshakeStep, setHandshakeStep] = useState<number>(4);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(142);

  // Default Exit: Zurich, Switzerland (CH-ZRH-01); Default Entry for Multi-Hop: Reykjavik, Iceland (IS-RKV-01)
  const [selectedExitNode, setSelectedExitNode] = useState<RelayNode>(RELAY_NODES[0]);
  const [selectedEntryNode, setSelectedEntryNode] = useState<RelayNode>(RELAY_NODES[1]);

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    cipherSuite: 'AES-256-GCM',
    protocol: 'OpenVPN-UDP-1194',
    multiHop: false,
    dnsOverHttps: true,
    ipv6LeakProtection: true,
    webrtcBlock: true,
    stealthObfs4: false,
    ramOnlyStrict: false,
    autoKeyRotationMinutes: 30,
  });

  const [sessionMaterial, setSessionMaterial] = useState<CryptoSessionMaterial | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(INITIAL_TELEMETRY);
  const [totalDownMb, setTotalDownMb] = useState<number>(418.4);
  const [totalUpMb, setTotalUpMb] = useState<number>(94.2);
  const [totalEncryptedPackets, setTotalEncryptedPackets] = useState<number>(319480);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Generate real 256-bit AES-GCM key via Web Crypto API on initial mount
  const rotateSessionKey = useCallback(async () => {
    const nextMaterial = await generateAes256SessionKey(
      sessionMaterial?.rotationCount ?? 0
    );
    setSessionMaterial(nextMaterial);
  }, [sessionMaterial?.rotationCount]);

  useEffect(() => {
    generateAes256SessionKey(0).then(setSessionMaterial);
  }, []);

  // Run 4-stage cryptographic handshake sequence
  const triggerHandshakeToConnected = useCallback(async () => {
    setConnectionState('handshaking');
    setHandshakeStep(1);

    const nextKey = await generateAes256SessionKey(
      sessionMaterial?.rotationCount ?? 0
    );
    setSessionMaterial(nextKey);

    setTimeout(() => setHandshakeStep(2), 160);
    setTimeout(() => setHandshakeStep(3), 320);
    setTimeout(() => setHandshakeStep(4), 480);
    setTimeout(() => {
      setConnectionState('connected');
      setUptimeSeconds(0);
    }, 640);
  }, [sessionMaterial?.rotationCount]);

  const handleToggleConnect = () => {
    if (connectionState === 'connected' || connectionState === 'handshaking') {
      setConnectionState('disconnected');
      setHandshakeStep(0);
    } else {
      triggerHandshakeToConnected();
    }
  };

  const handleToggleKillSwitch = () => {
    if (connectionState === 'killswitch') {
      triggerHandshakeToConnected();
    } else {
      setConnectionState('killswitch');
      setHandshakeStep(0);
    }
  };

  const handleSelectExitNode = (node: RelayNode) => {
    setSelectedExitNode(node);
    if (node.id === selectedEntryNode.id) {
      const fallbackEntry = RELAY_NODES.find(
        (n) => n.multiHopCapable && n.id !== node.id
      );
      if (fallbackEntry) setSelectedEntryNode(fallbackEntry);
    }
    if (connectionState === 'connected') {
      triggerHandshakeToConnected();
    }
  };

  const handleUpdatePrivacySettings = (partial: Partial<PrivacySettings>) => {
    setPrivacySettings((prev) => ({ ...prev, ...partial }));
  };

  // Rolling 1-second telemetry & uptime ticker
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionState === 'connected') {
        setUptimeSeconds((prev) => prev + 1);

        const jitterDown = Math.max(
          48,
          Math.min(
            395,
            168 +
              (Math.random() - 0.48) * 75 -
              selectedExitNode.baseLatencyMs * 0.45
          )
        );
        const jitterUp = Math.max(
          16,
          Math.min(140, 44 + (Math.random() - 0.48) * 26)
        );
        const newPackets = Math.floor((jitterDown + jitterUp) * 14);

        setTelemetry((prev) => [
          ...prev.slice(1),
          {
            timestamp: Date.now(),
            downMbps: jitterDown,
            upMbps: jitterUp,
            encryptedPackets: newPackets,
          },
        ]);

        setTotalDownMb((prev) => prev + jitterDown / 8);
        setTotalUpMb((prev) => prev + jitterUp / 8);
        setTotalEncryptedPackets((prev) => prev + newPackets);
      } else {
        setTelemetry((prev) => [
          ...prev.slice(1),
          {
            timestamp: Date.now(),
            downMbps: 0,
            upMbps: 0,
            encryptedPackets: 0,
          },
        ]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionState, selectedExitNode.baseLatencyMs]);

  return (
    <div id="top" className="min-h-screen lg:h-screen flex flex-col bg-[#090C10] text-[#F1F5F9] overflow-x-hidden">
      {/* Top Bar Contract (3 Zones: Wordmark, 3 View Tabs, 2 Actions) */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        connectionState={connectionState}
        onToggleKillSwitch={handleToggleKillSwitch}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Primary Workspace Viewport */}
      {activeTab === 'network' && (
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Rail: Connection Command & Multi-Hop Controls */}
          <ConnectionCommandRail
            connectionState={connectionState}
            handshakeStep={handshakeStep}
            uptimeSeconds={uptimeSeconds}
            selectedExitNode={selectedExitNode}
            selectedEntryNode={selectedEntryNode}
            allNodes={RELAY_NODES}
            privacySettings={privacySettings}
            sessionMaterial={sessionMaterial}
            onToggleConnect={handleToggleConnect}
            onToggleMultiHop={() =>
              handleUpdatePrivacySettings({ multiHop: !privacySettings.multiHop })
            }
            onSelectEntryNode={setSelectedEntryNode}
            onRotateKey={rotateSessionKey}
            onOpenQrModal={() => setIsExportModalOpen(true)}
          />

          {/* Center Stage: Interactive SVG Global Routing Map & Telemetry */}
          <section className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <GlobalRouteMap
              nodes={RELAY_NODES}
              selectedExitNode={selectedExitNode}
              selectedEntryNode={selectedEntryNode}
              connectionState={connectionState}
              privacySettings={privacySettings}
              telemetry={telemetry}
              totalDownMb={totalDownMb}
              totalUpMb={totalUpMb}
              totalEncryptedPackets={totalEncryptedPackets}
              sessionMaterial={sessionMaterial}
              onSelectExitNode={handleSelectExitNode}
              onSelectEntryNode={setSelectedEntryNode}
              onRotateKey={rotateSessionKey}
              onInspectCipher={() => setActiveTab('inspector')}
            />
          </section>

          {/* Right Rail: Bare-Metal Relay Node Directory */}
          <RelayNodeDirectory
            nodes={RELAY_NODES}
            selectedExitNode={selectedExitNode}
            selectedEntryNode={selectedEntryNode}
            multiHopEnabled={privacySettings.multiHop}
            ramOnlyStrict={privacySettings.ramOnlyStrict}
            connectionState={connectionState}
            onSelectExitNode={handleSelectExitNode}
          />
        </main>
      )}

      {activeTab === 'inspector' && (
        <Aes256InspectorView
          sessionMaterial={sessionMaterial}
          privacySettings={privacySettings}
          selectedExitNode={selectedExitNode}
          onRotateKey={rotateSessionKey}
        />
      )}

      {activeTab === 'privacy' && (
        <PrivacyShieldView
          privacySettings={privacySettings}
          selectedExitNode={selectedExitNode}
          sessionMaterial={sessionMaterial}
          onUpdateSettings={handleUpdatePrivacySettings}
        />
      )}

      {/* Export .ovpn Profile & Phone QR Sync Modal */}
      <ConfigExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedExitNode={selectedExitNode}
        selectedEntryNode={selectedEntryNode}
        privacySettings={privacySettings}
        sessionMaterial={sessionMaterial}
      />

      <OfflineIndicator />
    </div>
  );
}
