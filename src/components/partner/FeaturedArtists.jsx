import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Star, ChevronDown, ChevronUp } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

function FeaturedArtistCard({ spotlight }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard hover={true} glow="magenta" className="p-4 overflow-hidden" onClick={() => spotlight.artist_profile_id && navigate(`/artist/${spotlight.artist_profile_id}`)}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary/40">
          {spotlight.cover_image
            ? <img src={spotlight.cover_image} alt={spotlight.artist_name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Sparkles className="w-5 h-5 text-neon-magenta" /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-display font-bold truncate">{spotlight.artist_name}</p>
            <Star className="w-3 h-3 text-neon-magenta fill-neon-magenta flex-shrink-0" />
          </div>
          {spotlight.genre && <NeonBadge color="magenta" className="mt-1">{spotlight.genre}</NeonBadge>}
        </div>
      </div>

      <p className="text-xs font-semibold text-neon-magenta mb-1">{spotlight.title}</p>

      {spotlight.body && (
        <>
          <p className={`text-xs text-muted-foreground leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
            {spotlight.body}
          </p>
          {spotlight.body.length > 100 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-[11px] text-neon-purple mt-1 flex items-center gap-1 hover:text-neon-magenta transition-colors"
            >
              {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Read more</>}
            </button>
          )}
        </>
      )}
    </GlassCard>
  );
}

export default function FeaturedArtists({ partnerId }) {
  const { data: featured = [], isLoading } = useQuery({
    queryKey: ['dp-featured-artists', partnerId],
    queryFn: () => base44.entities.ArtistSpotlight.filter({ discovery_partner_id: partnerId, is_published: true, is_featured: true }, '-created_date', 12),
    enabled: !!partnerId,
  });

  if (isLoading || featured.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-neon-magenta" />
        <h2 className="font-display font-semibold text-sm">Featured Artists</h2>
        <NeonBadge color="magenta">{featured.length}</NeonBadge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {featured.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <FeaturedArtistCard spotlight={s} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}