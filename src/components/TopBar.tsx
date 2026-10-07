import React from 'react';
import { ShieldOff, Download, Lock } from 'lucide-react';
import { ActiveTab, ConnectionState } from '../types/vpn';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  connectionState: ConnectionState;
  onToggleKillSwitch: () => void;
  onOpenExportModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  connectionState,
  onToggleKillSwitch,
  onOpenExportModal,
}) => {
  const isKillSwitch = connectionState === 'killswitch';

  return (
    <header className="h-[60px] shrink-0 flex items-center justify-between px-6 bg-[#090C10] border-b border-[#1E293B]">
      {/* Zone 1: Brand Title — Single Text Element per Top Bar Contract */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('network');
        }}
        className="font-display text-lg font-bold tracking-tight text-[#F1F5F9] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
      >
        Helvetia VPN
      </a>

      {/* Zone 2: Clean Single-Line Navigation Links */}
      <nav aria-label="Primary Workspace Views" className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => onSelectTab('network')}
          className={`py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'network'
              ? 'border-[#10B981] text-[#F1F5F9]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          Network Map
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('inspector')}
          className={`py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'inspector'
              ? 'border-[#10B981] text-[#F1F5F9]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          AES-256 Inspector
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('privacy')}
          className={`py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'privacy'
              ? 'border-[#10B981] text-[#F1F5F9]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          Privacy Shield
        </button>
      </nav>

      {/* Zone 3: 2 Primary Actions (Emergency Kill Switch + Export Config) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleKillSwitch}
          className={`px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
            isKillSwitch
              ? 'bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/25'
              : 'bg-[#11161F] border-[#1E293B] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#334155]'
          }`}
          title="Emergency Network Lock: Immediately blocks all non-tunnel traffic"
        >
          {isKillSwitch ? (
            <>
              <ShieldOff className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Kill Switch Engaged</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Kill Switch: Armed</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenExportModal}
          className="px-4 py-2 text-xs font-medium text-[#090C10] bg-[#10B981] hover:bg-[#059669] rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Phone QR &amp; Export</span>
        </button>
      </div>
    </header>
  );
};
