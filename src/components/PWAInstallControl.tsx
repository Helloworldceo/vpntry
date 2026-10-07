import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, WifiOff, QrCode } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface PWAInstallControlProps {
  onOpenQrModal: () => void;
}

export const PWAInstallControl: React.FC<PWAInstallControlProps> = ({
  onOpenQrModal,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isInstalled ? (
          <div className="flex-1 py-2 px-3 text-xs font-medium text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 rounded flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Installed as Standalone App</span>
          </div>
        ) : isInstallable ? (
          <button
            type="button"
            onClick={install}
            className="flex-1 py-2 px-3 text-xs font-medium text-[#090C10] bg-[#10B981] hover:bg-[#059669] rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Install App on Device</span>
          </button>
        ) : isIOS ? (
          <button
            type="button"
            onClick={() => setShowIOSInstructions((prev) => !prev)}
            className="flex-1 py-2 px-3 text-xs font-medium text-[#F1F5F9] bg-[#11161F] hover:bg-[#18202C] border border-[#1E293B] rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <span>Install on iPhone / iPad</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenQrModal}
            className="flex-1 py-2 px-3 text-xs font-medium text-[#F1F5F9] bg-[#11161F] hover:bg-[#18202C] border border-[#1E293B] rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <QrCode className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <span>Phone QR &amp; Laptop App</span>
          </button>
        )}
      </div>

      {showIOSInstructions && (
        <div className="p-3 bg-[#090C10] border border-[#1E293B] rounded text-[11px] text-[#CBD5E1] space-y-1">
          <div className="font-semibold text-[#10B981]">
            iOS Safari Home Screen Install:
          </div>
          <p>
            1. Tap the <strong>Share</strong> icon in the bottom Safari bar.
          </p>
          <p>
            2. Select <strong>Add to Home Screen</strong> to launch Helvetia VPN full-screen.
          </p>
        </div>
      )}
    </div>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#090C10] shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Local Web Crypto AES-256 Engine Active</span>
    </div>
  );
};
