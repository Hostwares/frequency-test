import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ShieldAlert, Clock, Loader2, AlertTriangle, CheckCircle2, XCircle,
  FileText, ChevronDown, ChevronUp, Mail, RotateCcw
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import DMCAForm from '@/components/catalog/DMCAForm';
import { toast } from 'sonner';

const DMCA_STATUS = {
  received: { color: 'purple', icon: Clock, label: 'Received' },
  under_review: { color: 'cyan', icon: Loader2, label: 'Under Review' },
  notice_sent_to_artist: { color: 'blue', icon: Mail, label: 'Notice Sent' },
  content_removed: { color: 'magenta', icon: ShieldAlert, label: 'Content Removed' },
  counter_notice_filed: { color: 'blue', icon: AlertTriangle, label: 'Counter-Notice Filed' },
  restored: { color: 'turquoise', icon: RotateCcw, label: 'Content Restored' },
  dismissed: { color: 'purple', icon: XCircle, label: 'Dismissed' },
  escalated: { color: 'blue', icon: AlertTriangle, label: 'Escalated' },
};

export default function DMAPortal({ user, artistProfile }) {
  const [expandedNotice, setExpandedNotice] = useState(null);
  const [showDMCA, setShowDMCA] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const queryClient = useQueryClient();

  const { data: dmcaNotices = [], isLoading } = useQuery({
    queryKey: ['dmca-notices'],
    queryFn: () => base44.entities.DMCANotice.list('-created_date', 50),
  });

  // DMCA notices against the artist's songs
  const { data: incomingDmca = [] } = useQuery({
    queryKey: ['incoming-dmca', artistProfile?.id],
    queryFn: async () => {
      const all = await base44.entities.DMCANotice.list('-created_date', 100);
      return all.filter(d => d.infringing_artist_name && artistProfile?.artist_name &&
        d.infringing_artist_name.toLowerCase() === artistProfile.artist_name.toLowerCase());
    },
    enabled: !!artistProfile?.id,
  });

  const updateDmcaMutation = useMutation({
    mutationFn: ({ id, status, notes }) => base44.entities.DMCANotice.update(id, {
      status,
      resolution_notes: notes,
      ...(status === 'content_removed' ? { content_removed_date: new Date().toISOString() } : {}),
      ...(status === 'notice_sent_to_artist' ? { notice_sent_date: new Date().toISOString() } : {}),
      ...(['restored', 'dismissed', 'escalated'].includes(status) ? { resolved_date: new Date().toISOString() } : {}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dmca-notices'] });
      queryClient.invalidateQueries({ queryKey: ['incoming-dmca'] });
      toast.success('DMCA notice updated');
      setExpandedNotice(null);
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading DMCA notices...</p>;
  }

  const activeNotices = dmcaNotices.filter(d => !['dismissed', 'restored'].includes(d.status));
  const removedCount = dmcaNotices.filter(d => d.status === 'content_removed').length;
  const counterNoticeCount = dmcaNotices.filter(d => d.status === 'counter_notice_filed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            DMCA Portal
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Takedown notices, counter-notices, and content removal</p>
        </div>
        <Button size="sm" variant="outline" className="border-destructive/30 text-destructive" onClick={() => setShowDMCA(true)}>
          <ShieldAlert className="w-3 h-3 mr-1" /> File DMCA
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-3 text-center">
          <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-destructive" />
          <p className="text-lg font-display font-bold text-destructive">{activeNotices.length}</p>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </GlassCard>
        <GlassCard hover={false} className="p-3 text-center">
          <XCircle className="w-4 h-4 mx-auto mb-1 text-neon-magenta" />
          <p className="text-lg font-display font-bold text-neon-magenta">{removedCount}</p>
          <p className="text-[10px] text-muted-foreground">Removed</p>
        </GlassCard>
        <GlassCard hover={false} className="p-3 text-center">
          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-neon-blue" />
          <p className="text-lg font-display font-bold text-neon-blue">{counterNoticeCount}</p>
          <p className="text-[10px] text-muted-foreground">Counter-Notices</p>
        </GlassCard>
        <GlassCard hover={false} className="p-3 text-center">
          <RotateCcw className="w-4 h-4 mx-auto mb-1 text-neon-turquoise" />
          <p className="text-lg font-display font-bold text-neon-turquoise">{dmcaNotices.filter(d => d.status === 'restored').length}</p>
          <p className="text-[10px] text-muted-foreground">Restored</p>
        </GlassCard>
      </div>

      {/* Incoming DMCA (against your content) */}
      {incomingDmca.length > 0 && (
        <GlassCard hover={false} className="p-4 border-destructive/30 bg-destructive/5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Notices Against Your Content ({incomingDmca.length})
          </h3>
          <div className="space-y-2">
            {incomingDmca.map(notice => (
              <DMCARow
                key={notice.id}
                notice={notice}
                isIncoming
                expanded={expandedNotice === notice.id}
                onToggle={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                resolutionNotes={resolutionNotes[notice.id] || ''}
                onNotesChange={(val) => setResolutionNotes({ ...resolutionNotes, [notice.id]: val })}
                onUpdate={updateDmcaMutation.mutate}
                isPending={updateDmcaMutation.isPending}
              />
            ))}
          </div>
        </GlassCard>
      )}

      {/* All DMCA Notices */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          All Notices ({dmcaNotices.length})
        </h3>
        {dmcaNotices.length === 0 ? (
          <GlassCard hover={false} className="p-8 text-center">
            <ShieldAlert className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No DMCA notices filed</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {dmcaNotices.map(notice => (
              <DMCARow
                key={notice.id}
                notice={notice}
                isIncoming={incomingDmca.includes(notice)}
                expanded={expandedNotice === notice.id}
                onToggle={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                resolutionNotes={resolutionNotes[notice.id] || ''}
                onNotesChange={(val) => setResolutionNotes({ ...resolutionNotes, [notice.id]: val })}
                onUpdate={updateDmcaMutation.mutate}
                isPending={updateDmcaMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {showDMCA && <DMCAForm isOpen={showDMCA} onClose={() => setShowDMCA(false)} />}
    </div>
  );
}

function DMCARow({ notice, isIncoming, expanded, onToggle, resolutionNotes, onNotesChange, onUpdate, isPending }) {
  const statusInfo = DMCA_STATUS[notice.status] || DMCA_STATUS.received;
  const StatusIcon = statusInfo.icon;

  return (
    <GlassCard hover={false} className="p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isIncoming && <NeonBadge color="magenta">Incoming</NeonBadge>}
            <h4 className="text-sm font-semibold">{notice.infringing_song_title}</h4>
            <NeonBadge color={statusInfo.color}>
              <StatusIcon className={`w-3 h-3 inline mr-0.5 ${notice.status === 'under_review' ? 'animate-spin' : ''}`} />
              {statusInfo.label}
            </NeonBadge>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            Filed by {notice.complainant_name} · {notice.complainant_email}
          </p>
          <p className="text-xs text-muted-foreground">
            Original work: <span className="text-foreground">{notice.original_work_title}</span>
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{notice.description}</p>

          {notice.content_removed_date && (
            <p className="text-xs text-destructive mt-1">
              <ShieldAlert className="w-3 h-3 inline mr-0.5" />
              Removed: {new Date(notice.content_removed_date).toLocaleDateString()}
            </p>
          )}
          {notice.counter_notice_date && (
            <p className="text-xs text-neon-blue mt-1">
              <AlertTriangle className="w-3 h-3 inline mr-0.5" />
              Counter-notice: {new Date(notice.counter_notice_date).toLocaleDateString()}
            </p>
          )}
        </div>

        <Button size="sm" variant="ghost" onClick={onToggle}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
          {notice.resolution_notes && (
            <div className="p-2 bg-secondary/20 rounded-md">
              <p className="text-xs text-muted-foreground italic">Resolution: {notice.resolution_notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {notice.notice_sent_date && (
              <p>📝 Notice sent: {new Date(notice.notice_sent_date).toLocaleString()}</p>
            )}
            {notice.content_removed_date && (
              <p>🚫 Content removed: {new Date(notice.content_removed_date).toLocaleString()}</p>
            )}
            {notice.counter_notice_date && (
              <p>⚠️ Counter-notice filed: {new Date(notice.counter_notice_date).toLocaleString()}</p>
            )}
            {notice.resolved_date && (
              <p>✅ Resolved: {new Date(notice.resolved_date).toLocaleString()}</p>
            )}
          </div>

          {/* Admin Actions */}
          {!['dismissed', 'restored'].includes(notice.status) && (
            <>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Resolution notes..."
                className="text-xs min-h-[60px]"
              />

              <div className="flex flex-wrap gap-2">
                {notice.status === 'received' && (
                  <Button size="sm" variant="outline" onClick={() => onUpdate({ id: notice.id, status: 'under_review', notes: resolutionNotes })} disabled={isPending}>
                    <Loader2 className="w-3 h-3 mr-1" /> Start Review
                  </Button>
                )}
                {notice.status === 'under_review' && (
                  <Button size="sm" variant="outline" className="text-neon-blue border-neon-blue/30" onClick={() => onUpdate({ id: notice.id, status: 'notice_sent_to_artist', notes: resolutionNotes })} disabled={isPending}>
                    <Mail className="w-3 h-3 mr-1" /> Send Notice
                  </Button>
                )}
                {['under_review', 'notice_sent_to_artist'].includes(notice.status) && (
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => onUpdate({ id: notice.id, status: 'content_removed', notes: resolutionNotes })} disabled={isPending}>
                    <ShieldAlert className="w-3 h-3 mr-1" /> Remove Content
                  </Button>
                )}
                {notice.status === 'content_removed' && (
                  <>
                    <Button size="sm" variant="outline" className="text-neon-blue border-neon-blue/30" onClick={() => onUpdate({ id: notice.id, status: 'counter_notice_filed', notes: resolutionNotes })} disabled={isPending}>
                      <AlertTriangle className="w-3 h-3 mr-1" /> Counter-Notice
                    </Button>
                    <Button size="sm" variant="outline" className="text-neon-turquoise border-neon-turquoise/30" onClick={() => onUpdate({ id: notice.id, status: 'restored', notes: resolutionNotes })} disabled={isPending}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Restore Content
                    </Button>
                  </>
                )}
                {notice.status === 'counter_notice_filed' && (
                  <Button size="sm" variant="outline" className="text-neon-turquoise border-neon-turquoise/30" onClick={() => onUpdate({ id: notice.id, status: 'restored', notes: resolutionNotes })} disabled={isPending}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Restore Content
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onUpdate({ id: notice.id, status: 'dismissed', notes: resolutionNotes })} disabled={isPending}>
                  <XCircle className="w-3 h-3 mr-1" /> Dismiss
                </Button>
                <Button size="sm" variant="outline" onClick={() => onUpdate({ id: notice.id, status: 'escalated', notes: resolutionNotes })} disabled={isPending}>
                  <AlertTriangle className="w-3 h-3 mr-1" /> Escalate
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </GlassCard>
  );
}