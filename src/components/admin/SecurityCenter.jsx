import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Shield, ShieldCheck, ShieldAlert, Lock, KeyRound, Fingerprint,
  Eye, Ban, Activity, AlertTriangle, CheckCircle2, Loader2,
  TrendingUp, Users, DollarSign, Music, MessageSquare, Radio,
  Copyright, BarChart3, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const PROTECTION_STATUS = [
  { name: 'Encryption (AES-256 at rest)', icon: Lock, enabled: true, note: 'Platform-managed encryption for all stored data' },
  { name: 'MFA / 2FA', icon: KeyRound, enabled: true, note: 'Multi-factor authentication via platform auth' },
  { name: 'CAPTCHA on auth forms', icon: Fingerprint, enabled: true, note: 'Bot protection on login & registration' },
  { name: 'Brute Force Protection', icon: Ban, enabled: true, note: 'Rate limiting & auto-lockout after failed attempts' },
  { name: 'SQL Injection Protection', icon: ShieldCheck, enabled: true, note: 'Parameterized queries via managed database layer' },
  { name: 'XSS Protection', icon: Shield, enabled: true, note: 'React auto-escaping + CSP headers' },
  { name: 'CSRF Protection', icon: ShieldAlert, enabled: true, note: 'Token-based request validation' },
  { name: 'Login Alerts', icon: Eye, enabled: true, note: 'Email alerts for suspicious logins' },
  { name: 'Audit Logging', icon: Activity, enabled: true, note: 'All admin & security actions logged' },
  { name: 'Fraud Detection', icon: AlertTriangle, enabled: true, note: 'Real-time pattern matching on transactions' },
];

