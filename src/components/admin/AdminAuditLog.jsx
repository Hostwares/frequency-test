import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Activity, AlertTriangle, Shield, Download, Search,
  LogIn, Edit, Trash2, DollarSign, FileText, Lock, Eye,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORY_ICONS = {
  auth: LogIn,
  content: Edit,
  payment: DollarSign,
  admin: Shield,
  security: Lock,
  profile: Eye,
  community: Activity,
  moderation: AlertTriangle,
};

const SEVERITY_COLORS = {
  info: 'blue',
  warning: 'magenta',
  critical: 'magenta',
};

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => base44.entities.AuditLog.filter({}, '-created_date', 200),
  });

  if (user?.role !== 'master_admin' && user?.role !== 'admin') {
    return (
      <GlassCard hover={false} className="p-8 text-center">
        <Lock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">The Admin Audit Log is visible only to the Master Admin.</p>
      </GlassCard>
    );
  }

  const filtered = logs.filter(log => {
    if (categoryFilter !== 'all' && log.action_category !== categoryFilter) return false;
    if (severityFilter !== 'all' && log.severity !== severityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.action?.toLowerCase().includes(q) ||
        log.user_name?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.user_email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const downloadCSV = () => {
    const headers = ['Date', 'Admin', 'Email', 'Action', 'Category', 'Severity', 'Details', 'IP Address', 'Entity Type', 'Entity ID', 'Previous Value', 'New Value'];
    const rows = filtered.map(l => [
      new Date(l.created_date).toISOString(),
      l.user_name || '',
      l.user_email || '',
      l.action || '',
      l.action_category || '',
      l.severity || '',
      (l.details || '').replace(/,/g, ';'),
      l.ip_address || '',
      l.entity_type || '',
      l.entity_id || '',
      l.metadata?.previous_value ? JSON.stringify(l.metadata.previous_value).replace(/,/g, ';') : '',
      l.metadata?.new_value ? JSON.stringify(l.metadata.new_value).replace(/,/g, ';') : '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-neon-purple" />
          <h2 className="font-display font-semibold text-sm">Admin Audit Log</h2>
          <NeonBadge color="purple">{filtered.length} entries</NeonBadge>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
          onClick={downloadCSV} disabled={filtered.length === 0}>
          <Download className="w-3 h-3" /> Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search by action, admin name, details..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="bg-secondary/20 text-sm pl-8" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36 h-9 bg-secondary/20 text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {['auth', 'content', 'payment', 'admin', 'security', 'profile', 'community', 'moderation'].map(c => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-32 h-9 bg-secondary/20 text-sm">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Failed access attempts summary */}
      {filtered.some(l => l.action?.includes('failed_access')) && (
        <GlassCard hover={false} className="p-4 border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">Failed Access Attempts Detected</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {filtered.filter(l => l.action?.includes('failed_access')).length} unauthorized access attempt(s) recorded.
          </p>
        </GlassCard>
      )}

      {/* Log entries */}
      {isLoading ? (
        <GlassCard hover={false} className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading audit logs...</p>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No audit log entries found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(log => {
            const Icon = CATEGORY_ICONS[log.action_category] || FileText;
            const isFailed = log.action?.includes('failed_access');
            return (
              <div key={log.id}
                className={`p-3 rounded-lg border ${isFailed ? 'border-destructive/30 bg-destructive/5' : 'bg-secondary/20 border-border/30'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                      log.severity === 'critical' ? 'bg-destructive/15' :
                      log.severity === 'warning' ? 'bg-neon-magenta/15' : 'bg-secondary/40'
                    }`}>
                      {log.is_security_event || isFailed
                        ? <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                        : <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.action}</span>
                        <NeonBadge color={SEVERITY_COLORS[log.severity] || 'blue'}>{log.action_category}</NeonBadge>
                        {log.is_security_event && <NeonBadge color="magenta">Security</NeonBadge>}
                      </div>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                      )}
                      {/* Previous / new value */}
                      {log.metadata?.previous_value != null && (
                        <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                          {log.metadata.previous_value != null && (
                            <span className="text-destructive">
                              Prev: {typeof log.metadata.previous_value === 'object'
                                ? JSON.stringify(log.metadata.previous_value)
                                : String(log.metadata.previous_value)}
                            </span>
                          )}
                          {log.metadata.new_value != null && (
                            <span className="text-neon-turquoise">
                              New: {typeof log.metadata.new_value === 'object'
                                ? JSON.stringify(log.metadata.new_value)
                                : String(log.metadata.new_value)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium">{log.user_name || 'Unknown'}</p>
                    <p className="text-[10px] text-muted-foreground">{log.user_email || log.user_id?.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(log.created_date).toLocaleString()}</p>
                    {log.ip_address && log.ip_address !== 'unknown' && (
                      <p className="text-[9px] text-muted-foreground/60">IP: {log.ip_address}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}