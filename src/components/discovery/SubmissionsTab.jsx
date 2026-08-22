import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send, Clock, Bookmark, CheckCircle2, XCircle, Sparkles, Music, ChevronDown, ChevronRight
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const STATUS_CONFIG = {
  pending:         { label: 'Pending',      color: 'blue',      icon: Clock },
  saved_for_later: { label: 'Saved',        color: 'cyan',      icon: Bookmark },
  accepted:        { label: 'Accepted',     color: 'turquoise', icon: CheckCircle2 },
  rejected:        { label: 'Rejected',     color: 'purple',    icon: XCircle },
  featured:        { label: 'Featured',     color: 'magenta',   icon: Sparkles },
  recommended:     { label: 'Recommended',  color: 'cyan',      icon: Send },
};

function SubmissionCard({ submission, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(submission.partner_notes || '');
  const cfg = STATUS_CONFIG[submission.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <GlassCard hover={false} className="p-4">
      <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
            <Music className="w-4 h-4 text-neon-purple" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{submission.artist_name}</p>
            <p className="text-[11px] text-muted-foreground">{submission.genre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <NeonBadge color={cfg.color}><Icon className="w-3 h-3 mr-1 inline" />{cfg.label}</NeonBadge>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4 space-y-3 border-t border-border/30 mt-3">
              {submission.artist_message && (
                <div className="bg-secondary/20 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground mb-1 font-medium">Artist's Message</p>
                  <p className="text-xs">{submission.artist_message}</p>
                </div>
              )}
              {submission.press_info && (
                <div className="bg-secondary/20 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground mb-1 font-medium">Press Info</p>
                  <p className="text-xs">{submission.press_info}</p>
                </div>
              )}
              <Textarea placeholder="Your private notes..." value={notes}
                onChange={e => setNotes(e.target.value)} className="text-xs min-h-[60px] bg-secondary/20" />
              <div className="flex flex-wrap gap-2">
                {['accepted', 'saved_for_later', 'featured', 'recommended', 'rejected'].map(s => {
                  const c = STATUS_CONFIG[s]; const SI = c.icon;
                  return (
                    <Button key={s} size="sm" variant={submission.status === s ? 'default' : 'outline'}
                      className="text-xs h-7 gap-1" onClick={() => onUpdateStatus(submission.id, s, notes)}>
                      <SI className="w-3 h-3" />{c.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

export default function SubmissionsTab({ submissions, partnerId }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

  const updateSubmission = useMutation({
    mutationFn: ({ id, status, partner_notes }) =>
      base44.entities.ArtistSubmission.update(id, { status, partner_notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dp-submissions'] }),
  });

  const filtered = statusFilter === 'all' ? submissions : submissions.filter(s => s.status === statusFilter);
  const pending = submissions.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-neon-purple" />
          <h2 className="font-display font-semibold text-sm">Artist Submissions</h2>
          {pending > 0 && <NeonBadge color="magenta">{pending} new</NeonBadge>}
        </div>
        <div className="flex flex-wrap gap-1">
          {['all', 'pending', 'saved_for_later', 'accepted', 'featured', 'recommended', 'rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors
                ${statusFilter === s ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Send className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {statusFilter === 'all' ? 'No submissions yet.' : `No ${statusFilter.replace(/_/g, ' ')} submissions.`}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <SubmissionCard key={s.id} submission={s}
              onUpdateStatus={(id, status, notes) => updateSubmission.mutate({ id, status, partner_notes: notes })} />
          ))}
        </div>
      )}
    </div>
  );
}