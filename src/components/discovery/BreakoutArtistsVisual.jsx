import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Users, Star, TrendingUp, ExternalLink } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import VerifiedPartnerBadge from '@/components/shared/VerifiedPartnerBadge';

const BREAKOUT_THRESHOLD = 20000;

export default function BreakoutArtistsVisual({ partnerId }) {
  const navigate = useNavigate();

  // Load all artists with ≥ breakout threshold supporters
  const { data: artists = [] } = useQuery({
    queryKey: ['breakout-artists-all'],
    queryFn: () => base44.entities.ArtistProfile.list('-supporter_count', 200),
    select: (data) => data.filter(a => (a.supporter_count || 0) >= BREAKOUT_THRESHOLD),
  });

  // Load all submissions to map artist → discovery partner
  const { data: submissions = [] } = useQuery({
    queryKey: ['all-accepted-submissions'],
    queryFn: () => base44.entities.ArtistSubmission.filter({ status: 'accepted' }, '-created_date', 200),
  });

  // Load this partner's profile
  const { data: partner } = useQuery({
    queryKey: ['discovery-partner', partnerId],
    queryFn: () => base44.entities.DiscoveryPartner.get(partnerId),
    enabled: !!partnerId,
  });

  // Find breakout artists this partner discovered
  const breakoutArtists = useMemo(() => {
    if (!artists.length || !submissions.length) return [];

    return artists.map(artist => {
      // Find the first accepted submission for this artist
      const submission = submissions
        .filter(s => s.artist_profile_id === artist.id)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];

      // Check if this partner discovered them
      if (submission && submission.discovery_partner_id === partnerId) {
        return { artist, submission };
      }
      return null;
    }).filter(Boolean);
  }, [artists, submissions, partnerId]);

  if (breakoutArtists.length === 0) {
    return (
      <GlassCard hover={false} className="p-8 text-center border border-dashed border-border/40">
        <Rocket className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground mb-1">No Breakout Artists Yet</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          When an artist you discovered reaches <span className="text-neon-cyan font-semibold">{BREAKOUT_THRESHOLD.toLocaleString()}+ fans</span>, 
          they'll appear here as a testament to your curation impact.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-6 border border-neon-magenta/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-neon-magenta" />
          <h2 className="font-display font-semibold text-lg">Breakout Artists</h2>
          <NeonBadge color="magenta">{breakoutArtists.length} discovered</NeonBadge>
        </div>
        <button
          onClick={() => navigate('/breakout-artists')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-neon-cyan transition-colors"
        >
          View All <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Connection visualization */}
      <div className="space-y-4">
        {breakoutArtists.map(({ artist, submission }, i) => (
          <motion.div
            key={artist.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative"
          >
            {/* Connection line */}
            {i < breakoutArtists.length - 1 && (
              <div className="absolute left-6 top-14 bottom-0 w-px bg-gradient-to-b from-neon-magenta/40 to-transparent" />
            )}

            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/20 border border-border/30 hover:border-neon-magenta/30 transition-all">
              {/* Partner node */}
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-neon-magenta/20 to-neon-purple/20 border border-neon-magenta/30 flex items-center justify-center">
                  {partner?.profile_image ? (
                    <img src={partner.profile_image} alt={partner.name} className="w-full h-full object-cover" />
                  ) : (
                    <Star className="w-6 h-6 text-neon-magenta" />
                  )}
                </div>
                {partner && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <VerifiedPartnerBadge partner={partner} size="sm" showAllStates={false} />
                  </div>
                )}
              </div>

              {/* Connection arrow */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-px bg-gradient-to-r from-neon-magenta/60 to-neon-cyan/40" />
                <TrendingUp className="w-4 h-4 text-neon-cyan flex-shrink-0" />
                <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/40 to-neon-purple/60" />
              </div>

              {/* Artist node */}
              <button
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="relative z-10 group flex-shrink-0"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 group-hover:border-neon-cyan/60 transition-all">
                  {artist.profile_image ? (
                    <img src={artist.profile_image} alt={artist.artist_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Star className="w-6 h-6 text-neon-cyan" />
                    </div>
                  )}
                </div>
                {/* Fan count badge */}
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-neon-cyan rounded-full text-[9px] font-bold text-white shadow-lg">
                  {(artist.supporter_count || 0).toLocaleString()}
                </div>
              </button>
            </div>

            {/* Artist info below */}
            <div className="flex items-center justify-between mt-2 ml-16">
              <div>
                <button
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  className="text-sm font-display font-bold text-foreground hover:text-neon-cyan transition-colors"
                >
                  {artist.artist_name}
                </button>
                {artist.genre && (
                  <p className="text-[10px] text-muted-foreground">{artist.genre}</p>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Users className="w-3 h-3" />
                Discovered {submission.created_date ? new Date(submission.created_date).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary stat */}
      <div className="mt-6 p-4 bg-gradient-to-r from-neon-magenta/10 via-neon-purple/10 to-neon-cyan/10 rounded-lg border border-neon-magenta/20">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-neon-magenta mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Your Breakout Impact</p>
            <p className="text-xs text-muted-foreground mt-1">
              You've discovered <span className="text-neon-magenta font-semibold">{breakoutArtists.length} artist{breakoutArtists.length !== 1 ? 's' : ''}</span> who reached breakout status, 
              collectively earning <span className="text-neon-cyan font-semibold">{breakoutArtists.reduce((sum, a) => sum + (a.artist.supporter_count || 0), 0).toLocaleString()} fans</span>.
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}