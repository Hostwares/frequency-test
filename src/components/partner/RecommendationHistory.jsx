import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  PenLine, Headphones, CheckCircle2, Sparkles, Send, Clock, Music
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const ACTIVITY_TYPES = {
  spotlight_published: { label: 'Spotlight Published', icon: PenLine, color: 'text-neon-magenta' },
  spotlight_featured: { label: 'Artist Featured', icon: Sparkles, color: 'text-neon-purple' },
  playlist_created: { label: 'Playlist Curated', icon: Headphones, color: 'text-neon-cyan' },
  submission_accepted: { label: 'Submission Accepted', icon: CheckCircle2, color: 'text-neon-turquoise' },
  submission_recommended: { label: 'Artist Recommended', icon: Send, color: 'text-neon-cyan' },
  submission_featured: { label: 'Artist Featured', icon: Sparkles, color: 'text-neon-magenta' },
};

function ActivityItem({ item }) {
  const cfg = ACTIVITY_TYPES[item.type] || { label: 'Activity', icon: Clock, color: 'text-muted-foreground' };
  const Icon = cfg.icon;

  return (
    <div className="flex items-start gap-3 pb-4 relative">
      {/* Timeline dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-8 h-8 rounded-full bg-secondary/40 border border-border/40 flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
        </div>
        <div className="w-px flex-1 bg-border/30 mt-1 min-h-[20px]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <NeonBadge color={cfg.color.replace('text-neon-', '').replace('text-', '')}>{cfg.label}</NeonBadge>
          <span className="text-[10px] text-muted-foreground">
            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <p className="text-sm font-medium mt-1 truncate">{item.title}</p>
        {item.artist_name && (
          <p className="text-xs text-neon-cyan">{item.artist_name}</p>
        )}
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
        )}
      </div>
    </div>
  );
}

export default function RecommendationHistory({ partnerId, userId }) {
  const { data: spotlights = [] } = useQuery({
    queryKey: ['dp-history-spotlights', partnerId],
    queryFn: () => base44.entities.ArtistSpotlight.filter({ discovery_partner_id: partnerId, is_published: true }, '-created_date', 30),
    enabled: !!partnerId,
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ['dp-history-playlists', userId],
    queryFn: () => base44.entities.Playlist.filter({ owner_user_id: userId, type: 'community' }, '-created_date', 20),
    enabled: !!userId,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['dp-history-submissions', partnerId],
    queryFn: () => base44.entities.ArtistSubmission.filter({ discovery_partner_id: partnerId }, '-created_date', 30),
    enabled: !!partnerId,
  });

  const timeline = useMemo(() => {
    const items = [];

    spotlights.forEach(s => {
      if (s.is_featured) {
        items.push({
          type: 'spotlight_featured',
          date: s.created_date,
          title: s.title,
          artist_name: s.artist_name,
          description: s.body?.slice(0, 120),
        });
      } else {
        items.push({
          type: 'spotlight_published',
          date: s.created_date,
          title: s.title,
          artist_name: s.artist_name,
          description: s.body?.slice(0, 120),
        });
      }
    });

    playlists.forEach(p => {
      items.push({
        type: 'playlist_created',
        date: p.created_date,
        title: p.name,
        artist_name: null,
        description: p.description?.slice(0, 120),
      });
    });

    submissions.forEach(s => {
      if (['accepted', 'featured', 'recommended'].includes(s.status)) {
        items.push({
          type: s.status === 'featured' ? 'submission_featured' : s.status === 'recommended' ? 'submission_recommended' : 'submission_accepted',
          date: s.created_date,
          title: s.artist_name,
          artist_name: s.genre,
          description: s.artist_message?.slice(0, 120),
        });
      }
    });

    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [spotlights, playlists, submissions]);

  const stats = useMemo(() => ({
    total: timeline.length,
    spotlights: spotlights.filter(s => s.is_published).length,
    playlists: playlists.length,
    recommended: submissions.filter(s => ['accepted', 'featured', 'recommended'].includes(s.status)).length,
  }), [timeline, spotlights, playlists, submissions]);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: stats.total, icon: Clock, color: 'text-foreground' },
          { label: 'Spotlights', value: stats.spotlights, icon: PenLine, color: 'text-neon-magenta' },
          { label: 'Playlists', value: stats.playlists, icon: Headphones, color: 'text-neon-cyan' },
          { label: 'Recommended', value: stats.recommended, icon: Send, color: 'text-neon-turquoise' },
        ].map(({ label, value, icon: Icon, color }) => (
          <GlassCard key={label} hover={false} className="p-3 text-center">
            <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
            <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Timeline */}
      <GlassCard hover={false} className="p-5">
        <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-neon-purple" /> Recommendation Timeline
        </h3>
        {timeline.length === 0 ? (
          <div className="text-center py-8">
            <Music className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recommendations yet.</p>
          </div>
        ) : (
          <div>
            {timeline.slice(0, 25).map((item, i) => (
              <motion.div
                key={`${item.type}-${item.title}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <ActivityItem item={item} />
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}