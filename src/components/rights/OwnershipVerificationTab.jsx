import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, ShieldAlert, Clock, FileCheck, Users, Globe, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function OwnershipVerificationTab({ artistProfile }) {
  const queryClient = useQueryClient();

  const { data: mySongs = [], isLoading } = useQuery({
    queryKey: ['catalog-songs-verify', artistProfile?.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile?.id }),
    enabled: !!artistProfile?.id,
  });

  const { data: allSplits = [] } = useQuery({
    queryKey: ['all-splits-verify', artistProfile?.id],
    queryFn: async () => {
      const results = [];
      for (const song of mySongs) {
        const splits = await base44.entities.SplitSheet.filter({ song_id: song.id, is_active: true });
        results.push(...splits);
      }
      return results;
    },
    enabled: !!mySongs.length,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ songId }) => base44.functions.invoke('processRightsAction', {
      action: 'verify_ownership',
      song_id: songId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-songs-verify'] });
      queryClient.invalidateQueries({ queryKey: ['all-splits-verify'] });
      toast.success('Ownership verification processed');
    },
  });

  const requestApprovalMutation = useMutation({
    mutationFn: (splitId) => base44.functions.invoke('processRightsAction', {
      action: 'request_co_owner_approval',
      split_id: splitId,
    }),
    onSuccess: () => {
      toast.success('Co-owner approval request sent');
    },
  });

  const verifySplitMutation = useMutation({
    mutationFn: (splitId) => base44.functions.invoke('processRightsAction', {
      action: 'verify_split',
      split_id: splitId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-splits-verify'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-songs-verify'] });
      toast.success('Split ownership verified');
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>;
  }

  const verifiedCount = mySongs.filter(s => s.rights_verified).length;
  const pendingCount = mySongs.filter(s => !s.rights_verified && allSplits.some(sp => sp.song_id === s.id)).length;
  const noSplitsCount = mySongs.filter(s => !allSplits.some(sp => sp.song_id === s.id)).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-neon-turquoise" />
          Ownership Verification
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Verify ownership and manage co-owner approvals</p>
      </div>

      {/* Verification Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover={false} className="p-3 text-center">
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-neon-turquoise" />
          <p className="text-lg font-display font-bold text-neon-turquoise">{verifiedCount}</p>
          <p className="text-[10px] text-muted-foreground">Verified</p>
        </GlassCard>
        <GlassCard hover={false} className="p-3 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
          <p className="text-lg font-display font-bold text-yellow-500">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </GlassCard>
        <GlassCard hover={false} className="p-3 text-center">
          <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-neon-magenta" />
          <p className="text-lg font-display font-bold text-neon-magenta">{noSplitsCount}</p>
          <p className="text-[10px] text-muted-foreground">No Splits</p>
        </GlassCard>
      </div>

      {/* Song-by-song verification */}
      <div className="space-y-3">
        {mySongs.map(song => {
          const splits = allSplits.filter(s => s.song_id === song.id);
          const allVerified = splits.length > 0 && splits.every(s => s.ownership_verified && s.is_approved);

          return (
            <GlassCard key={song.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{song.title}</h3>
                  {song.rights_verified ? (
                    <NeonBadge color="turquoise"><ShieldCheck className="w-3 h-3 inline mr-0.5" /> Verified</NeonBadge>
                  ) : splits.length === 0 ? (
                    <NeonBadge color="magenta">No Splits</NeonBadge>
                  ) : (
                    <NeonBadge color="blue"><Clock className="w-3 h-3 inline mr-0.5" /> Pending</NeonBadge>
                  )}
                </div>
                {splits.length > 0 && !allVerified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyMutation.mutate({ songId: song.id })}
                    disabled={verifyMutation.isPending}
                  >
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verify Ownership
                  </Button>
                )}
              </div>

              {splits.length > 0 && (
                <div className="space-y-2">
                  {splits.map(split => (
                    <div key={split.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{split.owner_name}</p>
                          <NeonBadge color="purple">{split.rights_type.replace(/_/g, ' ')}</NeonBadge>
                          <span className="text-xs font-mono text-muted-foreground">{split.split_percentage}%</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize">{split.owner_role.replace(/_/g, ' ')}</span>
                          {split.territory && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" /> {split.territory}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {split.ownership_verified ? (
                          <NeonBadge color="turquoise"><CheckCircle2 className="w-3 h-3 inline mr-0.5" /> Verified</NeonBadge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-neon-cyan"
                            onClick={() => verifySplitMutation.mutate(split.id)}
                            disabled={verifySplitMutation.isPending}
                          >
                            <FileCheck className="w-3 h-3 mr-1" /> Verify
                          </Button>
                        )}
                        {!split.is_approved && split.owner_user_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-yellow-500"
                            onClick={() => requestApprovalMutation.mutate(split.id)}
                            disabled={requestApprovalMutation.isPending}
                          >
                            <Users className="w-3 h-3 mr-1" /> Request Approval
                          </Button>
                        )}
                        {split.is_approved && (
                          <NeonBadge color="cyan"><CheckCircle2 className="w-3 h-3 inline mr-0.5" /> Approved</NeonBadge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}