import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Home, Music, Headphones, Wallet,
  Radio, ShoppingBag, Calendar, LayoutDashboard,
  Menu, X, ChevronLeft, LogOut, User, Compass, Rocket, Mic, Bell, Shield, Disc3, Scale, Trophy,
  CreditCard, FileText, Settings, Banknote, Gavel, Network, Crown, Newspaper, Award, ListChecks, FlaskConical,
  MessageSquareText, SplitSquareHorizontal, LifeBuoy, KeyRound,
  CheckCircle, Circle, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import QRScanButton from '@/components/pwa/QRScanButton';
import WaveformBar from './WaveformBar';
import { getRoleLabel, isRoleVerified } from '@/lib/userRoles';
import { hasPermission, isMasterAdmin } from '@/lib/staffRoles';

// ── Helpers ──────────────────────────────────────────────────────────

function isInternalAdmin(user) {
  if (!user) return false;
  if (['admin', 'master_admin'].includes(user.role)) return true;
  return Array.isArray(user.admin_roles) && user.admin_roles.length > 0;
}

function getPublicRoles(user) {
  if (!user) return [];
  const roles = [];
  if (user.role && !['admin', 'master_admin'].includes(user.role)) roles.push(user.role);
  if (Array.isArray(user.additional_roles)) roles.push(...user.additional_roles);
  return roles;
}

// ── Navigation config ─────────────────────────────────────────────────
// Each item may have:
//   roles: []           — public roles that can see this link
//   anyPermission: []   — admin permission keys (any match grants visibility)
//   masterOnly: true    — only the Master Administrator sees this

const FAN_DASHBOARD_ROLES = ['fan', 'artist', 'community_manager', 'discovery_partner'];

const NAV_SECTIONS = [
  {
    id: 'discover',
    label: 'Discover',
    items: [
      { path: '/', icon: Home, label: 'The Pulse' },
      { path: '/frequencies', icon: Radio, label: 'Frequencies' },
      { path: '/artists', icon: Music, label: 'Artists' },
      { path: '/playlists', icon: Headphones, label: 'Playlists' },
      { path: '/events', icon: Calendar, label: 'Events' },
      { path: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
      { path: '/discovery-partners', icon: Compass, label: 'Discovery' },
      { path: '/breakout-artists', icon: Rocket, label: 'Breakout Artists' },
      { path: '/frequency-graph', icon: Network, label: 'Frequency Graph' },
      { path: '/heard-first', icon: Headphones, label: 'Heard First' },
      { path: '/hall-of-discovery', icon: Trophy, label: 'Hall of Discovery' },
      { path: '/my-life-awards', icon: Award, label: 'My Life Awards™' },
    ],
  },
  {
    id: 'my-content',
    label: 'My Content',
    items: [
      { path: '/artist-dashboard', icon: Music, label: 'Artist Dashboard', roles: ['artist'] },
      { path: '/catalog', icon: Disc3, label: 'Catalog Manager', roles: ['artist'] },
      { path: '/rights-management', icon: Scale, label: 'Rights Management', roles: ['artist'] },
      { path: '/payouts', icon: Banknote, label: 'Payout Dashboard', roles: ['artist'] },
      { path: '/collaborator-dashboard', icon: SplitSquareHorizontal, label: 'Collaborator Dashboard', roles: ['fan', 'artist'] },
      { path: '/discovery-partner-dashboard', icon: Compass, label: 'Discovery Dashboard', roles: ['discovery_partner'] },
      { path: '/radio-programmer-dashboard', icon: Mic, label: 'Radio Portal', roles: ['radio_programmer'] },
      { path: '/business-partner-dashboard', icon: Building2, label: 'Partner Dashboard', roles: ['business_partner'] },
    ],
  },
  {
    id: 'my-account',
    label: 'My Account',
    items: [
      { path: '/onboarding', icon: ListChecks, label: 'Getting Started' },
      { path: '/fan-dashboard', icon: LayoutDashboard, label: 'Fan Dashboard', roles: FAN_DASHBOARD_ROLES },
      { path: '/wallet', icon: Wallet, label: 'Wallet', roles: FAN_DASHBOARD_ROLES },
      { path: '/pricing', icon: CreditCard, label: 'Pricing & Plans' },
      { path: '/notification-settings', icon: Bell, label: 'Notifications' },
      { path: '/security', icon: Shield, label: 'Security' },
      { path: '/help', icon: LifeBuoy, label: 'Help & Guide' },
      { path: '/legal', icon: FileText, label: 'Legal & Policies' },
    ],
  },
  {
    id: 'admin-tools',
    label: 'Admin Tools',
    items: [
      { path: '/platform-operations', icon: Settings, label: 'Platform Operations', anyPermission: ['platform_settings', 'view_platform_analytics', 'review_platform_activity', 'view_only_dashboards'] },
      { path: '/artist-management', icon: Mic, label: 'Artist Accounts', anyPermission: ['manage_user_reports', 'approve_routine_content'] },
      { path: '/staff-management', icon: KeyRound, label: 'Staff & Permissions', masterOnly: true },
      { path: '/launch-readiness', icon: Rocket, label: 'Launch Readiness', masterOnly: true },
      { path: '/beta-control', icon: FlaskConical, label: 'Beta Control Center', masterOnly: true },
      { path: '/beta-feedback', icon: MessageSquareText, label: 'Beta Feedback Log', anyPermission: ['review_platform_activity', 'view_platform_analytics'] },
      { path: '/moderation-queue', icon: Gavel, label: 'Moderation Queue', anyPermission: ['manage_user_reports', 'approve_routine_content'] },
      { path: '/journalist-portal', icon: Newspaper, label: 'Editorial Portal', anyPermission: ['create_articles', 'edit_submitted_articles', 'publish_approved_content'] },
      { path: '/radio-verification-review', icon: Shield, label: 'Radio Verification', anyPermission: ['radio_programmer_verification'] },
      { path: '/business-partner-review', icon: Building2, label: 'Partner Review', anyPermission: ['business_partner_applications'] },
      { path: '/admin-partner-dashboard', icon: Crown, label: 'Admin Partner Dashboard', roles: ['admin_partner'] },
    ],
  },
];

// ── Visibility filters ────────────────────────────────────────────────

function canSeePublicItem(item, user) {
  if (!user) return false;
  if (!item.roles) return true;
  const publicRoles = getPublicRoles(user);
  // Internal admins with no public roles don't see fan/artist dashboards
  if (isInternalAdmin(user) && publicRoles.length === 0) return false;
  return item.roles.some((r) => publicRoles.includes(r));
}

function canSeeAdminTool(item, user) {
  if (!user) return false;
  // Master Admin / legacy Admin sees every admin tool
  if (isMasterAdmin(user) || user.role === 'admin') return true;
  // Master-only tools: no one else sees them
  if (item.masterOnly) return false;
  // Admin Partner Dashboard: show to admin_partner role
  if (item.path === '/admin-partner-dashboard') {
    return user.role === 'admin_partner';
  }
  // Admin partners see basic admin tools (pages gate internally by partner permissions)
  if (user.role === 'admin_partner') {
    return ['/platform-operations', '/moderation-queue', '/beta-feedback'].includes(item.path);
  }
  // Other internal admin roles: gate by permission
  if (!isInternalAdmin(user)) return false;
  if (item.anyPermission) {
    return item.anyPermission.some((p) => hasPermission(user, p));
  }
  if (item.roles) {
    return item.roles.some((r) => user.role === r || (user.admin_roles || []).includes(r));
  }
  return true;
}

// ── NavLink component ─────────────────────────────────────────────────

const NavLink = React.memo(function NavLink({ item, isActive, collapsed, onClick }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
        ${isActive(item.path)
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
        }`}
    >
      {isActive(item.path) && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
      )}
      <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive(item.path) ? 'text-primary' : ''}`} />
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
      {isActive(item.path) && !collapsed && (
        <WaveformBar count={3} className="ml-auto" color="bg-primary" />
      )}
    </Link>
  );
});

