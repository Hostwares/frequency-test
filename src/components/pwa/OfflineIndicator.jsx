import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed top-14 lg:top-0 left-1/2 -translate-x-1/2 z-50 mt-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/40 text-yellow-500 text-xs font-medium shadow-lg">
        <WifiOff className="w-3.5 h-3.5" />
        You're offline — some features are unavailable. Recently viewed content remains accessible.
      </div>
    </div>
  );
}