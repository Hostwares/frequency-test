import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Headphones, Users, Radio, Compass, Disc3, Music2, Calendar, Award } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { FirstReleasedBadge } from '@/components/shared/MainstreamFirstBadge';

/**
 * Permanent Discovery History panel for a song.
 * Displays the song's legacy: first listeners, original supporters, discovery partners,
 * radio programmers, frequency communities, first playlist, and first release date.
 */
export default function SongDiscoveryHistory({ song }) {
  const { data: discoveryRecord } = useQuery({
    queryKey: ['discovery-record', song?.id],
    queryFn: () => base44.entities.DiscoveryRecord.filter({ song_id: song?.id }),
    enabled: !!song?.id,
    select: (data) => data?.[0],
  });

  // Don't render if the song isn't a Heard First / Mainstream First track
  const isMainstreamTrack = song?.mainstream_first_status || song?.is_heard_first || discoveryRecord;
  if (!isMainstreamTrack && !discoveryRecord) return null;

  const stats = [
    { icon: Headphones, label: 'First Listeners', value: discoveryRecord?.first_listeners_count ?? song?.play_count ?? 0, color: 'text-neon-cyan' },
    { icon: Users, label: 'Original Supporters', value: discoveryRecord?.original_supporters_count ?? song?.support_count ?? 0, color: 'text-neon-purple' },
    { icon: Compass, label: 'Discovery Partners', value: discoveryRecord?.discovery_partners_count ?? 0, color: 'text-neon-magenta' },
    { icon: Radio, label: 'Radio Programmers', value: discoveryRecord?.radio_programmers_count ?? 0, color: 'text-neon-turquoise' },
    { icon: Disc3, label: 'Frequency Communities', value: discoveryRecord?.frequency_communities_count ?? 0, color: 'text-neon-blue' },
  ];

  const firstReleaseDate = discoveryRecord?.first_release_date || song?.first_release_date || song?.mainstream_first_start_date;
  const exclusiveEnd = discoveryRecord?.exclusive_period_end || song?.mainstream_first_end_date;
  const transitionedDate = discoveryRecord?.transitioned_date;

  return (
    <GlassCard hover={false} className="p-6 mt-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-neon-turquoise/10">
          <Award className="w-5 h-5 text-neon-turquoise" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Discovery History</h3>
          <p className="text-xs text-muted-foreground">Part of this song's permanent legacy</p>
        </div>
      </div>

      <div className="mb-5">
        <FirstReleasedBadge size="md" />
      </div>

      {/* Discovery Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="text-center p-3 rounded-lg bg-secondary/30 border border-border/30">
            <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
            <p className={`text-lg font-bold font-display ${color}`}>{value?.toLocaleString() || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline Details */}
      <div className="space-y-3 text-sm">
        {firstReleaseDate && (
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-neon-cyan flex-shrink-0" />
            <span className="text-muted-foreground">First released on The Mainstream Frequency:</span>
            <span className="font-medium text-foreground">
              {new Date(firstReleaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        )}
        {exclusiveEnd && (
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-neon-magenta flex-shrink-0" />
            <span className="text-muted-foreground">12-week exclusive period ended:</span>
            <span className="font-medium text-foreground">
              {new Date(exclusiveEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        )}
        {transitionedDate && (
          <div className="flex items-center gap-3">
            <Music2 className="w-4 h-4 text-neon-turquoise flex-shrink-0" />
            <span className="text-muted-foreground">Added to Heard First on The Mainstream™:</span>
            <span className="font-medium text-foreground">
              {new Date(transitionedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        )}
        {discoveryRecord?.first_playlist_name && (
          <div className="flex items-center gap-3">
            <Music2 className="w-4 h-4 text-neon-purple flex-shrink-0" />
            <span className="text-muted-foreground">First playlist to feature this song:</span>
            <span className="font-medium text-foreground">{discoveryRecord.first_playlist_name}</span>
          </div>
        )}
        {discoveryRecord?.genre_playlist_name && (
          <div className="flex items-center gap-3">
            <Disc3 className="w-4 h-4 text-neon-blue flex-shrink-0" />
            <span className="text-muted-foreground">Auto-added to:</span>
            <span className="font-medium text-foreground">{discoveryRecord.genre_playlist_name}</span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic mt-5 pt-4 border-t border-border/30">
        This discovery history is permanent and becomes part of the song's legacy.
      </p>
    </GlassCard>
  );
}