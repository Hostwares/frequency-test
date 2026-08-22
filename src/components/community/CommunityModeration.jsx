import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Shield, Gavel, Ban, MessageSquareOff, Flag, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const ACTION_LABELS = {
  warn: { label: 'Warning', color: 'blue', icon: Flag },
  mute: { label: 'Muted', color: 'magenta', icon: MessageSquareOff },
  ban: { label: 'Banned', color: 'purple', icon: Ban },
  unmute: { label: 'Unmuted', color: 'turquoise', icon: MessageSquareOff },
  unban: { label: 'Unbanned', color: 'turquoise', icon: Ban },
  delete_message: { label: 'Message Deleted', color: 'magenta', icon: MessageSquareOff },
  remove_photo: { label: 'Photo Removed', color: 'magenta', icon: MessageSquareOff },
  close_poll: { label: 'Poll Closed', color: 'blue', icon: Gavel },
  pin_announcement: { label: 'Announcement Pinned', color: 'cyan', icon: Shield },
  approve_photo: { label: 'Photo Approved', color: 'turquoise', icon: Shield },
  flag_message: { label: 'Message Flagged', color: 'magenta', icon: Flag },
};

export default function CommunityModeration({ community, currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ action_type: 'warn', target_user_name: '', reason: '', duration_hours: '' });

  const isManager = community.manager_user_id === currentUser?.id;

  const { data: actions = [] } = useQuery({
    queryKey: ['moderation-actions', community.id],
    queryFn: () => base44.entities.ModerationAction.filter({ community_id: community.id }, '-created_date', 100),
  });

  const { data: flaggedMessages = [] } = useQuery({
    queryKey: ['flagged-messages', community.id],
    queryFn: () => base44.entities.CommunityMessage.filter(
      { community_id: community.id, is_flagged: true, is_deleted: false },
      '-created_date', 20
    ),
  });

  const { data: flaggedPhotos = [] } = useQuery({
    queryKey: ['flagged-photos', community.id],
    queryFn: () => base44.entities.CommunityPhoto.filter(
      { community_id: community.id, is_flagged: true },
      '-created_date', 20
    ),
  });

  const createAction = useMutation({
    mutationFn: (data) => base44.entities.ModerationAction.create(data),
    onSuccess: () => {
      setShowForm(false);
      setForm({ action_type: 'warn', target_user_name: '', reason: '', duration_hours: '' });
      qc.invalidateQueries({ queryKey: ['moderation-actions', community.id] });
    },
  });

  const removeFlaggedMessage = useMutation({
    mutationFn: (id) => base44.entities.CommunityMessage.update(id, { is_deleted: true, deleted_by: currentUser.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flagged-messages', community.id] });
      qc.invalidateQueries({ queryKey: ['moderation-actions', community.id] });
    },
  });

  const dismissFlag = useMutation({
    mutationFn: ({ type, id }) => {
      if (type === 'message') return base44.entities.CommunityMessage.update(id, { is_flagged: false });
      if (type === 'photo') return base44.entities.CommunityPhoto.update(id, { is_flagged: false });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flagged-messages', community.id] });
      qc.invalidateQueries({ queryKey: ['flagged-photos', community.id] });
    },
  });

  const removeFlaggedPhoto = useMutation({
    mutationFn: (id) => base44.entities.CommunityPhoto.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flagged-photos', community.id] });
      qc.invalidateQueries({ queryKey: ['moderation-actions', community.id] });
    },
  });

  const handleCreate = () => {
    if (!form.reason.trim()) return;
    createAction.mutate({
      community_id: community.id,
      moderator_user_id: currentUser.id,
      moderator_name: currentUser.full_name || currentUser.email,
      action_type: form.action_type,
      target_user_name: form.target_user_name.trim() || undefined,
      target_type: 'user',
      reason: form.reason.trim(),
      duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
      expires_at: form.duration_hours ? new Date(Date.now() + Number(form.duration_hours) * 3600000).toISOString() : undefined,
    });
  };

  if (!isManager) {
    return (
      <GlassCard hover={false} className="p-10 text-center">
        <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Moderation tools are available to community managers only.</p>
      </GlassCard>
    );
  }

  const pendingFlags = flaggedMessages.length + flaggedPhotos.length;

  return (
    <div className="space-y-4">
      {/* Pending flags */}
      {pendingFlags > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Flag className="w-4 h-4 text-destructive" />
            <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider">Pending Flags ({pendingFlags})</h3>
          </div>
          <div className="space-y-2">
            {flaggedMessages.map(m => (
              <GlassCard key={m.id} hover={false} className="p-3 border-destructive/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{m.author_name} · {new Date(m.created_date).toLocaleString()}</p>
                    <p className="text-sm mt-0.5 line-clamp-2">{m.body}</p>
                    {m.flagged_reason && <p className="text-[10px] text-destructive mt-1">Reason: {m.flagged_reason}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismissFlag.mutate({ type: 'message', id: m.id })}>
                      Dismiss
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => removeFlaggedMessage.mutate(m.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
            {flaggedPhotos.map(p => (
              <GlassCard key={p.id} hover={false} className="p-3 border-destructive/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2 flex-1 min-w-0">
                    <img src={p.image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{p.uploader_name}</p>
                      {p.caption && <p className="text-sm">{p.caption}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismissFlag.mutate({ type: 'photo', id: p.id })}>
                      Dismiss
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => removeFlaggedPhoto.mutate(p.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Take action */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Gavel className="w-3.5 h-3.5" />Take Action
        </Button>
      </div>

      {showForm && (
        <GlassCard hover={false} className="p-4 space-y-3 border-primary/20">
          <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ACTION_LABELS).filter(([k]) => ['warn', 'mute', 'ban'].includes(k)).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={form.target_user_name} onChange={e => setForm(f => ({ ...f, target_user_name: e.target.value }))}
            placeholder="Target user name" />
          {(form.action_type === 'mute' || form.action_type === 'ban') && (
            <Input type="number" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
              placeholder="Duration (hours) — leave empty for permanent" />
          )}
          <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="Reason for action..." rows={2} />
          <Button size="sm" onClick={handleCreate} disabled={!form.reason.trim() || createAction.isPending}>
            Apply Action
          </Button>
        </GlassCard>
      )}

      {/* Action history */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Moderation History</h3>
        </div>
        {actions.length === 0 ? (
          <GlassCard hover={false} className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No moderation actions taken yet.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {actions.slice(0, 30).map(a => {
              const info = ACTION_LABELS[a.action_type] || { label: a.action_type, color: 'blue', icon: Shield };
              const Icon = info.icon;
              return (
                <GlassCard key={a.id} hover={false} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-neon-${info.color}/10 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 text-neon-${info.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <NeonBadge color={info.color}>{info.label}</NeonBadge>
                        {a.target_user_name && <span className="text-sm font-medium">{a.target_user_name}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.reason}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        by {a.moderator_name} · {new Date(a.created_date).toLocaleString()}
                        {a.expires_at && ` · expires ${new Date(a.expires_at).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}