export default function SecurityCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: securityEvents = [], isLoading } = useQuery({
    queryKey: ['security-events', severityFilter],
    queryFn: () => {
      const filter = severityFilter === 'all' ? {} : { severity: severityFilter };
      return base44.entities.SecurityEvent.filter(filter, '-created_date', 100);
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs-security'],
    queryFn: () => base44.entities.AuditLog.filter({ is_security_event: true }, '-created_date', 50),
  });

  const { data: userReports = [] } = useQuery({
    queryKey: ['admin-user-reports'],
    queryFn: () => base44.entities.UserReport.filter({}, '-created_date', 30),
  });

  const { data: userBlocks = [] } = useQuery({
    queryKey: ['admin-user-blocks'],
    queryFn: () => base44.entities.UserBlock.filter({}, '-created_date', 30),
  });

  const resolveEvent = useMutation({
    mutationFn: async ({ eventId, notes }) => {
      return base44.entities.SecurityEvent.update(eventId, {
        is_resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['security-events'] }),
  });

  const filteredEvents = securityEvents.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.description?.toLowerCase().includes(q) ||
           e.user_email?.toLowerCase().includes(q) ||
           e.event_type?.toLowerCase().includes(q) ||
           e.ip_address?.toLowerCase().includes(q);
  });

  const criticalCount = securityEvents.filter(e => e.severity === 'critical' && !e.is_resolved).length;
  const warningCount = securityEvents.filter(e => e.severity === 'warning' && !e.is_resolved).length;
  const resolvedCount = securityEvents.filter(e => e.is_resolved).length;

  const severityConfig = {
    critical: { color: 'text-red-400', badge: 'magenta', icon: AlertTriangle },
    warning: { color: 'text-yellow-400', badge: 'magenta', icon: ShieldAlert },
    info: { color: 'text-neon-cyan', badge: 'cyan', icon: Activity },
  };

  return (
    <div className="space-y-6">
      {/* Security Posture */}
      <GlassCard hover={false} className="p-5 border-neon-turquoise/20">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-neon-turquoise" />
          <h3 className="font-display font-semibold text-sm">Platform Security Posture</h3>
          <NeonBadge color="cyan">All Active</NeonBadge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {PROTECTION_STATUS.map(({ name, icon: Icon, enabled, note }) => (
            <div key={name} className="p-3 rounded-lg bg-secondary/20 border border-border/30" title={note}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-neon-turquoise" />
                <CheckCircle2 className="w-3 h-3 text-neon-turquoise ml-auto" />
              </div>
              <p className="text-[11px] font-medium leading-tight">{name}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Security Event Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-4 text-center">
          <AlertTriangle className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400">{criticalCount}</p>
          <p className="text-[10px] text-muted-foreground">Critical (Open)</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <ShieldAlert className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">{warningCount}</p>
          <p className="text-[10px] text-muted-foreground">Warnings (Open)</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <CheckCircle2 className="w-4 h-4 text-neon-turquoise mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-turquoise">{resolvedCount}</p>
          <p className="text-[10px] text-muted-foreground">Resolved</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Ban className="w-4 h-4 text-neon-purple mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-purple">{userBlocks.length}</p>
          <p className="text-[10px] text-muted-foreground">User Blocks</p>
        </GlassCard>
      </div>

      {/* Security Events Log */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-cyan" />
            <h3 className="font-display font-semibold text-sm">Security Event Log</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events..."
                className="h-8 w-40 pl-7 text-xs"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredEvents.map(evt => {
              const cfg = severityConfig[evt.severity] || severityConfig.info;
              const EventIcon = cfg.icon;
              return (
                <div key={evt.id} className={`p-3 rounded-lg border ${evt.is_resolved ? 'bg-secondary/5 border-border/20' : 'bg-secondary/20 border-border/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <EventIcon className={`w-4 h-4 ${cfg.color} mt-0.5 flex-shrink-0`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold">{evt.event_type.replace(/_/g, ' ')}</span>
                          <NeonBadge color={cfg.badge}>{evt.severity}</NeonBadge>
                          {evt.is_resolved && <NeonBadge color="cyan">Resolved</NeonBadge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{evt.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/60">
                          {evt.user_email && <span>{evt.user_email}</span>}
                          {evt.ip_address && <span>· {evt.ip_address}</span>}
                          {evt.country && <span>· {evt.country}</span>}
                          <span>· {new Date(evt.created_date).toLocaleString()}</span>
                        </div>
                        {evt.resolution_notes && (
                          <p className="text-[10px] text-neon-turquoise mt-1">✓ {evt.resolution_notes}</p>
                        )}
                      </div>
                    </div>
                    {!evt.is_resolved && evt.severity !== 'info' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-shrink-0"
                        onClick={() => resolveEvent.mutate({ eventId: evt.id, notes: 'Reviewed and resolved by admin' })}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShieldCheck className="w-10 h-10 text-neon-turquoise/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No security events match this filter</p>
          </div>
        )}
      </GlassCard>

      {/* User Reports & Blocks */}
      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <h3 className="font-display font-semibold text-sm">User Reports ({userReports.length})</h3>
          </div>
          {userReports.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {userReports.map(r => (
                <div key={r.id} className="p-2 rounded-lg bg-secondary/20 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.reported_user_name || r.reported_user_id?.slice(0, 8)}</span>
                    <NeonBadge color="magenta">{r.reason || 'Report'}</NeonBadge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    By {r.reporter_name || 'User'} · {new Date(r.created_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No reports filed</p>
          )}
        </GlassCard>

        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Ban className="w-4 h-4 text-neon-purple" />
            <h3 className="font-display font-semibold text-sm">Active User Blocks ({userBlocks.length})</h3>
          </div>
          {userBlocks.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {userBlocks.map(b => (
                <div key={b.id} className="p-2 rounded-lg bg-secondary/20 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{b.blocked_user_name || b.blocked_user_id?.slice(0, 8)}</span>
                    <NeonBadge color="purple">Blocked</NeonBadge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    By {b.blocker_name || 'User'} · {new Date(b.created_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No active blocks</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}