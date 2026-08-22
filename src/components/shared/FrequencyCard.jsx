import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Music, Radio } from 'lucide-react';
import GlassCard from './GlassCard';

export default function FrequencyCard({ community }) {
  const navigate = useNavigate();

  return (
    <GlassCard 
      glow="cyan" 
      className="overflow-hidden"
      onClick={() => navigate(`/frequency/${community.id}`)}
    >
      <div className="relative h-32 overflow-hidden">
        <img
          src={community.cover_image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80'}
          alt={community.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        <Radio className="absolute top-3 right-3 w-5 h-5 text-neon-cyan animate-pulse-glow" />
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground">{community.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{community.description}</p>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{community.member_count || 0} fans</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Music className="w-3.5 h-3.5" />
            <span>{community.artist_count || 0} artists</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}