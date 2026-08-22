import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Download, Music, FileAudio, Disc3, Play, Check, Clock } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';

export default function RadioDownloadsCenter({ programmerProfile }) {
  const [selectedFormat, setSelectedFormat] = useState('wav');
  const queryClient = useQueryClient();

  const { data: songs = [] } = useQuery({
    queryKey: ['radio-downloadable-songs'],
    queryFn: () => base44.entities.Song.list('-created_date', 50),
  });

  const { data: myDownloads = [] } = useQuery({
    queryKey: ['my-downloads', programmerProfile?.id],
    queryFn: () => base44.entities.RadioDownload.filter({
      programmer_id: programmerProfile?.id,
      activity_type: { $in: ['downloaded', 'streamed'] }
    }, '-created_date', 100),
    enabled: !!programmerProfile?.id,
  });

  const downloadMutation = useMutation({
    mutationFn: async ({ song, format }) => {
      await base44.entities.RadioDownload.create({
        programmer_id: programmerProfile.id,
        programmer_name: programmerProfile.station_name,
        station_name: programmerProfile.station_name,
        artist_profile_id: song.artist_profile_id || '',
        artist_name: song.artist_name,
        song_id: song.id,
        song_title: song.title,
        download_type: song.version_type || 'full_track',
        download_format: format,
        activity_type: 'downloaded',
        radio_status: 'received',
        metadata_snapshot: {
          bpm: song.bpm,
          key_signature: song.key_signature,
          genre: song.genre,
          mood: song.mood,
          duration_seconds: song.duration_seconds,
          isrc: song.isrc,
          explicit: song.explicit_flag,
          vocal_type: song.vocal_type,
        },
        is_private: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-downloads'] });
    },
  });

  const downloadedSongIds = myDownloads.map(d => d.song_id);

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-neon-cyan" />
            Download Center
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">WAV & MP3 downloads with full metadata</p>
        </div>
        <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
          <button
            onClick={() => setSelectedFormat('wav')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selectedFormat === 'wav' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-muted-foreground'}`}
          >
            WAV
          </button>
          <button
            onClick={() => setSelectedFormat('mp3')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selectedFormat === 'mp3' ? 'bg-neon-purple/20 text-neon-purple' : 'text-muted-foreground'}`}
          >
            MP3
          </button>
        </div>
      </div>

      {songs.length > 0 ? (
        <div className="space-y-3">
          {songs.map(song => {
            const isDownloaded = downloadedSongIds.includes(song.id);
            return (
              <GlassCard key={song.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary/30 flex-shrink-0">
                    {song.cover_art ? (
                      <img src={song.cover_art} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc3 className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{song.title}</h3>
                      <NeonBadge color="cyan">{song.artist_name}</NeonBadge>
                      {song.genre && <NeonBadge color="purple">{song.genre}</NeonBadge>}
                      {song.explicit_flag && <NeonBadge color="magenta">Explicit</NeonBadge>}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3 text-xs">
                      <MetaItem label="BPM" value={song.bpm || '--'} />
                      <MetaItem label="Key" value={song.key_signature || '--'} />
                      <MetaItem label="Mood" value={song.mood || '--'} />
                      <MetaItem label="Length" value={formatDuration(song.duration_seconds)} />
                      <MetaItem label="Vocals" value={song.vocal_type || '--'} />
                      <MetaItem label="ISRC" value={song.isrc || '--'} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {isDownloaded ? (
                      <NeonBadge color="turquoise" className="px-3 py-1.5">
                        <Check className="w-3 h-3 mr-1 inline" /> Downloaded
                      </NeonBadge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => downloadMutation.mutate({ song, format: selectedFormat })}
                        disabled={downloadMutation.isPending}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        {selectedFormat.toUpperCase()}
                      </Button>
                    )}
                    {song.audio_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={song.audio_url} target="_blank" rel="noopener noreferrer">
                          <Play className="w-3 h-3 mr-1" /> Preview
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard hover={false} className="p-12 text-center">
          <FileAudio className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-cyan" />
          <p className="text-sm text-muted-foreground">No tracks available for download yet</p>
        </GlassCard>
      )}

      {/* Download History */}
      {myDownloads.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display font-semibold text-xs text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" /> Download History ({myDownloads.length})
          </h3>
          <GlassCard hover={false} className="divide-y divide-border/30">
            {myDownloads.slice(0, 10).map(dl => (
              <div key={dl.id} className="p-3 flex items-center gap-3 text-xs">
                <Music className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate flex-1">{dl.song_title}</span>
                <NeonBadge color={dl.download_format === 'wav' ? 'cyan' : 'purple'}>
                  {(dl.download_format || 'mp3').toUpperCase()}
                </NeonBadge>
                <span className="text-muted-foreground">{new Date(dl.created_date).toLocaleDateString()}</span>
              </div>
            ))}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="bg-secondary/20 rounded-md px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">{label}</p>
      <p className="text-foreground font-medium truncate">{value}</p>
    </div>
  );
}