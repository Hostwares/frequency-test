import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Eye } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import VerifiedPartnerBadge from '@/components/shared/VerifiedPartnerBadge';
import { Link } from 'react-router-dom';

export default function PartnerSpotlightSection() {
  const navigate = useNavigate();

  // Only fetch verified partners
  const { data: verifiedPartners = [] } = useQuery({
    queryKey: ['verified-partners'],
    queryFn: () => base44.entities.DiscoveryPartner.filter({ is_verified: true, is_active: true }),
  });

  const verifiedIds = useMemo(() => verifiedPartners.map(p => p.id), [verifiedPartners]);
  const partnerMap = useMemo(() =>
    Object.fromEntries(verifiedPartners.map(p => [p.id, p])),
    [verifiedPartners]
  );

  // Fetch published spotlights
  const { data: allSpotlights = [] } = useQuery({
    queryKey: ['home-spotlights'],
    queryFn: () => base44.entities.ArtistSpotlight.list('-created_date', 20),
    select: d => d.filter(s => s.is_published),
  });

  // Filter to only spotlights from verified partners
  const spotlights = useMemo(() =>
    allSpotlights.filter(s => verifiedIds.includes(s.discovery_partner_id)).slice(0, 6),
    [allSpotlights, verifiedIds]
  );

  if (spotlights.length === 0) return null;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-neon-magenta" />
            <h2 className="text-lg md:text-xl font-display font-bold text-foreground">Partner Spotlights</h2>
          </div>
          <p className="text-xs text-muted-foreground">Artist picks handpicked exclusively by Verified Discovery Partners</p>
        </div>
        <Link to="/discovery-partners" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
          All Partners <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Spotlight cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spotlights.map((s, i) => {
          const partner = partnerMap[s.discovery_partner_id];
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <GlassCard hover={false} className="overflow-hidden flex flex-col h-full">
                {/* Cover image */}
                {s.cover_image ? (
                  <div className="relative">
                    <img src={s.cover_image} alt={s.title} className="w-full h-36 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                    <div className="absolute bottom-2 left-3">
                      {partner && <VerifiedPartnerBadge partner={partner} size="sm" />}
                    </div>
                  </div>
                ) : (
                  <div className="h-20 bg-gradient-to-br from-neon-magenta/10 via-neon-purple/10 to-neon-cyan/10 flex items-end px-4 pb-2">
                    {partner && <VerifiedPartnerBadge partner={partner} size="sm" />}
                  </div>
                )}

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="font-display font-bold text-sm mb-0.5 line-clamp-1">{s.title}</p>
                  <p className="text-xs text-neon-cyan font-medium mb-2">{s.artist_name}</p>
                  {s.body && (
                    <p className="text-xs text-muted-foreground line-clamp-3 flex-1 mb-3">{s.body}</p>
                  )}

                  <div className="flex items-center justify-between mt-auto">
                    {/* Partner info */}
                    {partner && (
                      <button
                        onClick={() => navigate(`/discovery-partner/${partner.id}`)}
                        className="flex items-center gap-2 group"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                          {partner.profile_image
                            ? <img src={partner.profile_image} alt={partner.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-neon-cyan/20" />
                          }
                        </div>
                        <span className="text-[11px] text-muted-foreground group-hover:text-neon-cyan transition-colors truncate max-w-[100px]">
                          {partner.name}
                        </span>
                      </button>
                    )}

                    {/* View count */}
                    {(s.view_count || 0) > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                        <Eye className="w-3 h-3" />
                        {s.view_count}
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}