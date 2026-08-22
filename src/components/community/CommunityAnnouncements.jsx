import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Megaphone, Plus, Pin, X, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const PRIORITY_CONFIG = {
  low: { color: 'blue', label: 'Low' },
  normal: { color: 'cyan', label: 'Normal' },
  high: { color: 'magenta', label: 'High' },
  urgent: { color: 'purple', label: 'Urgent' },
};

export default function CommunityAnnouncements({ community, currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', priority: 'normal' });

  const isManager = community.manager_user_id === currentUser?.id;

  const { data: announcements = [] } = useQuery({
    queryKey: ['community-announcements', community.id],
    queryFn: () => base44.entities.CommunityAnnouncement.filter(
      { community_id: community.id, is_active: true },
      '-created_date',
      50
    ),
  });

  const createAnnouncement = useMutation({
    mutationFn: (data) => base44.entities.CommunityAnnouncement.create(data),
    onSuccess: () => {
      setShowForm(false);
      setForm({ title: '', body: '', priority: 'normal' });
      qc.invalidateQueries({ queryKey: ['community-announcements', community.id] });
    },
  });

  const deleteAnnouncement = useMutation({
    mutationFn: (id) => base44.entities.CommunityAnnouncement.update(id, { is_active: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-announcements', community.id] }),
  });

  const togglePin = useMutation({
    mutationFn: ({ id, pinned }) => base44.entities.CommunityAnnouncement.update(id, { is_pinned: !pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-announcements', community.id] }),
  });

  const handleCreate = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    createAnnouncement.mutate({
      ...form,
      community_id: community.id,
      author_user_id: currentUser.id,
      author_name: currentUser.full_name || currentUser.email,
    });
  };

  const pinned = announcements.filter(a => a.is_pinned);
  const regular = announcements.filter(a => !a.is_pinned);

  const AnnouncementCard = ({ a }) => {
    const prio = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.normal;
    const isUrgent = a.priority === 'urgent';
    return (
      <GlassCard hover={false} className={`p-4 ${isUrgent ? 'border-destructive/30 bg-destructive/5' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {a.is_pinned && <Pin className="w-3 h-3 text-neon-purple" />}
              {isUrgent && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
              <NeonBadge color={prio.color}>{prio.label}</NeonBadge>
            </div>
            <h4 className="font-medium text-sm">{a.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
            <p className="text-[10px] text-muted-foreground mt-2">
              by {a.author_name} · {new Date(a.created_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          {isManager && (
            <div className="flex flex-col gap-1">
              <button onClick={() => togglePin.mutate({ id: a.id, pinned: a.is_pinned })}
                className="p-1 hover:text-neon-purple" title="Pin">
                <Pin className={`w-3.5 h-3.5 ${a.is_pinned ? 'fill-current text-neon-purple' : ''}`} />
              </button>
              <button onClick={() => deleteAnnouncement.mutate(a.id)}
                className="p-1 hover:text-destructive" title="Remove">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </GlassCard>
    );
  };

  return (
    <div className="space-y-3">
      {/* Urgent banner */}
      {pinned.some(a => a.priority === 'urgent') && (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg">
          <Bell className="w-4 h-4 text-destructive animate-pulse" />
          <p className="text-xs text-destructive font-medium">Urgent announcements — please read.</p>
        </div>
      )}

      {isManager && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            {showForm ? <><X className="w-3.5 h-3.5" />Cancel</> : <><Plus className="w-3.5 h-3.5" />New Announcement</>}
          </Button>
        </div>
      )}

      {showForm && (
        <GlassCard hover={false} className="p-4 space-y-3 border-primary/20">
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" />
          <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your announcement..." rows={3} />
          <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleCreate} disabled={!form.title.trim() || !form.body.trim() || createAnnouncement.isPending}>
            Post Announcement
          </Button>
        </GlassCard>
      )}

      {announcements.length === 0 && !showForm ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Megaphone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        </GlassCard>
      ) : (
        <>
          {pinned.length > 0 && <div className="space-y-2">{pinned.map(a => <AnnouncementCard key={a.id} a={a} />)}</div>}
          {regular.length > 0 && <div className="space-y-2">{regular.map(a => <AnnouncementCard key={a.id} a={a} />)}</div>}
        </>
      )}
    </div>
  );
}