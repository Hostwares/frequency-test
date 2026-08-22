import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, Music, Compass, Mic, Building2, Settings,
  Newspaper, Crown, SplitSquareHorizontal, Wallet,
  ChevronDown, Check,
} from 'lucide-react';
import { getAvailableDashboards } from '@/lib/roleDashboards';
import { cn } from '@/lib/utils';

const DASHBOARD_ICONS = {
  '/fan-dashboard': LayoutDashboard,
  '/artist-dashboard': Music,
  '/discovery-partner-dashboard': Compass,
  '/radio-programmer-dashboard': Mic,
  '/business-partner-dashboard': Building2,
  '/platform-operations': Settings,
  '/journalist-portal': Newspaper,
  '/admin-partner-dashboard': Crown,
  '/collaborator-dashboard': SplitSquareHorizontal,
  '/wallet': Wallet,
};

export default function DashboardSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const dashboards = user ? getAvailableDashboards(user) : [];

  // Only show the switcher if the user has more than one dashboard
  if (dashboards.length <= 1) return null;

  const currentDashboard = dashboards.find((d) =>
    location.pathname === d.path || (d.path !== '/' && location.pathname.startsWith(d.path))
  ) || dashboards[0];

  const handleSelect = (path) => {
    setOpen(false);
    navigate(path);
  };

  const CurrentIcon = DASHBOARD_ICONS[currentDashboard?.path] || LayoutDashboard;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary border border-border text-sm font-medium transition-colors"
      >
        <CurrentIcon className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline max-w-[140px] truncate">{currentDashboard?.label}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold border-b border-border">
              Switch Dashboard
            </div>
            <div className="py-1 max-h-[300px] overflow-y-auto">
              {dashboards.map((dash) => {
                const Icon = DASHBOARD_ICONS[dash.path] || LayoutDashboard;
                const isActive = dash.path === currentDashboard?.path;
                return (
                  <button
                    key={dash.path}
                    onClick={() => handleSelect(dash.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-secondary/60'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{dash.label}</div>
                      <div className="text-[10px] text-muted-foreground capitalize truncate">
                        {dash.roleLabel.replace(/_/g, ' ')}
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}