import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, BadgeCheck, Sparkles } from 'lucide-react';
import GlassCard from './GlassCard';
import NeonBadge from './NeonBadge';
import ArtistHandle from './ArtistHandle';

const verificationIcons = {
  human_created: { label: 'Human Created', color: 'turquoise' },
  human_assisted: { label: 'Human Assisted', color: 'cyan' },
  ai_assisted: { label: 'AI Assisted', color: 'blue' },
  ai_generated: { label: 'AI Generated', color: 'magenta' },
};

export default function ArtistCard({ artist }) {
  const navigate = useNavigate();
  const verification = verificationIcons[artist.verification_badge] || verificationIcons.human_created;

  return (
    <GlassCard 
      glow="purple" 
      className="overflow-hidden group"
      onClick={() => navigate(`/artist/${artist.artist_handle || artist.id}`)}
    >
      <div className="relative h-40 overflow-hidden">
        <img
          src={artist.profile_image || `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80`}
          alt={artist.artist_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        {artist.is_verified && (
          <BadgeCheck className="absolute top-3 right-3 w-5 h-5 text-neon-cyan" />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground truncate">{artist.artist_name}</h3>
        {artist.artist_handle && (
          <ArtistHandle handle={artist.artist_handle} size="xs" />
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{artist.genre}</p>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{artist.supporter_count || 0}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-neon-purple" />
            <span>{artist.resonance_score || 0}</span>
          </div>
        </div>
        <div className="mt-3">
          <NeonBadge color={verification.color}>{verification.label}</NeonBadge>
        </div>
      </div>
    </GlassCard>
  );
}