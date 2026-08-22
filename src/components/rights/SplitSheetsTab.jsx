import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Plus, CheckCircle2, Clock, ShieldCheck, ChevronRight, AlertTriangle } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import SplitSheetManager from '@/components/catalog/SplitSheetManager';
import { toast } from 'sonner';

const RIGHTS_TYPES = [
  { value: 'master_ownership', label: 'Master' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'neighboring', label: 'Neighboring' },
  { value: 'performance', label: 'Performance' },
  { value: 'synchronization', label: 'Sync' },
];

export default function SplitSheetsTab({ artistProfile }) {
  const [selectedSong, setSelectedSong] = useState(null);
  const queryClient = useQueryClient();

  const { data: mySongs = [], isLoading } = useQuery({
    queryKey: ['catalog-songs', artistProfile?.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile?.id }),
    enabled: !!artistProfile?.id,
  });

  const { data: allSplits = [] } = useQuery({
    queryKey: ['all-splits', artistProfile?.id],
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

  const verifyOwnershipMutation = useMutation({
    mutationFn: (songId) => base44.functions.invoke('processRightsAction', {
      action: 'verify_ownership',
      song_id: songId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-songs'] });
      queryClient.invalidateQueries({ queryKey: ['all-splits'] });
      toast.success('Ownership verification updated');
    },
  });

  const getSongSplits = (songId) => allSplits.filter(s => s.song_id === songId);
  const getSongRightsTypes = (songId) => {
    const splits = getSongSplits(songId);
    return RIGHTS_TYPES.filter(rt => splits.some(s => s.rights_type === rt.value));
  };
  const isFullyVerified = (songId) => {
    const splits = getSongSplits(songId);
    return splits.length > 0 && splits.every(s => s.ownership_verified && s.is_approved);
  };
  const hasUnapproved = (songId) => getSongSplits(songId).some(s => !s.is_approved);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading catalog...</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-neon-purple" />
            Split Sheets
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage ownership splits across all rights categories</p>
        </div>
      </div>

      {mySongs.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No songs in your catalog yet</p>
        </GlassCard>
      ) : (
        mySongs.map(song => {
          const splits = getSongSplits(song.id);
          const rightsTypes = getSongRightsTypes(song.id);
          const verified = isFullyVerified(song.id);
          const unapproved = hasUnapproved(song.id);

          return (
            <GlassCard key={song.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary/30 flex-shrink-0">
                  {song.cover_art ? (
                    <img src={song.cover_art} alt={song.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{song.title}</h3>
                    {verified ? (
                      <NeonBadge color="turquoise"><ShieldCheck className="w-3 h-3 inline mr-0.5" /> Verified</NeonBadge>
                    ) : splits.length === 0 ? (
                      <NeonBadge color="magenta">No Splits</NeonBadge>
                    ) : unapproved ? (
                      <NeonBadge color="blue"><Clock className="w-3 h-3 inline mr-0.5" /> Pending Approval</NeonBadge>
                    ) : (
                      <NeonBadge color="purple"><AlertTriangle className="w-3 h-3 inline mr-0.5" /> Unverified</NeonBadge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {rightsTypes.length > 0 ? rightsTypes.map(rt => {
                      const rtSplits = splits.filter(s => s.rights_type === rt.value);
                      const total = rtSplits.reduce((sum, s) => sum + (s.split_percentage || 0), 0);
                      return (
                        <div key={rt.value} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/30 text-xs">
                          <span className="text-muted-foreground">{rt.label}</span>
                          <span className={`font-mono ${total === 100 ? 'text-neon-cyan' : 'text-yellow-500'}`}>{total}%</span>
                          <span className="text-muted-foreground/60">({rtSplits.length})</span>
                        </div>
                      );
                    }) : (
                      <p className="text-xs text-muted-foreground">No split entries yet</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setSelectedSong(song)}>
                    <FileText className="w-3 h-3 mr-1" /> Manage
                  </Button>
                  {splits.length > 0 && !verified && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-neon-cyan"
                      onClick={() => verifyOwnershipMutation.mutate(song.id)}
                      disabled={verifyOwnershipMutation.isPending}
                    >
                      <ShieldCheck className="w-3 h-3 mr-1" /> Verify
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })
      )}

      {selectedSong && artistProfile && (
        <SplitSheetManager
          song={selectedSong}
          artistProfile={artistProfile}
          isOpen={!!selectedSong}
          onClose={() => setSelectedSong(null)}
        />
      )}
    </div>
  );
}