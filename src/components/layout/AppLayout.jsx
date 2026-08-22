import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MiniPlayer from '@/components/player/MiniPlayer';
import FullPlayer from '@/components/player/FullPlayer';
import SearchBar from '@/components/shared/SearchBar';
import BetaStatusBadge from '@/components/admin/beta/BetaStatusBadge';
import SmartInstallPrompt from '@/components/pwa/SmartInstallPrompt';
import OfflineIndicator from '@/components/pwa/OfflineIndicator';
import BetaFeedbackWidget from '@/components/shared/BetaFeedbackWidget';
import QRScanButton from '@/components/pwa/QRScanButton';
import DashboardSwitcher from '@/components/layout/DashboardSwitcher';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pb-20">
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/30 pl-14 pr-4 py-2.5 lg:pl-4 lg:pr-4 flex items-center gap-3">
          <DashboardSwitcher />
          <SearchBar />
          <QRScanButton />
          <BetaStatusBadge />
        </div>
        <OfflineIndicator />
        <Outlet />
      </main>
      <MiniPlayer />
      <FullPlayer />
      <SmartInstallPrompt />
      <BetaFeedbackWidget />
    </div>
  );
}