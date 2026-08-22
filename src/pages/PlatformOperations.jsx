import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Users, Music, Radio, DollarSign, Shield, BarChart3, FileText,
  Settings, AlertTriangle, TrendingUp, Headphones, MessageSquare,
  Gavel, Crown, Activity, Compass, Mic, Copyright, Lock, CreditCard,
  Loader2, Image as ImageIcon, Newspaper, Trophy, Megaphone, Vote, KeyRound, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import SecurityCenter from '@/components/admin/SecurityCenter';
import PaymentGatewayManager from '@/components/admin/PaymentGatewayManager';
import AnalyticsPanel from '@/components/admin/AnalyticsPanel';
import CopyrightPanel from '@/components/admin/CopyrightPanel';
import ModerationPortal from '@/components/admin/ModerationPortal';
import AdminPartnerManager from '@/components/admin/AdminPartnerManager';
import AdminPartnerEarnings from '@/components/admin/AdminPartnerEarnings';
import AdminAuditLog from '@/components/admin/AdminAuditLog';
import HeroBannerManager from '@/components/admin/HeroBannerManager';
import EditorialReviewPanel from '@/components/admin/EditorialReviewPanel';
import AcademyCommitteePanel from '@/components/admin/AcademyCommitteePanel';
import PitchReadyManager from '@/components/admin/PitchReadyManager';
import DefaultArtistsManager from '@/components/admin/DefaultArtistsManager';
import BoardOfGovernorsDashboard from '@/components/admin/BoardOfGovernorsDashboard';
import AcademyVotingTally from '@/components/admin/AcademyVotingTally';
import CeremonySettingsManager from '@/components/admin/CeremonySettingsManager';
import GovernorAccessManager from '@/components/admin/GovernorAccessManager';
import NomineeManager from '@/components/admin/NomineeManager';
import ArticleMetricsPanel from '@/components/journalist/ArticleMetricsPanel';
import AccessDenied from '@/components/admin/AccessDenied';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

// null = Master Admin only; string = admin_partner can see if they have that permission
const TAB_PERMISSION = {
  overview: null,
  users: 'can_view_users',
  artists: 'can_view_artists',
  songs: 'can_view_songs',
  communities: null,
  discovery: null,
  radio: 'can_view_private_radio_data',
  payments: 'can_view_payments',
  gateways: null,
  partners: null,
  partner_earnings: null,
  reports: 'can_view_reports',
  copyright: 'can_view_legal_takedowns',
  moderation: 'can_manage_support_tickets',
  analytics: 'can_view_reports',
  security: null,
  audit: null,
  hero_banners: null,
  editorial: null,
  article_metrics: null,
  academy: null,
  nominees: null,
  governors: null,
  governor_access: null,
  voting_tally: null,
  pitch_ready: null,
  settings: null,
  default_artists: null,
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'artists', label: 'Artists', icon: Music },
  { id: 'songs', label: 'Songs', icon: Headphones },
  { id: 'communities', label: 'Communities', icon: MessageSquare },
  { id: 'discovery', label: 'Discovery', icon: Compass },
  { id: 'radio', label: 'Radio', icon: Mic },
  { id: 'payments', label: 'Payments', icon: DollarSign },
  { id: 'gateways', label: 'Gateways', icon: CreditCard },
  { id: 'partners', label: 'Admin Partners', icon: Crown },
  { id: 'partner_earnings', label: 'Partner Earnings', icon: DollarSign },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'copyright', label: 'Copyright', icon: Copyright },
  { id: 'moderation', label: 'Moderation', icon: Gavel },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'audit', label: 'Audit Logs', icon: Activity },
  { id: 'hero_banners', label: 'Hero Banners', icon: ImageIcon },
  { id: 'editorial', label: 'Editorial', icon: Newspaper },
  { id: 'article_metrics', label: 'Article Metrics', icon: TrendingUp },
  { id: 'academy', label: 'Awards Academy', icon: Trophy },
  { id: 'nominees', label: 'Nominees', icon: Trophy },
  { id: 'governors', label: 'Board of Governors', icon: Crown },
  { id: 'governor_access', label: 'Governor Access', icon: KeyRound },
  { id: 'voting_tally', label: 'Voting Tally', icon: Vote },
  { id: 'pitch_ready', label: 'Pitch Ready', icon: Megaphone },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'default_artists', label: 'Default Artists', icon: Star },
];

