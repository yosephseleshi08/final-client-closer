import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/90 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-2xl border border-amber-300 animate-bounce">
      <WifiOff className="h-4 w-4 text-slate-950 shrink-0" />
      <div className="flex items-center gap-1.5">
        <span>Offline Mode</span>
        <span className="opacity-75">•</span>
        <span className="flex items-center gap-1 text-[11px] font-normal">
          <Database className="h-3 w-3 inline" /> Local storage active. All data saved.
        </span>
      </div>
    </div>
  );
};
