import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import { Trophy, Medal, TrendingUp } from 'lucide-react';

export default function DiscoveryPartnerLeaderboard() {
  const { data: partners, isLoading } = useQuery({
    queryKey: ['discovery-partners-leaderboard'],
    queryFn: async () => {
      const partners = await base44.entities.DiscoveryPartner.list();
      const submissions = await base44.entities.ArtistSubmission.list();
      const artistProfiles = await base44.entities.ArtistProfile.list();

      // Map partners to their breakout artists
      const partnerBreakouts = partners.map(partner => {
        // Find all accepted submissions for this partner
        const partnerSubmissions = submissions.filter(
          s => s.discovery_partner_id === partner.id && s.status === 'accepted'
        );

        // Count how many of their artists reached 20k+ fans
        const breakoutArtists = partnerSubmissions.filter(submission => {
          const artist = artistProfiles.find(a => a.id === submission.artist_profile_id);
          return artist && (artist.supporter_count || 0) >= 20000;
        });

        // Remove duplicates (same artist might have multiple submissions)
        const uniqueBreakoutArtistIds = [...new Set(breakoutArtists.map(a => a.artist_profile_id))];

        return {
          ...partner,
          breakoutCount: uniqueBreakoutArtistIds.length,
          breakoutArtistIds: uniqueBreakoutArtistIds,
        };
      });

      // Sort by breakout count descending
      return partnerBreakouts
        .filter(p => p.breakoutCount > 0)
        .sort((a, b) => b.breakoutCount - a.breakoutCount)
        .slice(0, 10); // Top 10
    },
  });

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
  };

  return (
    <GlassCard className="p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-neon-purple" />
          <h3 className="text-lg font-heading font-bold text-foreground">
            Top Discovery Partners
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Ranked by artists reaching 20,000+ fans
        </p>
      </div>

      {partners.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No breakout artists yet</p>
          <p className="text-xs mt-1">Be the first to discover the next big artist!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map((partner, index) => (
            <div
              key={partner.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
            >
              <div className="w-8 flex-shrink-0">
                {getRankIcon(index)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {partner.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {partner.partner_type?.replace(/_/g, ' ')}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-neon-purple">
                  {partner.breakoutCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {partner.breakoutCount === 1 ? 'artist' : 'artists'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <a
          href="/discovery-partners"
          className="text-xs text-neon-cyan hover:text-neon-cyan/80 transition-colors"
        >
          View all Discovery Partners →
        </a>
      </div>
    </GlassCard>
  );
}