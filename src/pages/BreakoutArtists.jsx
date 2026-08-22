import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, ShieldCheck, Users, Compass, Search, Star, TrendingUp } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import VerifiedPartnerBadge from '@/components/shared/VerifiedPartnerBadge';
import { Input } from '@/components/ui/input';

const BREAKOUT_THRESHOLD = 20000;

export default function BreakoutArtists() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Load all artists with ≥ breakout threshold supporters
  const { data: artists = [], isLoading: loadingArtists } = useQuery({
    queryKey: ['breakout-artists'],
    queryFn: () => base44.entities.ArtistProfile.list('-supporter_count', 200),
    select: (data) => data.filter(a => (a.supporter_count || 0) >= BREAKOUT_THRESHOLD),
  });

  // Load all submissions so we can map artist → discovery partner
  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ['all-accepted-submissions'],
    queryFn: () => base44.entities.ArtistSubmission.filter({ status: 'accepted' }, '-created_date', 200),
  });

  // Load all discovery partners
  const { data: partners = [] } = useQuery({
    queryKey: ['discovery-partners'],
    queryFn: () => base44.entities.DiscoveryPartner.filter({ is_active: true }),
  });

  const partnerMap = useMemo(() =>
    Object.fromEntries(partners.map(p => [p.id, p])),
    [partners]
  );

  // For each breakout artist, find the first accepted submission (the "break" moment)
  const breakoutData = useMemo(() => {
    return artists.map(artist => {
      const submission = submissions
        .filter(s => s.artist_profile_id === artist.id)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
      const partner = submission ? partnerMap[submission.discovery_partner_id] : null;
      return { artist, submission, partner };
    }).filter(d => d.partner); // only show artists with a discoverable partner
  }, [artists, submissions, partnerMap]);

  const filtered = breakoutData.filter(({ artist }) =>
    !search ||
    artist.artist_name?.toLowerCase().includes(search.toLowerCase()) ||
    artist.genre?.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = loadingArtists || loadingSubmissions;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-neon-magenta/10">
              <Rocket className="w-5 h-5 text-neon-magenta" />
            </div>
            <h1 className="text-2xl font-display font-bold">Breakout Artists</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Artists who reached <span className="text-neon-cyan font-semibold">{BREAKOUT_THRESHOLD.toLocaleString()}+ fans</span> — and the Discovery Partners who first championed them.
          </p>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-r from-neon-magenta/8 via-neon-purple/5 to-transparent border border-neon-magenta/20 rounded-xl p-4 mb-8 flex items-start gap-4">
          <TrendingUp className="w-5 h-5 text-neon-magenta flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-neon-magenta mb-1">The Breakout Hall of Fame</p>
            <p className="text-xs text-muted-foreground">
              These curators spotted talent before it exploded. Their reputation is built on results, not reach.
              When a partner's discovery hits {BREAKOUT_THRESHOLD.toLocaleString()} fans, they earn permanent credit here.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search breakout artists or genres..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary/20" />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-secondary/20 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <GlassCard hover={false} className="p-14 text-center">
            <Rocket className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">No breakout artists yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Artists appear here once they reach {BREAKOUT_THRESHOLD.toLocaleString()} fans and have a Discovery Partner who submitted them.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {filtered.map(({ artist, partner }, i) => (
              <motion.div key={artist.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard hover={false} className="p-5">
                  <div className="flex items-center gap-4 flex-wrap">

                    {/* Rank */}
                    <div className="w-8 text-center">
                      <span className="text-lg font-display font-bold text-muted-foreground/50">#{i + 1}</span>
                    </div>

                    {/* Artist avatar */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary flex-shrink-0 cursor-pointer"
                      onClick={() => navigate(`/artist/${artist.id}`)}>
                      {artist.profile_image
                        ? <img src={artist.profile_image} alt={artist.artist_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center bg-neon-purple/10">
                            <Star className="w-6 h-6 text-neon-purple" />
                          </div>
                      }
                    </div>

                    {/* Artist info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <button onClick={() => navigate(`/artist/${artist.id}`)}
                          className="text-sm font-display font-bold hover:text-neon-purple transition-colors truncate">
                          {artist.artist_name}
                        </button>
                        {artist.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan flex-shrink-0" />}
                        {artist.genre && <NeonBadge color="purple">{artist.genre}</NeonBadge>}
                      </div>
                      <div className="flex items-center gap-1 text-neon-cyan text-xs font-semibold">
                        <Users className="w-3.5 h-3.5" />
                        {(artist.supporter_count || 0).toLocaleString()} fans
                      </div>
                    </div>

                    {/* Broken by */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Broken by</p>
                      <button
                        onClick={() => navigate(`/discovery-partner/${partner.id}`)}
                        className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                          {partner.profile_image
                            ? <img src={partner.profile_image} alt={partner.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center">
                                <Compass className="w-4 h-4 text-neon-cyan" />
                              </div>
                          }
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold group-hover:text-neon-cyan transition-colors">{partner.name}</p>
                          <VerifiedPartnerBadge partner={partner} size="sm" />
                        </div>
                      </button>
                    </div>

                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}

      </motion.div>
    </div>
  );
}