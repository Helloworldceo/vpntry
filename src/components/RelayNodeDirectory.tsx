import React, { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { RelayNode, ConnectionState } from '../types/vpn';

interface RelayNodeDirectoryProps {
  nodes: RelayNode[];
  selectedExitNode: RelayNode;
  selectedEntryNode: RelayNode;
  multiHopEnabled: boolean;
  ramOnlyStrict: boolean;
  connectionState: ConnectionState;
  onSelectExitNode: (node: RelayNode) => void;
}

type NodeFilter = 'all' | 'ram-only' | 'multihop' | 'low-latency';

export const RelayNodeDirectory: React.FC<RelayNodeDirectoryProps> = ({
  nodes,
  selectedExitNode,
  selectedEntryNode,
  multiHopEnabled,
  ramOnlyStrict,
  connectionState,
  onSelectExitNode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<NodeFilter>('all');
  const [sortBy, setSortBy] = useState<'latency' | 'load'>('latency');

  const filteredNodes = useMemo(() => {
    return nodes
      .filter((node) => {
        if (ramOnlyStrict && !node.ramOnlyDiskless) return false;
        if (activeFilter === 'ram-only' && !node.ramOnlyDiskless) return false;
        if (activeFilter === 'multihop' && !node.multiHopCapable) return false;
        if (activeFilter === 'low-latency' && node.baseLatencyMs > 30) return false;

        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          return (
            node.city.toLowerCase().includes(q) ||
            node.country.toLowerCase().includes(q) ||
            node.code.toLowerCase().includes(q) ||
            node.region.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) =>
        sortBy === 'latency'
          ? a.baseLatencyMs - b.baseLatencyMs
          : a.loadPercent - b.loadPercent
      );
  }, [nodes, searchQuery, activeFilter, sortBy, ramOnlyStrict]);

  return (
    <aside className="w-full lg:w-[360px] shrink-0 bg-[#11161F] border-t lg:border-t-0 lg:border-l border-[#1E293B] flex flex-col h-full overflow-hidden">
      {/* Directory Header & Search Input */}
      <div className="p-4 border-b border-[#1E293B] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">
             Bare-Metal Relay Directory
          </h2>
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span>Sort:</span>
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'latency' ? 'load' : 'latency')}
              className="text-[#F1F5F9] hover:text-[#10B981] font-mono underline cursor-pointer"
            >
              {sortBy === 'latency' ? 'Latency (ms)' : 'Load (%)'}
            </button>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, country, or code (e.g. CH-ZRH)..."
            aria-label="Search relay nodes"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#090C10] border border-[#1E293B] rounded text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
          />
        </div>

        {/* Interactive Segmented Filter Controls */}
        <div className="flex items-center gap-1 p-1 bg-[#090C10] rounded border border-[#1E293B]">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'ram-only', label: 'RAM-Only' },
              { id: 'multihop', label: 'Multi-Hop' },
              { id: 'low-latency', label: '< 30ms' },
            ] as { id: NodeFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`flex-1 py-1 px-2 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#18202C] text-[#F1F5F9]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Node List (Zero-Pill Metadata Discipline) */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
        {filteredNodes.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-[#94A3B8]">
              No relay nodes match your current filter criteria.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="px-3 py-1.5 text-xs font-medium text-[#090C10] bg-[#10B981] rounded cursor-pointer"
            >
              Reset Node Filters
            </button>
          </div>
        ) : (
          filteredNodes.map((node) => {
            const isSelected = node.id === selectedExitNode.id;
            const isEntry = multiHopEnabled && node.id === selectedEntryNode.id;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectExitNode(node)}
                className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-[#18202C] border-l-2 border-l-[#10B981]'
                    : 'hover:bg-[#18202C]/60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#F1F5F9] truncate">
                      {node.city}, {node.country}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    )}
                  </div>

                  {/* Unboxed Inline Metadata with Typographic Dot Separators */}
                  <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] font-mono mt-0.5 truncate">
                    <span className="text-[#CBD5E1]">{node.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{node.ramOnlyDiskless ? 'RAM-Only' : 'Standard'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{node.bandwidthGbps}G</span>
                    {isEntry && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#06B6D4]">Entry Hop</span>
                      </>
                    )}
                  </div>

                  <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                    {node.jurisdictionNote}
                  </div>
                </div>

                {/* Right-Aligned Tabular Numerals for Latency & Load */}
                <div className="text-right font-mono tabular-nums shrink-0">
                  <div
                    className={`text-xs font-semibold ${
                      node.baseLatencyMs <= 25
                        ? 'text-[#10B981]'
                        : node.baseLatencyMs <= 55
                        ? 'text-[#F1F5F9]'
                        : 'text-[#F59E0B]'
                    }`}
                  >
                    {node.baseLatencyMs} ms
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">
                    {node.loadPercent}% load
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Directory Summary */}
      <div className="px-4 py-2.5 border-t border-[#1E293B] bg-[#090C10] flex items-center justify-between text-[11px] text-[#94A3B8] font-mono tabular-nums">
        <span>Showing {filteredNodes.length} of {nodes.length} relays</span>
        <span>
          {connectionState === 'connected'
            ? `Active: ${selectedExitNode.code}`
            : 'Tunnel Standby'}
        </span>
      </div>
    </aside>
  );
};
