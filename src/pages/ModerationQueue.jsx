import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Gavel, Flag, MessageSquare, Ban, AlertTriangle, CheckCircle2,
  XCircle, Eye, UserX, Loader2, ShieldAlert, Filter, Clock,
  ChevronRight, Inbox, Layers, CheckSquare, Search, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import AccessDenied from '@/components/admin/AccessDenied';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

const REPORT_TYPE_LABELS = {
  harassment: 'Harassment',
  spam: 'Spam',
  inappropriate_content: 'Inappropriate',
  scam_fraud: 'Scam/Fraud',
  copyright: 'Copyright',
  impersonation: 'Impersonation',
  other: 'Other',
};

const REPORT_TYPE_COLORS = {
  harassment: 'magenta',
  spam: 'blue',
  inappropriate_content: 'magenta',
  scam_fraud: 'magenta',
  copyright: 'purple',
  impersonation: 'cyan',
  other: 'blue',
};

const PRIORITY_RANK = {
  scam_fraud: 1,
  harassment: 2,
  copyright: 3,
  inappropriate_content: 4,
  impersonation: 5,
  spam: 6,
  other: 7,
};

export default function ModerationQueue() {
  const { user } = useAuth();
  const { isMasterAdmin, hasPermission } = useAdminPermissions();
  const qc = useQueryClient();
  const [queueFilter, setQueueFilter] = useState('all');
  const [actionDialog, setActionDialog] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [banDuration, setBanDuration] = useState('24');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDialog, setBulkDialog] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['mod-queue-reports'],
    queryFn: () => base44.entities.UserReport.filter(
      { status: 'pending' },
      'created_date',
      100
    ),
  });

  const { data: underReview = [] } = useQuery({
    queryKey: ['mod-queue-under-review'],
    queryFn: () => base44.entities.UserReport.filter(
      { status: 'under_review' },
      'created_date',
      100
    ),
  });

  const { data: flaggedMessages = [], isLoading: loadingFlagged } = useQuery({
    queryKey: ['mod-queue-flagged'],
    queryFn: () => base44.entities.CommunityMessage.filter(
      { is_flagged: true },
      '-created_date',
      100
    ),
  });

  const queueItems = [
    ...reports.map(r => ({
      id: r.id,
      type: 'report',
      subtype: r.report_type,
      priority: PRIORITY_RANK[r.report_type] || 7,
      title: r.reported_user_name || r.reported_user_id?.slice(0, 8),
      description: r.description,
      contextUrl: r.context_url,
      createdAt: r.created_date,
      rawData: r,
    })),
    ...underReview.map(r => ({
      id: r.id,
      type: 'report',
      subtype: r.report_type,
      priority: PRIORITY_RANK[r.report_type] || 7,
      title: r.reported_user_name || r.reported_user_id?.slice(0, 8),
      description: r.description,
      contextUrl: r.context_url,
      createdAt: r.created_date,
      rawData: r,
      underReview: true,
    })),
    ...flaggedMessages.map(m => ({
      id: m.id,
      type: 'flagged_message',
      subtype: 'flagged',
      priority: 4,
      title: m.author_name || 'Unknown',
      description: m.body,
      contextUrl: null,
      createdAt: m.created_date,
      rawData: m,
    })),
  ].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const typeFiltered = queueFilter === 'all'
    ? queueItems
    : queueFilter === 'reports'
    ? queueItems.filter(i => i.type === 'report' && !i.underReview)
    : queueFilter === 'flagged'
    ? queueItems.filter(i => i.type === 'flagged_message')
    : queueItems.filter(i => i.underReview);

  const filteredQueue = searchQuery.trim()
    ? typeFiltered.filter(i => {
        const q = searchQuery.toLowerCase();
        return (
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.subtype && i.subtype.toLowerCase().includes(q))
        );
      })
    : typeFiltered;

  const stats = {
    total: queueItems.length,
    reports: queueItems.filter(i => i.type === 'report' && !i.underReview).length,
    underReview: queueItems.filter(i => i.underReview).length,
    flagged: queueItems.filter(i => i.type === 'flagged_message').length,
    urgent: queueItems.filter(i => i.priority <= 2).length,
  };

  const buildItemUpdates = (item, action, message, suspendDuration) => {
    const now = new Date().toISOString();
    const updates = [];

    if (item.type === 'report') {
      const report = item.rawData;
      if (action === 'warn') {
        updates.push(base44.entities.UserReport.update(report.id, {
          status: 'resolved_warning',
          reviewed_by: user.id,
          admin_notes: message || 'Warning issued',
          resolved_date: now,
        }));
        updates.push(base44.entities.ModerationAction.create({
          community_id: 'platform',
          moderator_user_id: user.id,
          moderator_name: user.full_name || user.email,
          action_type: 'warn',
          target_user_id: report.reported_user_id,
          target_user_name: report.reported_user_name,
          target_type: 'user',
          target_id: report.reported_user_id,
          reason: message || report.description,
        }));
      } else if (action === 'suspend') {
        updates.push(base44.entities.UserReport.update(report.id, {
          status: 'resolved_warning',
          reviewed_by: user.id,
          admin_notes: `Suspended ${suspendDuration}h: ${message || ''}`,
          resolved_date: now,
        }));
        updates.push(base44.entities.ModerationAction.create({
          community_id: 'platform',
          moderator_user_id: user.id,
          moderator_name: user.full_name || user.email,
          action_type: 'ban',
          target_user_id: report.reported_user_id,
          target_user_name: report.reported_user_name,
          target_type: 'user',
          target_id: report.reported_user_id,
          reason: `Suspended ${suspendDuration}h: ${message || report.description}`,
          duration_hours: parseInt(suspendDuration),
          is_active: true,
          expires_at: new Date(Date.now() + parseInt(suspendDuration) * 3600000).toISOString(),
        }));
      } else if (action === 'ban') {
        updates.push(base44.entities.UserReport.update(report.id, {
          status: 'resolved_banned',
          reviewed_by: user.id,
          admin_notes: message || 'Account banned',
          resolved_date: now,
        }));
        updates.push(base44.entities.ModerationAction.create({
          community_id: 'platform',
          moderator_user_id: user.id,
          moderator_name: user.full_name || user.email,
          action_type: 'ban',
          target_user_id: report.reported_user_id,
          target_user_name: report.reported_user_name,
          target_type: 'user',
          target_id: report.reported_user_id,
          reason: message || report.description,
          is_active: true,
        }));
      } else if (action === 'review') {
        updates.push(base44.entities.UserReport.update(report.id, {
          status: 'under_review',
          reviewed_by: user.id,
          admin_notes: message || 'Marked under review',
        }));
      } else if (action === 'dismiss') {
        updates.push(base44.entities.UserReport.update(report.id, {
          status: 'dismissed',
          reviewed_by: user.id,
          admin_notes: message || 'Dismissed',
          resolved_date: now,
        }));
      } else if (action === 'approve') {
        updates.push(base44.entities.UserReport.update(report.id, {
          status: 'dismissed',
          reviewed_by: user.id,
          admin_notes: message || 'Content approved — no action needed',
          resolved_date: now,
        }));
      }
    } else if (item.type === 'flagged_message') {
      const msg = item.rawData;
      if (action === 'delete') {
        updates.push(base44.entities.CommunityMessage.update(msg.id, {
          is_deleted: true,
          is_flagged: false,
          deleted_by: user.id,
        }));
        updates.push(base44.entities.ModerationAction.create({
          community_id: msg.community_id,
          moderator_user_id: user.id,
          moderator_name: user.full_name || user.email,
          action_type: 'delete_message',
          target_user_id: msg.author_user_id,
          target_user_name: msg.author_name,
          target_type: 'message',
          target_id: msg.id,
          reason: message || 'Flagged message deleted',
        }));
      } else if (action === 'dismiss') {
        updates.push(base44.entities.CommunityMessage.update(msg.id, {
          is_flagged: false,
        }));
      } else if (action === 'approve') {
        updates.push(base44.entities.CommunityMessage.update(msg.id, {
          is_flagged: false,
        }));
      }
    }

    updates.push(base44.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      user_role: 'admin',
      action: `mod_queue_${action}`,
      action_category: 'moderation',
      entity_type: item.type === 'report' ? 'UserReport' : 'CommunityMessage',
      entity_id: item.id,
      details: `${action} on ${item.title}: ${message || ''}`,
      is_security_event: action === 'ban' || action === 'suspend',
      severity: action === 'ban' ? 'critical' : action === 'suspend' ? 'warning' : 'info',
    }));

    return updates;
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['mod-queue-reports'] });
    qc.invalidateQueries({ queryKey: ['mod-queue-under-review'] });
    qc.invalidateQueries({ queryKey: ['mod-queue-flagged'] });
    qc.invalidateQueries({ queryKey: ['admin-moderation-actions'] });
    qc.invalidateQueries({ queryKey: ['audit-logs'] });
  };

  const takeAction = useMutation({
    mutationFn: async ({ item, action, message }) => {
      const updates = buildItemUpdates(item, action, message, banDuration);
      await Promise.all(updates);
    },
    onSuccess: () => {
      invalidateAll();
      setActionDialog(null);
      setActionNotes('');
    },
  });

  const bulkAction = useMutation({
    mutationFn: async ({ items, action, message }) => {
      const allUpdates = [];
      for (const item of items) {
        allUpdates.push(...buildItemUpdates(item, action, message, banDuration));
      }
      // Process in batches of 10 to avoid overwhelming the API
      for (let i = 0; i < allUpdates.length; i += 10) {
        await Promise.all(allUpdates.slice(i, i + 10));
      }
    },
    onSuccess: () => {
      invalidateAll();
      setSelectedIds(new Set());
      setBulkDialog(null);
      setActionNotes('');
    },
  });

  const openAction = (item, action) => {
    setActionDialog({ item, action });
    setActionNotes('');
  };

  const submitAction = () => {
    takeAction.mutate({ item: actionDialog.item, action: actionDialog.action, message: actionNotes });
  };

  const itemKey = (item) => `${item.type}-${item.id}`;

  const toggleSelect = (item) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const key = itemKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQueue.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQueue.map(itemKey)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedItems = filteredQueue.filter(i => selectedIds.has(itemKey(i)));

  const openBulkAction = (action) => {
    setBulkDialog({ action });
    setActionNotes('');
  };

  const submitBulkAction = () => {
    bulkAction.mutate({ items: selectedItems, action: bulkDialog.action, message: actionNotes });
  };

  const isLoading = loadingReports || loadingFlagged;
  const isPending = takeAction.isPending || bulkAction.isPending;

  const dialogActionLabel = actionDialog?.action === 'warn' ? 'Issue Warning'
    : actionDialog?.action === 'suspend' ? 'Suspend User'
    : actionDialog?.action === 'ban' ? 'Ban User'
    : actionDialog?.action === 'review' ? 'Mark Under Review'
    : actionDialog?.action === 'dismiss' ? 'Dismiss'
    : actionDialog?.action === 'delete' ? 'Delete Message'
    : actionDialog?.action === 'approve' ? 'Approve Content'
    : 'Confirm';

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  };

  // Only Master Admins or partners with can_manage_support_tickets can access
  if (!isMasterAdmin && !hasPermission('can_manage_support_tickets')) {
    return <AccessDenied message="The Moderation Queue requires the Support Tickets permission or Master Admin access." icon={Gavel} />;
  }

  return (
    <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Gavel className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Moderation Queue</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Unified queue of reported users and flagged content, prioritized by severity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { icon: Inbox, label: 'In Queue', value: stats.total, color: 'text-primary' },
          { icon: Flag, label: 'Reports', value: stats.reports, color: 'text-neon-magenta' },
          { icon: Eye, label: 'Under Review', value: stats.underReview, color: 'text-neon-purple' },
          { icon: MessageSquare, label: 'Flagged', value: stats.flagged, color: 'text-neon-cyan' },
          { icon: ShieldAlert, label: 'Urgent', value: stats.urgent, color: 'text-destructive' },
        ].map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} hover={false} className="p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={queueFilter} onValueChange={setQueueFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="reports">Pending Reports</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="flagged">Flagged Messages</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by user, content, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs bg-secondary/50 border-border/50"
          />
        </div>
        <span className="text-xs text-muted-foreground md:ml-auto whitespace-nowrap">
          {filteredQueue.length} {filteredQueue.length === 1 ? 'item' : 'items'} in queue
        </span>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <GlassCard hover={false} className="p-3 mb-4 border-primary/30">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
            </div>
            <div className="h-4 w-px bg-border/50" />
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => openBulkAction('warn')}>
              <AlertTriangle className="w-3 h-3" />Warn All
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => openBulkAction('suspend')}>
              <Ban className="w-3 h-3" />Suspend All
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
              onClick={() => openBulkAction('ban')}>
              <ShieldAlert className="w-3 h-3" />Ban All
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-neon-turquoise/30 text-neon-turquoise hover:bg-neon-turquoise/10"
              onClick={() => openBulkAction('approve')}>
              <Check className="w-3 h-3" />Approve All
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
              onClick={() => openBulkAction('dismiss')}>
              <CheckCircle2 className="w-3 h-3" />Dismiss All
            </Button>
            {selectedItems.some(i => i.type === 'flagged_message') && (
              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                onClick={() => openBulkAction('delete')}>
                <XCircle className="w-3 h-3" />Delete Flagged
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto"
              onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Queue */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filteredQueue.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-neon-turquoise/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Queue is clear!</p>
          <p className="text-xs text-muted-foreground mt-1">No items need moderation right now.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {/* Select All Row */}
          <div className="flex items-center gap-2 px-4 py-2">
            <Checkbox
              checked={filteredQueue.length > 0 && selectedIds.size === filteredQueue.length}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${filteredQueue.length} selected`
                : 'Select all'}
            </span>
            <Layers className="w-3.5 h-3.5 text-muted-foreground/50 ml-auto" />
          </div>
          {filteredQueue.map((item, idx) => (
            <GlassCard key={`${item.type}-${item.id}`} hover={false}
              className={`p-4 ${item.priority <= 2 ? 'border-destructive/30' : ''} ${selectedIds.has(itemKey(item)) ? 'ring-1 ring-primary/30 bg-primary/5' : ''}`}>
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <Checkbox
                  checked={selectedIds.has(itemKey(item))}
                  onCheckedChange={() => toggleSelect(item)}
                  className="mt-1"
                />
                {/* Priority indicator */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                  item.priority <= 2 ? 'bg-destructive' :
                  item.priority <= 4 ? 'bg-neon-magenta' :
                  'bg-neon-purple'
                }`} />

                <div className="min-w-0 flex-1">
                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {item.priority <= 2 && (
                      <NeonBadge color="magenta">
                        <ShieldAlert className="w-3 h-3 inline mr-0.5" />Urgent
                      </NeonBadge>
                    )}
                    {item.type === 'report' ? (
                      <NeonBadge color={REPORT_TYPE_COLORS[item.subtype] || 'blue'}>
                        <Flag className="w-3 h-3 inline mr-0.5" />
                        {REPORT_TYPE_LABELS[item.subtype] || item.subtype}
                      </NeonBadge>
                    ) : (
                      <NeonBadge color="cyan">
                        <MessageSquare className="w-3 h-3 inline mr-0.5" />Flagged Message
                      </NeonBadge>
                    )}
                    {item.underReview && <NeonBadge color="purple">Under Review</NeonBadge>}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />{timeAgo(item.createdAt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">#{idx + 1}</span>
                  </div>

                  {/* Content */}
                  <p className="text-sm font-medium mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>

                  {item.contextUrl && (
                    <a href={item.contextUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-neon-cyan hover:underline mt-1 inline-block">
                      View context →
                    </a>
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-1.5 flex-wrap mt-3 pt-2 border-t border-border/30">
                    {item.type === 'report' && !item.underReview && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-neon-turquoise/30 text-neon-turquoise hover:bg-neon-turquoise/10"
                          onClick={() => openAction(item, 'approve')}>
                          <Check className="w-3 h-3" />Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => openAction(item, 'warn')}>
                          <AlertTriangle className="w-3 h-3" />Warn
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => openAction(item, 'suspend')}>
                          <Ban className="w-3 h-3" />Suspend
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                          onClick={() => openAction(item, 'ban')}>
                          <ShieldAlert className="w-3 h-3" />Ban
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                          onClick={() => openAction(item, 'review')}>
                          <Eye className="w-3 h-3" />Review
                        </Button>
                      </>
                    )}
                    {item.type === 'flagged_message' && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-neon-turquoise/30 text-neon-turquoise hover:bg-neon-turquoise/10"
                          onClick={() => openAction(item, 'approve')}>
                          <Check className="w-3 h-3" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                          onClick={() => openAction(item, 'delete')}>
                          <XCircle className="w-3 h-3" />Delete
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                          onClick={() => openAction(item, 'dismiss')}>
                          <CheckCircle2 className="w-3 h-3" />Clear
                        </Button>
                      </>
                    )}
                    {item.underReview && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => openAction(item, 'warn')}>
                          <AlertTriangle className="w-3 h-3" />Warn
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                          onClick={() => openAction(item, 'ban')}>
                          <ShieldAlert className="w-3 h-3" />Ban
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                          onClick={() => openAction(item, 'dismiss')}>
                          <XCircle className="w-3 h-3" />Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 mt-1" />
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.action === 'ban' && <ShieldAlert className="w-5 h-5 text-destructive" />}
              {actionDialog?.action === 'suspend' && <Ban className="w-5 h-5 text-neon-magenta" />}
              {actionDialog?.action === 'warn' && <AlertTriangle className="w-5 h-5 text-neon-cyan" />}
              {actionDialog?.action === 'delete' && <XCircle className="w-5 h-5 text-destructive" />}
              {actionDialog?.action === 'approve' && <Check className="w-5 h-5 text-neon-turquoise" />}
              {dialogActionLabel}
            </DialogTitle>
          </DialogHeader>

          {actionDialog?.item.type === 'report' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You are about to <span className="font-medium text-foreground">{actionDialog.action}</span>{' '}
                user <span className="font-medium text-foreground">{actionDialog.item.title}</span>.
              </p>
              {actionDialog.action === 'suspend' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Duration:</span>
                  <Select value={banDuration} onValueChange={setBanDuration}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="72">3 days</SelectItem>
                      <SelectItem value="168">7 days</SelectItem>
                      <SelectItem value="720">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Textarea
                placeholder="Notes / reason (logged in audit trail)..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {actionDialog?.item.type === 'flagged_message' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {actionDialog.action === 'delete'
                  ? 'Message will be permanently deleted and a moderation action recorded for the author.'
                  : 'Flag will be cleared and the message will remain visible.'}
              </p>
              <p className="text-sm bg-secondary/30 rounded-lg p-3">{actionDialog.item.description}</p>
              <Textarea
                placeholder="Reason (optional)..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant={actionDialog?.action === 'ban' || actionDialog?.action === 'delete' ? 'destructive' : 'default'}
              onClick={submitAction}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : dialogActionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={!!bulkDialog} onOpenChange={(open) => !open && setBulkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkDialog?.action === 'ban' && <ShieldAlert className="w-5 h-5 text-destructive" />}
              {bulkDialog?.action === 'suspend' && <Ban className="w-5 h-5 text-neon-magenta" />}
              {bulkDialog?.action === 'warn' && <AlertTriangle className="w-5 h-5 text-neon-cyan" />}
              {bulkDialog?.action === 'delete' && <XCircle className="w-5 h-5 text-destructive" />}
              {bulkDialog?.action === 'approve' && <Check className="w-5 h-5 text-neon-turquoise" />}
              {bulkDialog?.action === 'dismiss' && <CheckCircle2 className="w-5 h-5 text-neon-turquoise" />}
              Bulk {bulkDialog?.action === 'warn' ? 'Warning' :
                bulkDialog?.action === 'suspend' ? 'Suspension' :
                bulkDialog?.action === 'ban' ? 'Ban' :
                bulkDialog?.action === 'delete' ? 'Delete' :
                bulkDialog?.action === 'approve' ? 'Approval' : 'Dismiss'}
              {' — '}{selectedItems.length} items
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are about to <span className="font-medium text-foreground">{bulkDialog?.action}</span>{' '}
              {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} at once.
            </p>

            {/* Summary of selected items */}
            <div className="max-h-32 overflow-y-auto space-y-1 bg-secondary/20 rounded-lg p-2">
              {selectedItems.map(item => (
                <div key={itemKey(item)} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {item.type === 'report' ? '👤' : '💬'}
                  </span>
                  <span className="truncate">{item.title}</span>
                </div>
              ))}
            </div>

            {bulkDialog?.action === 'suspend' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Duration:</span>
                <Select value={banDuration} onValueChange={setBanDuration}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Textarea
              placeholder="Notes / reason (applied to all selected items, logged in audit trail)..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button
              variant={bulkDialog?.action === 'ban' || bulkDialog?.action === 'delete' ? 'destructive' : 'default'}
              onClick={submitBulkAction}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Apply to ${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}