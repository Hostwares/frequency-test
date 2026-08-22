import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Copyright, FileText, AlertTriangle, CheckCircle2, Loader2,
  Shield, Gavel, ExternalLink, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

export default function CopyrightPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: dmcaNotices = [], isLoading: dmcaLoading } = useQuery({
    queryKey: ['admin-dmca'],
    queryFn: () => base44.entities.DMCANotice.filter({}, '-created_date', 100),
  });

  const { data: rightsClaims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['admin-rights-claims'],
    queryFn: () => base44.entities.RightsClaim.filter({}, '-created_date', 100),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['admin-songs-copyright'],
    queryFn: () => base44.entities.Song.filter({ has_open_claims: true }, '-created_date', 50),
  });

  const { data: splitSheets = [] } = useQuery({
    queryKey: ['admin-split-sheets'],
    queryFn: () => base44.entities.SplitSheet.filter({}, '-created_date', 50),
  });

  const updateClaim = useMutation({
    mutationFn: async ({ claimId, status }) => {
      return base44.entities.RightsClaim.update(claimId, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rights-claims'] });
      toast.success('Claim status updated');
    },
  });

  const updateDmca = useMutation({
    mutationFn: async ({ noticeId, status }) => {
      return base44.entities.DMCANotice.update(noticeId, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-dmca'] });
      toast.success('DMCA notice updated');
    },
  });

  const pendingDmca = dmcaNotices.filter(d => d.status === 'pending' || d.status === 'submitted');
  const openClaims = rightsClaims.filter(c => c.status === 'open' || c.status === 'pending');
  const verifiedSongs = songs.filter(s => s.rights_verified);
  const unverifiedSongs = songs.filter(s => !s.rights_verified);

  return (
    <div className="space-y-6">
      {/* Copyright Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-4 text-center">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">{pendingDmca.length}</p>
          <p className="text-[10px] text-muted-foreground">Pending DMCA</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Gavel className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400">{openClaims.length}</p>
          <p className="text-[10px] text-muted-foreground">Open Claims</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <CheckCircle2 className="w-4 h-4 text-neon-turquoise mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-turquoise">{verifiedSongs.length}</p>
          <p className="text-[10px] text-muted-foreground">Verified Songs</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <FileText className="w-4 h-4 text-neon-purple mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-purple">{splitSheets.length}</p>
          <p className="text-[10px] text-muted-foreground">Split Sheets</p>
        </GlassCard>
      </div>

      {/* DMCA Notices */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Copyright className="w-4 h-4 text-neon-purple" />
          <h3 className="font-display font-semibold text-sm">DMCA Takedown Notices</h3>
          <NeonBadge color="purple">{dmcaNotices.length}</NeonBadge>
        </div>
        {dmcaLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : dmcaNotices.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {dmcaNotices.map(notice => (
              <div key={notice.id} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{notice.work_title || notice.allegedly_infringing_url || 'DMCA Notice'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      From: {notice.complainant_name || 'Anonymous'} · {new Date(notice.created_date).toLocaleDateString()}
                    </p>
                    {notice.allegedly_infringing_url && (
                      <a href={notice.allegedly_infringing_url} target="_blank" rel="noreferrer" className="text-[10px] text-neon-cyan hover:underline flex items-center gap-1 mt-0.5">
                        <ExternalLink className="w-2.5 h-2.5" /> Reported URL
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <NeonBadge color={
                      notice.status === 'resolved' || notice.status === 'removed' ? 'cyan' :
                      notice.status === 'rejected' ? 'magenta' : 'purple'
                    }>{notice.status || 'pending'}</NeonBadge>
                  </div>
                </div>
                {(notice.status === 'pending' || notice.status === 'submitted') && (
                  <div className="flex gap-1.5 mt-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => updateDmca.mutate({ noticeId: notice.id, status: 'removed' })}>
                      Approve Takedown
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs"
                      onClick={() => updateDmca.mutate({ noticeId: notice.id, status: 'rejected' })}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No DMCA notices filed</p>
        )}
      </GlassCard>

      {/* Rights Claims */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gavel className="w-4 h-4 text-red-400" />
          <h3 className="font-display font-semibold text-sm">Rights & Ownership Claims</h3>
          <NeonBadge color="magenta">{rightsClaims.length}</NeonBadge>
        </div>
        {claimsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : rightsClaims.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {rightsClaims.map(claim => (
              <div key={claim.id} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{claim.claim_title || claim.song_title || 'Rights Claim'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Claimant: {claim.claimant_name || 'Unknown'} · {new Date(claim.created_date).toLocaleDateString()}
                    </p>
                    {claim.description && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-2">{claim.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <NeonBadge color={
                      claim.status === 'resolved' ? 'cyan' :
                      claim.status === 'open' || claim.status === 'pending' ? 'magenta' : 'purple'
                    }>{claim.status || 'open'}</NeonBadge>
                    {(claim.status === 'open' || claim.status === 'pending') && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px]"
                        onClick={() => updateClaim.mutate({ claimId: claim.id, status: 'resolved' })}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No rights claims filed</p>
        )}
      </GlassCard>

      {/* Split Sheets Summary */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-neon-cyan" />
          <h3 className="font-display font-semibold text-sm">Split Sheet Registry</h3>
          <NeonBadge color="cyan">{splitSheets.length}</NeonBadge>
        </div>
        {splitSheets.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {splitSheets.slice(0, 10).map(ss => (
              <div key={ss.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 text-xs">
                <div>
                  <p className="font-medium">{ss.song_title || 'Untitled'}</p>
                  <p className="text-[10px] text-muted-foreground">{ss.artist_name || 'Unknown artist'}</p>
                </div>
                <NeonBadge color={ss.is_verified ? 'cyan' : 'magenta'}>
                  {ss.is_verified ? 'Verified' : 'Pending'}
                </NeonBadge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No split sheets registered</p>
        )}
      </GlassCard>
    </div>
  );
}