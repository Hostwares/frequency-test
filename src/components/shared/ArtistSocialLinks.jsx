import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const platformIcons = {
  instagram: '📸',
  twitter: '🐦',
  youtube: '📺',
  tiktok: '🎵',
  facebook: '📘',
  spotify: '🎧',
  apple_music: '🍎',
  soundcloud: '☁️',
  bandcamp: '🎤',
  other: '🔗',
};

const platformColors = {
  instagram: 'magenta',
  twitter: 'cyan',
  youtube: 'purple',
  tiktok: 'purple',
  facebook: 'blue',
  spotify: 'cyan',
  apple_music: 'magenta',
  soundcloud: 'orange',
  bandcamp: 'purple',
  other: 'cyan',
};

export default function ArtistSocialLinks({ socialPlatforms = [], className = "" }) {
  if (!socialPlatforms || socialPlatforms.length === 0) {
    return null;
  }

  return (
    <GlassCard hover={false} className={`p-4 ${className}`}>
      <h3 className="text-sm font-semibold mb-3 text-foreground">Connect & Stream</h3>
      <div className="flex flex-wrap gap-2">
        {socialPlatforms.slice(0, 3).map((link, index) => {
          const color = platformColors[link.platform] || 'cyan';
          const icon = platformIcons[link.platform] || '🔗';
          const displayName = link.platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          return (
            <Button
              key={index}
              variant="outline"
              size="sm"
              asChild
              className="gap-2 border-border/40 hover:border-neon-purple/50 hover:bg-neon-purple/5"
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <span className="text-base">{icon}</span>
                <span className="text-xs font-medium">{displayName}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            </Button>
          );
        })}
      </div>
      
      {socialPlatforms.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-3">
          {socialPlatforms.length} platform{socialPlatforms.length !== 1 ? 's' : ''} connected
        </p>
      )}
    </GlassCard>
  );
}