const WAVEFORM_HEIGHTS = Array.from({ length: 16 }, (_, i) => 4 + ((i * 7 + 3) % 10));

// ── Sidebar component ─────────────────────────────────────────────────

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const isActive = (path) => location.pathname === path;
  const handleNavClick = () => setMobileOpen(false);

  const visibleSections = useMemo(() => {
    return NAV_SECTIONS.map((section) => {
      let items;
      if (section.id === 'admin-tools') {
        if (!isInternalAdmin(user)) items = [];
        else items = section.items.filter((item) => canSeeAdminTool(item, user));
      } else {
        items = section.items.filter((item) => canSeePublicItem(item, user));
      }
      return { ...section, items };
    }).filter((section) => section.items.length > 0);
  }, [user]);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden text-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-40 bg-card/95 backdrop-blur-xl border-r border-border
        transition-all duration-300 flex flex-col
        ${collapsed ? 'w-[72px]' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 h-16 border-b border-border`}>
          {!collapsed && <Logo size="small" />}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-muted-foreground hover:text-foreground w-8 h-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleSections.map((section, sectionIndex) => (
            <React.Fragment key={section.id}>
              {sectionIndex > 0 && <div className="my-3 border-t border-border" />}
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-3 mb-2 font-semibold">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <NavLink key={item.path} item={item} isActive={isActive} collapsed={collapsed} onClick={handleNavClick} />
              ))}
              {section.id === 'discover' && (
                <div className={`mt-1 ${collapsed ? 'flex justify-center' : 'px-3'}`}>
                  <QRScanButton variant="ghost" size="default" label={collapsed ? null : 'Scan to Connect'}
                    className={`w-full justify-start gap-3 px-3 py-2 rounded-lg text-sm font-normal text-muted-foreground hover:text-foreground hover:bg-accent/40 ${collapsed ? 'w-9 h-9 p-0' : ''}`}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-3 border-t border-border space-y-2">
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/30">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{user.full_name || 'Fan'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground truncate">{getRoleLabel(user.role)}</span>
                  {isRoleVerified(user, user.role) ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-green-500 font-medium">
                      <CheckCircle className="w-2.5 h-2.5" /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/50">
                      <Circle className="w-2.5 h-2.5" /> Unverified
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => base44.auth.logout()}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
          <div className="flex items-center justify-center gap-[2px] pt-1">
            {Array.from({ length: collapsed ? 5 : 16 }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full bg-gradient-to-t from-neon-purple to-neon-cyan animate-waveform"
                style={{ animationDelay: `${i * 0.1}s`, height: `${WAVEFORM_HEIGHTS[i % WAVEFORM_HEIGHTS.length]}px` }}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}