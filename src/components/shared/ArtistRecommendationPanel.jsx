import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Heart, Radio, ArrowRight, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import ArtistCard from '@/components/shared/ArtistCard';
import FrequencyCard from '@/components/shared/FrequencyCard';
import NeonBadge from '@/components/shared/NeonBadge';

function PanelHeader({ icon: Icon, title, subtitle, color = 'purple' }) {
  const colorMap = {
    purple: 'text-neon-purple',
    cyan: 'text-neon-cyan',
    magenta: 'text-neon-magenta',
    turquoise: 'text-neon-turquoise',
  };
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${colorMap[color]}`} />
      <h3 className="font-display font-bold text-sm">{title}</h3>
      {subtitle && <span className="text-xs text-muted-foreground">· {subtitle}</span>}
    </div>
  );
}

export default function ArtistRecommendationPanel({ artistId, artistName, artistGenre }) {
  const navigate = useNavigate();

  const { data: recs, isLoading } = useQuery({
    queryKey: ['artist-recommendations', artistId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getRecommendations', {
        artist_profile_id: artistId,
      });
      return res.data;
    },
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Finding similar artists and communities...</p>
        </div>
      </GlassCard>
    );
  }

  if (!recs) return null;

  const similarArtists = recs.similar_artists || [];
  const fansAlsoSupport = recs.fans_also_support || [];
  const similarCommunities = recs.similar_communities || [];

  // Don't render if all sections are empty
  if (similarArtists.length === 0 && fansAlsoSupport.length === 0 && similarCommunities.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-10 space-y-8"
    >
      <div className="flex items-center gap-2">
        <Compass className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-display font-bold">
          More Like {artistName || 'This Artist'}
        </h2>
        <NeonBadge color="purple" className="ml-1">Community-Driven</NeonBadge>
      </div>

      {/* Similar Artists — based on genre, sub-genres, network overlap */}
      {similarArtists.length > 0 && (
        <section>
          <PanelHeader
            icon={Users}
            title="Similar Artists"
            subtitle={artistGenre ? `Matching ${artistGenre} & related sounds` : 'Matching genre & network'}
            color="purple"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {similarArtists.slice(0, 4).map(artist => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </section>
      )}

      {/* Fans Also Support — co-support pattern from real fan activity */}
      {fansAlsoSupport.length > 0 && (
        <section>
          <PanelHeader
            icon={Heart}
            title="Fans Also Support"
            subtitle="Based on real fan co-support patterns"
            color="magenta"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fansAlsoSupport.slice(0, 4).map(artist => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </section>
      )}

      {/* Similar Communities — based on genre & tag overlap */}
      {similarCommunities.length > 0 && (
        <section>
          <PanelHeader
            icon={Radio}
            title="Similar Communities"
            subtitle="Frequencies with matching genres & tags"
            color="turquoise"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {similarCommunities.slice(0, 3).map(community => (
              <FrequencyCard key={community.id} community={community} />
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}