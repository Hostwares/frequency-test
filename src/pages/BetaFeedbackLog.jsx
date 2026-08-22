import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import AccessDenied from '@/components/admin/AccessDenied';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select';
import { MessageSquareText, Inbox } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STATUS_STYLES = {
  new: { color: 'magenta', label: 'New' },
  reviewed: { color: 'cyan', label: 'Reviewed' },
  resolved: { color: 'turquoise', label: 'Resolved' }
};

const TYPE_STYLES = {
  bug: { color: 'magenta', label: 'Bug' },
  suggestion: { color: 'cyan', label: 'Suggestion' },
  other: { color: 'purple', label: 'Other' }
};

function FeedbackRow({ item }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.admin_notes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.BetaFeedback.update(item.id, { status, admin_notes: notes });
      toast({ title: 'Feedback updated' });
      qc.invalidateQueries(['beta-feedback']);
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const s = STATUS_STYLES[status] || STATUS_STYLES.new;
  const t = TYPE_STYLES[item.feedback_type] || TYPE_STYLES.other;

  return (
    <GlassCard hover={false} className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <NeonBadge color={t.color}>{t.label}</NeonBadge>
          <NeonBadge color={s.color}>{s.label}</NeonBadge>
          <span className="text-[11px] text-muted-foreground">
            {new Date(item.created_date).toLocaleString()}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          From <span className="text-foreground/80">{item.user_name || 'Unknown'}</span>
          {item.user_email ? ` · ${item.user_email}` : ''}
        </span>
      </div>

      {item.subject && (
        <h3 className="font-display font-semibold mb-1">{item.subject}</h3>
      )}
      <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-3">{item.message}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground mb-4">
        {item.page_path && <span>Page: <code className="text-foreground/70">{item.page_path}</code></span>}
        {item.user_agent && (
          <span className="max-w-full truncate">Device: {item.user_agent}</span>
        )}
      </div>

      <div className="grid sm:grid-cols-[160px_1fr] gap-3 items-start">
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Admin notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Internal notes…"
          />
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-neon text-white">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </GlassCard>
  );
}

export default function BetaFeedbackLog() {
  const { isAdmin } = useAdminPermissions();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['beta-feedback'],
    queryFn: () => base44.entities.BetaFeedback.list('-created_date', 200)
  });

  if (!isAdmin) return <AccessDenied message="Admin access required to review beta feedback." />;

  const items = (data || []).filter(i =>
    (statusFilter === 'all' || i.status === statusFilter) &&
    (typeFilter === 'all' || i.feedback_type === typeFilter)
  );

  const counts = (data || []).reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});
  const newCount = counts.new || 0;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquareText className="w-6 h-6 text-neon-cyan" />
          <h1 className="text-2xl font-display font-bold">Beta Feedback Log</h1>
          {newCount > 0 && <NeonBadge color="magenta">{newCount} new</NeonBadge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Bug reports and suggestions submitted by beta users across the platform.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="w-40">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="bug">Bugs</SelectItem>
              <SelectItem value="suggestion">Suggestions</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground self-center">
          Showing {items.length} of {data?.length || 0}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No feedback matches these filters.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {items.map(item => <FeedbackRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}