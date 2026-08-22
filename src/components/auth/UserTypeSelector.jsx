import React from 'react';
import { Heart, Mic2, Compass, Users, Radio, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PUBLIC_USER_TYPES = [
  {
    role: 'fan',
    prefix: '@',
    label: 'Fan / Subscriber',
    handleExample: '@fanname',
    icon: Heart,
    color: 'neon-pink',
    description: 'Discover and follow artists, build playlists, allocate support to artists, and earn Signal Points.',
  },
  {
    role: 'artist',
    prefix: '!',
    label: 'Artist',
    handleExample: '!artistname',
    icon: Mic2,
    color: 'neon-purple',
    description: 'Musicians, bands, producers, and performers. Upload music, receive fan allocations, and sell directly.',
  },
  {
    role: 'discovery_partner',
    prefix: '+',
    label: 'Discovery Partner',
    handleExample: '+partnername',
    icon: Compass,
    color: 'neon-cyan',
    description: 'Bloggers, curators, journalists, influencers, and scouts who help audiences discover artists.',
  },
  {
    role: 'community_manager',
    prefix: '#',
    label: 'Frequency Community',
    handleExample: '#communityname',
    icon: Users,
    color: 'neon-turquoise',
    description: 'Organized groups built around music, identity, location, genre, or shared interest.',
  },
  {
    role: 'radio_programmer',
    prefix: '^',
    label: 'Radio / Digital Programmer',
    handleExample: '^stationname',
    icon: Radio,
    color: 'neon-blue',
    description: 'Verified professional accounts for radio stations and music programmers.',
  },
  {
    role: 'business_partner',
    prefix: '+',
    label: 'Business Partner',
    handleExample: '+partnername',
    icon: Briefcase,
    color: 'neon-turquoise',
    description: 'Commercial & organizational partners offering services, products, discounts, or experiences. Verified by admin.',
  },
];

const COLOR_CLASSES = {
  'neon-pink': 'border-pink-500/40 bg-pink-500/10 text-pink-400',
  'neon-purple': 'border-neon-purple/40 bg-neon-purple/10 text-neon-purple',
  'neon-cyan': 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan',
  'neon-turquoise': 'border-neon-turquoise/40 bg-neon-turquoise/10 text-neon-turquoise',
  'neon-blue': 'border-neon-blue/40 bg-neon-blue/10 text-neon-blue',
  'neon-turquoise': 'border-neon-turquoise/40 bg-neon-turquoise/10 text-neon-turquoise',
};

export default function UserTypeSelector({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        {PUBLIC_USER_TYPES.map((type) => {
          const Icon = type.icon;
          const selected = value === type.role;
          return (
            <button
              key={type.role}
              type="button"
              onClick={() => onChange(type.role)}
              className={cn(
                'w-full text-left rounded-xl border p-4 transition-all',
                selected
                  ? `${COLOR_CLASSES[type.color]} ring-1 ring-primary/40`
                  : 'border-border bg-card/50 hover:border-primary/30 hover:bg-card'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                  selected ? COLOR_CLASSES[type.color] : 'bg-secondary text-muted-foreground'
                )}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{type.label}</span>
                    <span className="text-xs font-mono text-muted-foreground">{type.handleExample}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{type.description}</p>
                </div>
                {selected && (
                  <div className="shrink-0">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}