export default function PlatformOperations() {
  const { user } = useAuth();
  const { isMasterAdmin, hasPermission, isLoading: permsLoading } = useAdminPermissions();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [feeInput, setFeeInput] = useState('');

  // Filter tabs by permission — Master Admin sees all, admin_partner sees only permitted tabs
  const visibleTabs = TABS.filter(tab => {
    if (tab.id === 'overview') return true; // all admins see overview
    const requiredPerm = TAB_PERMISSION[tab.id];
    if (!requiredPerm) return isMasterAdmin; // null = master admin only
    return isMasterAdmin || hasPermission(requiredPerm);
  });

  // If current tab is not visible (e.g. permission revoked), fall back to overview
  const effectiveTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : 'overview';

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.filter({}, '-created_date', 100),
  });

  const { data: platformSettings = [] } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => base44.entities.PlatformSetting.filter({}),
  });

  const feeSetting = platformSettings.find(s => s.setting_key === 'platform_fee_percentage');
  const currentFee = feeSetting ? parseFloat(feeSetting.setting_value) : 25;

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 100),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['admin-songs'],
    queryFn: () => base44.entities.Song.list('-created_date', 50),
  });

  const { data: communities = [] } = useQuery({
    queryKey: ['admin-communities'],
    queryFn: () => base44.entities.FrequencyCommunity.list('-created_date', 50),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.filter({ payment_status: 'paid' }, '-created_date', 50),
  });

  const { data: discoveryPartners = [] } = useQuery({
    queryKey: ['admin-discovery-partners'],
    queryFn: () => base44.entities.DiscoveryPartner.list('-created_date', 50),
  });

  const { data: radioProgrammers = [] } = useQuery({
    queryKey: ['admin-radio-programmers'],
    queryFn: () => base44.entities.RadioProgrammer.list('-created_date', 50),
  });

  const { data: radioStations = [] } = useQuery({
    queryKey: ['admin-radio-stations'],
    queryFn: () => base44.entities.RadioStation.list('-created_date', 50),
  });

  const updateFee = useMutation({
    mutationFn: async (newFee) => {
      const clamped = Math.max(15, Math.min(30, newFee));
      if (feeSetting) {
        return base44.entities.PlatformSetting.update(feeSetting.id, {
          setting_value: String(clamped),
          updated_by_user_id: user.id,
          updated_by_name: user.full_name || user.email,
        });
      }
      return base44.entities.PlatformSetting.create({
        setting_key: 'platform_fee_percentage',
        setting_value: String(clamped),
        setting_type: 'number',
        description: 'Platform fee percentage from subscriptions (default 25%, range 15-30%)',
        default_value: '25',
        min_value: 15,
        max_value: 30,
        updated_by_user_id: user.id,
        updated_by_name: user.full_name || user.email,
        requires_notification: true,
      });
    },
    onSuccess: () => {
      setFeeInput('');
      qc.invalidateQueries({ queryKey: ['platform-settings'] });
    },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const platformCut = orders.reduce((sum, o) => sum + (o.platform_fee || 0), 0);
  const artistPayouts = orders.reduce((sum, o) => sum + (o.artist_earnings || 0), 0);

  // Block non-admin users — checked AFTER all hooks to satisfy rules-of-hooks
  if (!permsLoading && !isMasterAdmin && user?.role !== 'admin_partner') {
    return <AccessDenied message="Platform Operations is restricted to Master Admins and Admin Partners only." />;
  }

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Platform Operations</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage and monitor all aspects of The Mainstream Frequency.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 mb-6 overflow-x-auto">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = effectiveTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview */}
      {effectiveTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Total Users', value: users.length, color: 'text-neon-cyan' },
              { icon: Music, label: 'Songs', value: songs.length, color: 'text-neon-purple' },
              { icon: MessageSquare, label: 'Communities', value: communities.length, color: 'text-neon-blue' },
              { icon: DollarSign, label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, color: 'text-neon-turquoise' },
            ].map(({ icon: Icon, label, value, color }) => (
              <GlassCard key={label} hover={false} className="p-4 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </GlassCard>
            ))}
          </div>

          <GlassCard hover={false} className="p-5">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />Revenue Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-neon-turquoise">${totalRevenue.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Total Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neon-purple">${platformCut.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Platform ({currentFee}%)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neon-cyan">${artistPayouts.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Artist Payouts</p>
              </div>
            </div>
          </GlassCard>

          {isMasterAdmin && (
          <GlassCard hover={false} className="p-5 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium">Platform Operations Fee</h3>
              <NeonBadge color="purple">{currentFee}%</NeonBadge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              $2.50 per subscription goes to Platform Operations. The remainder supports artists, communities, radio discovery, and discovery partners. Adjust the percentage below (15%–30%).
            </p>
            <div className="flex items-center gap-2">
              <Input type="number" min="15" max="30" value={feeInput} onChange={e => setFeeInput(e.target.value)}
                placeholder={`${currentFee}%`} className="w-24" />
              <Button size="sm" onClick={() => updateFee.mutate(parseFloat(feeInput))} disabled={!feeInput || updateFee.isPending}>
                Update Fee
              </Button>
              {updateFee.isPending && <span className="text-xs text-muted-foreground">Updating...</span>}
            </div>
            {parseFloat(feeInput) < 15 || parseFloat(feeInput) > 30 ? (
              <p className="text-[10px] text-destructive mt-1">Fee must be between 15% and 30%</p>
            ) : null}
          </GlassCard>
          )}
        </div>
      )}

      {/* Users */}
      {effectiveTab === 'users' && (
        <div className="space-y-2">
          {users.map(u => (
            <GlassCard key={u.id} hover={false} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{u.full_name || u.email}</p>
                <p className="text-[10px] text-muted-foreground">{u.email} · Joined {new Date(u.created_date).toLocaleDateString()}</p>
              </div>
              <NeonBadge color={u.role === 'admin' ? 'purple' : 'blue'}>{u.role || 'user'}</NeonBadge>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Songs */}
      {effectiveTab === 'songs' && (
        <div className="space-y-2">
          {songs.map(s => (
            <GlassCard key={s.id} hover={false} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {s.cover_art && <img src={s.cover_art} alt="" className="w-10 h-10 rounded object-cover" />}
                <div className="min-w-0">
                  <p className="text-sm truncate">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.artist_name} · {s.genre || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <NeonBadge color="cyan">{s.play_count || 0} plays</NeonBadge>
                {s.is_heard_first && <NeonBadge color="purple">Heard First</NeonBadge>}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Communities */}
      {effectiveTab === 'communities' && (
        <div className="space-y-2">
          {communities.map(c => (
            <GlassCard key={c.id} hover={false} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.genre || 'General'} · {c.member_count || 0} members</p>
              </div>
              {c.is_active ? <NeonBadge color="turquoise">Active</NeonBadge> : <NeonBadge color="magenta">Inactive</NeonBadge>}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Payments */}
      {effectiveTab === 'payments' && (
        <div className="space-y-2">
          {orders.map(o => (
            <GlassCard key={o.id} hover={false} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{o.order_number || o.id.slice(0, 8)}</p>
                <p className="text-[10px] text-muted-foreground">{o.fan_name || 'Unknown'} · {o.payment_type} · {new Date(o.created_date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">${(o.total || 0).toFixed(2)}</p>
                <NeonBadge color={o.payment_status === 'paid' ? 'turquoise' : 'magenta'}>{o.payment_status}</NeonBadge>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Discovery Partners */}
      {effectiveTab === 'discovery' && (
        <div className="space-y-2">
          {discoveryPartners.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <Compass className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No discovery partners registered.</p>
            </GlassCard>
          ) : discoveryPartners.map(dp => (
            <GlassCard key={dp.id} hover={false} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {dp.profile_image && <img src={dp.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" />}
                <div className="min-w-0">
                  <p className="text-sm truncate">{dp.partner_name || dp.organization_name || 'Unnamed Partner'}</p>
                  <p className="text-[10px] text-muted-foreground">{dp.partner_type || 'General'} · {dp.discovery_score || 0} score</p>
                </div>
              </div>
              <NeonBadge color={dp.is_verified ? 'turquoise' : 'magenta'}>
                {dp.is_verified ? 'Verified' : 'Unverified'}
              </NeonBadge>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Radio */}
      {effectiveTab === 'radio' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Radio Programmers</h3>
            {radioProgrammers.length === 0 ? (
              <GlassCard hover={false} className="p-6 text-center">
                <Mic className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No radio programmers registered.</p>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {radioProgrammers.map(rp => (
                  <GlassCard key={rp.id} hover={false} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{rp.programmer_name || rp.station_name || 'Programmer'}</p>
                      <p className="text-[10px] text-muted-foreground">{rp.station_name || 'No station'} · {rp.market || 'Unknown market'}</p>
                    </div>
                    <NeonBadge color={rp.is_active ? 'turquoise' : 'magenta'}>
                      {rp.is_active ? 'Active' : 'Inactive'}
                    </NeonBadge>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Radio Stations</h3>
            {radioStations.length === 0 ? (
              <GlassCard hover={false} className="p-6 text-center">
                <Radio className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No radio stations registered.</p>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {radioStations.map(rs => (
                  <GlassCard key={rs.id} hover={false} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{rs.station_name || 'Station'}</p>
                      <p className="text-[10px] text-muted-foreground">{rs.frequency || ''} {rs.market || ''}</p>
                    </div>
                    <NeonBadge color={rs.is_active ? 'turquoise' : 'magenta'}>
                      {rs.is_active ? 'On Air' : 'Off Air'}
                    </NeonBadge>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Gateways */}
      {effectiveTab === 'gateways' && <PaymentGatewayManager />}

      {/* Admin Partners */}
      {effectiveTab === 'partners' && <AdminPartnerManager />}

      {/* Partner Earnings */}
      {effectiveTab === 'partner_earnings' && <AdminPartnerEarnings />}

      {/* Reports */}
      {effectiveTab === 'reports' && (
        <GlassCard hover={false} className="p-10 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Reports are generated from live data across all platform entities.</p>
          <p className="text-xs text-muted-foreground mt-1">Use the Analytics tab for visual reporting or export from individual management tabs.</p>
        </GlassCard>
      )}

      {/* Copyright */}
      {effectiveTab === 'copyright' && <CopyrightPanel />}

      {/* Analytics */}
      {effectiveTab === 'analytics' && <AnalyticsPanel />}

      {/* Security */}
      {effectiveTab === 'security' && <SecurityCenter />}

      {/* Moderation */}
      {effectiveTab === 'moderation' && <ModerationPortal />}

      {/* Audit Logs — Master Admin only */}
      {effectiveTab === 'audit' && <AdminAuditLog />}

      {/* Hero Banners */}
      {effectiveTab === 'hero_banners' && <HeroBannerManager />}

      {/* Editorial Review */}
      {effectiveTab === 'editorial' && <EditorialReviewPanel />}

      {/* Article Metrics across all journalists */}
      {effectiveTab === 'article_metrics' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-display font-bold">Article Performance Metrics</h2>
              <p className="text-xs text-muted-foreground">Views and shares across all published features — see what resonates most with the community.</p>
            </div>
          </div>
          <ArticleMetricsPanel scope="all" />
        </div>
      )}

      {/* Awards Academy Committee */}
      {effectiveTab === 'academy' && (
        <div className="space-y-4">
          <CeremonySettingsManager />
          <AcademyCommitteePanel />
        </div>
      )}

      {/* Nominee Management */}
      {effectiveTab === 'nominees' && <NomineeManager />}

      {/* Board of Governors Dashboard */}
      {effectiveTab === 'governors' && <BoardOfGovernorsDashboard />}

      {/* Governor Access Code Manager */}
      {effectiveTab === 'governor_access' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-display font-bold">Governor Access Codes</h2>
              <p className="text-xs text-muted-foreground">Issue private one-time access codes to verified governors for viewing their voting completion badges.</p>
            </div>
          </div>
          <GovernorAccessManager />
        </div>
      )}

      {/* Voting Tally */}
      {effectiveTab === 'voting_tally' && <AcademyVotingTally />}

      {/* Pitch Ready Manager */}
      {effectiveTab === 'pitch_ready' && <PitchReadyManager />}

      {/* Default Artists */}
      {effectiveTab === 'default_artists' && <DefaultArtistsManager />}

      {/* Settings */}
      {effectiveTab === 'settings' && (
        <GlassCard hover={false} className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">Platform Settings</h3>
          </div>
          <div className="space-y-2">
            {platformSettings.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{s.setting_key.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-muted-foreground">{s.description}</p>
                </div>
                <NeonBadge color="purple">{s.setting_value}</NeonBadge>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}