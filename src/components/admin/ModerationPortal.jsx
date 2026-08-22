import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Gavel, Flag, MessageSquare, Ban, AlertTriangle, CheckCircle2,
  XCircle, Eye, UserX, Loader2, ShieldAlert, FileText, Filter, Inbox, Clock, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const REPORT_TYPE_LABELS = {
  harassment: 'Harassment',
  spam: 'Spam',
  inappropriate_content: 'Inappropriate Content',
  scam_fraud: 'Scam / Fraud',
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

const STATUS_COLORS = {
  pending: 'magenta',
  under_review: 'purple',
  resolved_warning: 'cyan',
  resolved_banned: 'magenta',
  dismissed: 'blue',
};

const SUB_TABS = [
  { id: 'queue', label: 'Unified Queue', icon: Inbox },
  { id: 'reports', label: 'User Reports', icon: Flag },
  { id: 'flagged', label: 'Flagged Content', icon: MessageSquare },
  { id: 'blocks', label: 'User Blocks', icon: UserX },
  { id: 'history', label: 'Action History', icon: Gavel },
];

const PRIORITY_RANK = {
  scam_fraud: 1,
  harassment: 2,
  copyright: 3,
  inappropriate_content: 4,
  impersonation: 5,
  spam: 6,
  other: 7,
  flagged: 4,
};

export default function ModerationPortal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState('queue');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionDialog, setActionDialog] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [banDuration, setBanDuration] = useState('24');

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['admin-user-reports', statusFilter],
    queryFn: () => {
      const query = statusFilter === 'all' ? {} : { status: statusFilter };
      return base44.entities.UserReport.filter(query, '-created_date', 100);
    },
  });

  const { data: flaggedMessages = [], isLoading: loadingFlagged } = useQuery({
    queryKey: ['admin-flagged-messages'],
    queryFn: () => base44.entities.CommunityMessage.filter({ is_flagged: true }, '-created_date', 100),
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['admin-user-blocks'],
    queryFn: () => base44.entities.UserBlock.filter({ is_active: true }, '-created_date', 100),
  });

  const { data: modActions = [] } = useQuery({
    queryKey: ['admin-moderation-actions'],
    queryFn: () => base44.entities.ModerationAction.filter({}, '-created_date', 100),
  });

  const takeAction = useMutation({
    mutationFn: async ({ report, action, message }) => {
      const now = new Date().toISOString();
      const updates = [];

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
          admin_notes: `Suspended for ${banDuration}h: ${message || ''}`,
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
          reason: `Suspended for ${banDuration}h: ${message || report.description}`,
          duration_hours: parseInt(banDuration),
          is_active: true,
          expires_at: new Date(Date.now() + parseInt(banDuration) * 3600000).toISOString(),
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
          admin_notes: message || 'Report dismissed',
          resolved_date: now,
        }));
      }

      updates.push(base44.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: `moderation_${action}`,
        action_category: 'moderation',
        entity_type: 'UserReport',
        entity_id: report.id,
        details: `Action: ${action} on ${report.reported_user_name || report.reported_user_id}. ${message || ''}`,
        is_security_event: action === 'ban' || action === 'suspend',
        severity: action === 'ban' ? 'critical' : action === 'suspend' ? 'warning' : 'info',
      }));

      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-reports'] });
      qc.invalidateQueries({ queryKey: ['admin-moderation-actions'] });
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
      setActionDialog(null);
      setActionNotes('');
    },
  });

  const resolveFlaggedMessage = useMutation({
    mutationFn: async ({ message, action, reason }) => {
      const updates = [];

      if (action === 'delete') {
        updates.push(base44.entities.CommunityMessage.update(message.id, {
          is_deleted: true,
          is_flagged: false,
          deleted_by: user.id,
        }));
        updates.push(base44.entities.ModerationAction.create({
          community_id: message.community_id,
          moderator_user_id: user.id,
          moderator_name: user.full_name || user.email,
          action_type: 'delete_message',
          target_user_id: message.author_user_id,
          target_user_name: message.author_name,
          target_type: 'message',
          target_id: message.id,
          reason: reason || 'Flagged message deleted by moderator',
        }));
      } else if (action === 'dismiss') {
        updates.push(base44.entities.CommunityMessage.update(message.id, {
          is_flagged: false,
        }));
      }

      updates.push(base44.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: `flagged_message_${action}`,
        action_category: 'moderation',
        entity_type: 'CommunityMessage',
        entity_id: message.id,
        details: `Flagged message ${action === 'delete' ? 'deleted' : 'cleared'}. Author: ${message.author_name}. ${reason || ''}`,
        is_security_event: action === 'delete',
        severity: action === 'delete' ? 'warning' : 'info',
      }));

      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-flagged-messages'] });
      qc.invalidateQueries({ queryKey: ['admin-moderation-actions'] });
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
      setActionDialog(null);
      setActionNotes('');
    },
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const underReviewCount = reports.filter(r => r.status === 'under_review').length;

  const openActionDialog = (report, action) => {
    setActionDialog({ type: 'report', report, action });
    setActionNotes('');
  };

  const openMessageDialog = (message, action) => {
    setActionDialog({ type: 'message', message, action });
    setActionNotes('');
  };

  const submitAction = () => {
    if (actionDialog.type === 'report') {
      takeAction.mutate({ report: actionDialog.report, action: actionDialog.action, message: actionNotes });
    } else {
      resolveFlaggedMessage.mutate({ message: actionDialog.message, action: actionDialog.action, reason: actionNotes });
    }
  };

  const isPending = takeAction.isPending || resolveFlaggedMessage.isPending;
  const dialogActionLabel = actionDialog?.action === 'warn' ? 'Issue Warning'
    : actionDialog?.action === 'suspend' ? 'Suspend User'
    : actionDialog?.action === 'ban' ? 'Ban User'
    : actionDialog?.action === 'review' ? 'Mark Under Review'
    : actionDialog?.action === 'dismiss' ? 'Dismiss'
    : actionDialog?.action === 'delete' ? 'Delete Message'
    : 'Confirm';

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Flag, label: 'Pending Reports', value: pendingCount, color: 'text-neon-magenta' },
          { icon: Eye, label: 'Under Review', value: underReviewCount, color: 'text-neon-purple' },
          { icon: MessageSquare, label: 'Flagged Messages', value: flaggedMessages.length, color: 'text-neon-cyan' },
          { icon: UserX, label: 'Active Blocks', value: blocks.length, color: 'text-neon-blue' },
        ].map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} hover={false} className="p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-secondary/30 rounded-lg p-1 overflow-x-auto">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Unified Queue */}
      {subTab === 'queue' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              All pending reports and flagged content in one prioritized queue.
            </p>
            <NeonBadge color="magenta">
              {reports.filter(r => r.status === 'pending' || r.status === 'under_review').length + flaggedMessages.length} items
            </NeonBadge>
          </div>

          {loadingReports || loadingFlagged ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {[
                ...reports
                  .filter(r => r.status === 'pending' || r.status === 'under_review')
                  .map(r => ({
                    key: `report-${r.id}`,
                    type: 'report',
                    subtype: r.report_type,
                    priority: PRIORITY_RANK[r.report_type] || 7,
                    title: r.reported_user_name || r.reported_user_id?.slice(0, 8),
                    description: r.description,
                    contextUrl: r.context_url,
                    createdAt: r.created_date,
                    status: r.status,
                    raw: r,
                  })),
                ...flaggedMessages.map(m => ({
                  key: `msg-${m.id}`,
                  type: 'flagged_message',
                  subtype: 'flagged',
                  priority: 4,
                  title: m.author_name || 'Unknown',
                  description: m.body,
                  contextUrl: null,
                  createdAt: m.created_date,
                  status: 'flagged',
                  raw: m,
                })),
              ]
                .sort((a, b) => {
                  if (a.priority !== b.priority) return a.priority - b.priority;
                  return new Date(a.createdAt) - new Date(b.createdAt);
                })
                .map(item => (
                  <GlassCard key={item.key} hover={false}
                    className={`p-4 ${item.priority <= 2 ? 'border-destructive/30' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                        item.priority <= 2 ? 'bg-destructive' :
                        item.priority <= 4 ? 'bg-neon-magenta' :
                        'bg-neon-purple'
                      }`} />
                      <div className="min-w-0 flex-1">
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
                          {item.status === 'under_review' && <NeonBadge color="purple">Under Review</NeonBadge>}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
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
                          {item.type === 'report' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => openActionDialog(item.raw, 'warn')}>
                                <AlertTriangle className="w-3 h-3" />Warn
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => openActionDialog(item.raw, 'suspend')}>
                                <Ban className="w-3 h-3" />Suspend
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                                onClick={() => openActionDialog(item.raw, 'ban')}>
                                <ShieldAlert className="w-3 h-3" />Ban
                              </Button>
                              {item.status !== 'under_review' && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                                  onClick={() => openActionDialog(item.raw, 'review')}>
                                  <Eye className="w-3 h-3" />Review
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                                onClick={() => openActionDialog(item.raw, 'dismiss')}>
                                <XCircle className="w-3 h-3" />Dismiss
                              </Button>
                            </>
                          )}
                          {item.type === 'flagged_message' && (
                            <>
                              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                                onClick={() => openMessageDialog(item.raw, 'delete')}>
                                <XCircle className="w-3 h-3" />Delete
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                                onClick={() => openMessageDialog(item.raw, 'dismiss')}>
                                <CheckCircle2 className="w-3 h-3" />Clear Flag
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 mt-1" />
                    </div>
                  </GlassCard>
                ))}
              {reports.filter(r => r.status === 'pending' || r.status === 'under_review').length === 0 && flaggedMessages.length === 0 && (
                <GlassCard hover={false} className="p-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-neon-turquoise/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">Queue is clear!</p>
                  <p className="text-xs text-muted-foreground mt-1">No items need moderation right now.</p>
                </GlassCard>
              )}
            </>
          )}
        </div>
      )}

      {/* User Reports */}
      {subTab === 'reports' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved_warning">Resolved (Warning)</SelectItem>
                <SelectItem value="resolved_banned">Resolved (Banned)</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingReports ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : reports.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-neon-turquoise/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports matching this filter.</p>
            </GlassCard>
          ) : (
            reports.map(report => (
              <GlassCard key={report.id} hover={false} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <NeonBadge color={REPORT_TYPE_COLORS[report.report_type] || 'blue'}>
                        {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                      </NeonBadge>
                      <NeonBadge color={STATUS_COLORS[report.status] || 'blue'}>
                        {report.status.replace(/_/g, ' ')}
                      </NeonBadge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(report.created_date).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      Reported: {report.reported_user_name || report.reported_user_id?.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                    {report.context_url && (
                      <a href={report.context_url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-neon-cyan hover:underline mt-1 inline-block">
                        View context →
                      </a>
                    )}
                    {report.admin_notes && (
                      <p className="text-[10px] text-muted-foreground mt-2 italic">
                        Admin notes: {report.admin_notes}
                      </p>
                    )}
                  </div>
                </div>

                {report.status === 'pending' || report.status === 'under_review' ? (
                  <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-border/30">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => openActionDialog(report, 'warn')}>
                      <AlertTriangle className="w-3 h-3" />Warn
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => openActionDialog(report, 'suspend')}>
                      <Ban className="w-3 h-3" />Suspend
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                      onClick={() => openActionDialog(report, 'ban')}>
                      <ShieldAlert className="w-3 h-3" />Ban
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                      onClick={() => openActionDialog(report, 'review')}>
                      <Eye className="w-3 h-3" />Under Review
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                      onClick={() => openActionDialog(report, 'dismiss')}>
                      <XCircle className="w-3 h-3" />Dismiss
                    </Button>
                  </div>
                ) : null}
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Flagged Messages */}
      {subTab === 'flagged' && (
        <div className="space-y-3">
          {loadingFlagged ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : flaggedMessages.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-neon-turquoise/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No flagged messages. All clear!</p>
            </GlassCard>
          ) : (
            flaggedMessages.map(msg => (
              <GlassCard key={msg.id} hover={false} className="p-4 border-neon-magenta/20">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="w-3.5 h-3.5 text-neon-magenta" />
                  <span className="text-sm font-medium">{msg.author_name || 'Unknown'}</span>
                  {msg.author_role && <NeonBadge color="blue">{msg.author_role}</NeonBadge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(msg.created_date).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 bg-secondary/30 rounded-lg p-3 mb-2">
                  {msg.body}
                </p>
                {msg.flagged_reason && (
                  <p className="text-[10px] text-neon-magenta mb-2">Flag reason: {msg.flagged_reason}</p>
                )}
                <div className="flex gap-2 mt-2 pt-2 border-t border-border/30">
                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                    onClick={() => openMessageDialog(msg, 'delete')}>
                    <XCircle className="w-3 h-3" />Delete Message
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                    onClick={() => openMessageDialog(msg, 'dismiss')}>
                    <CheckCircle2 className="w-3 h-3" />Clear Flag
                  </Button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* User Blocks */}
      {subTab === 'blocks' && (
        <div className="space-y-2">
          {blocks.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <UserX className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active user blocks.</p>
            </GlassCard>
          ) : (
            blocks.map(block => (
              <GlassCard key={block.id} hover={false} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{block.blocked_user_name || block.blocked_user_id?.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Blocked by: {block.blocker_user_id?.slice(0, 8)} · Reason: {block.reason?.replace(/_/g, ' ') || 'N/A'}
                  </p>
                </div>
                <NeonBadge color="magenta">Active</NeonBadge>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Action History */}
      {subTab === 'history' && (
        <div className="space-y-2">
          {modActions.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <Gavel className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No moderation actions recorded.</p>
            </GlassCard>
          ) : (
            modActions.map(a => (
              <GlassCard key={a.id} hover={false} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <NeonBadge color={
                        a.action_type === 'ban' ? 'magenta' :
                        a.action_type === 'warn' ? 'cyan' :
                        a.action_type === 'mute' ? 'purple' :
                        a.action_type.includes('delete') ? 'magenta' : 'blue'
                      }>
                        {a.action_type.replace(/_/g, ' ')}
                      </NeonBadge>
                      <span className="text-sm font-medium">
                        {a.moderator_name} → {a.target_user_name || a.target_type}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(a.created_date).toLocaleString()}
                      {a.duration_hours && ` · ${a.duration_hours}h duration`}
                      {a.is_active ? ' · Active' : ' · Expired/Lifted'}
                    </p>
                    {a.reason && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{a.reason}</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))
          )}
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
              {dialogActionLabel}
            </DialogTitle>
          </DialogHeader>

          {actionDialog?.type === 'report' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You are about to <span className="font-medium text-foreground">{actionDialog.action}</span>{' '}
                user <span className="font-medium text-foreground">{actionDialog.report.reported_user_name || actionDialog.report.reported_user_id?.slice(0, 8)}</span>.
              </p>
              {actionDialog.action === 'suspend' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Duration (hours):</span>
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
                placeholder="Add notes or reason (visible in admin logs)..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {actionDialog?.type === 'message' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {actionDialog.action === 'delete'
                  ? 'This message will be permanently deleted and the author will have a moderation action recorded.'
                  : 'The flag will be cleared and the message will remain visible.'}
              </p>
              <p className="text-sm bg-secondary/30 rounded-lg p-3">{actionDialog.message.body}</p>
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
    </div>
  );
}