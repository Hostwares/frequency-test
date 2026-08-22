import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Upload, Music, Play, Clock, TrendingUp, Disc3 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import SongUploadForm from '@/components/catalog/SongUploadForm';
import SongRow from '@/components/shared/SongRow';
import { Button } from '@/components/ui/button';

export default function UploadManager({ artistProfile }) {
  const [showUpload, setShowUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: songs = [] } = useQuery({
    queryKey: ['upload-manager-songs', artistProfile?.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile?.id }, '-created_date'),
    enabled: !!artistProfile?.id,
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['upload-manager-releases', artistProfile?.id],
    queryFn: () => base44.entities.Release.filter({ artist_profile_id: artistProfile?.id }, '-created_date'),
    enabled: !!artistProfile?.id,
  });

  const totalPlays = songs.reduce((sum, s) => sum + (s.play_count || 0), 0);
  const recentUploads = songs.slice(0, 10);

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['upload-manager-songs'] });
    queryClient.invalidateQueries({ queryKey: ['my-songs'] });
    setShowUpload(false);
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard hover={false} className="p-4 text-center">
          <Music className="w-5 h-5 text-neon-purple mx-auto mb-2" />
          <p className="text-xl font-bold">{songs.length}</p>
          <p className="text-xs text-muted-foreground">Total Tracks</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Disc3 className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
          <p className="text-xl font-bold">{releases.length}</p>
          <p className="text-xs text-muted-foreground">Releases</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Play className="w-5 h-5 text-neon-magenta mx-auto mb-2" />
          <p className="text-xl font-bold">{totalPlays.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Plays</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Clock className="w-5 h-5 text-neon-turquoise mx-auto mb-2" />
          <p className="text-xl font-bold">{recentUploads.filter(s => {
            const d = new Date(s.created_date);
            return (new Date() - d) / (1000 * 60 * 60 * 24) <= 7;
          }).length}</p>
          <p className="text-xs text-muted-foreground">Uploaded This Week</p>
        </GlassCard>
      </div>

      {/* Upload Button */}
      <GlassCard hover={false} className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
              <Upload className="w-6 h-6 text-neon-purple" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Upload New Track</h3>
              <p className="text-xs text-muted-foreground">Add a new song, demo, remix, or alternate version to your catalog</p>
            </div>
          </div>
          <Button
            onClick={() => setShowUpload(true)}
            className="gap-2 bg-gradient-neon"
          >
            <Upload className="w-4 h-4" />
            Upload Song
          </Button>
        </div>
      </GlassCard>

      {/* Recent Uploads */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-neon-cyan" />
          <h3 className="font-display font-semibold text-sm">Recent Uploads</h3>
          <NeonBadge color="purple">{songs.length} total</NeonBadge>
        </div>
        {recentUploads.length > 0 ? (
          <GlassCard hover={false} className="divide-y divide-border/30">
            {recentUploads.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} showArtist={false} queue={recentUploads} />
            ))}
          </GlassCard>
        ) : (
          <GlassCard hover={false} className="p-12 text-center">
            <Music className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No songs uploaded yet</p>
            <p className="text-xs text-muted-foreground/60">Click "Upload Song" to add your first track</p>
          </GlassCard>
        )}
      </div>

      <SongUploadForm
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSaved={handleSaved}
        artistProfile={artistProfile}
      />
    </div>
  );
}