import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, ArrowRight, Music2, TrendingUp, Award, Radio, Film, Heart } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const CATEGORIES = [
  {
    id: '100k_club',
    label: '100K Club',
    icon: TrendingUp,
    color: 'cyan',
    description: 'First heard here, now over 100,000 streams or supporters.'
  },
  {
    id: 'million_club',
    label: 'Million Club',
    icon: Trophy,
    color: 'magenta',
    description: 'First heard here, now over 1 million streams or supporters.'
  },
  {
    id: 'award_winners',
    label: 'Award Winners',
    icon: Award,
    color: 'purple',
    description: 'Songs that later received industry recognition.'
  },
  {
    id: 'radio_breakthroughs',
    label: 'Radio Breakthroughs',
    icon: Radio,
    color: 'turquoise',
    description: 'Songs that achieved significant radio airplay after debuting on the platform.'
  },
  {
    id: 'sync_success',
    label: 'Sync Success Stories',
    icon: Film,
    color: 'blue',
    description: 'Songs that landed placements in film, television, advertising, or games.'
  },
  {
    id: 'fan_favorites',
    label: 'Fan Favorites',
    icon: Heart,
    color: 'magenta',
    description: 'Songs with exceptional community support.'
  }
];

export default function HallOfDiscovery() {
  const [activeCategory, setActiveCategory] = useState(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['hall-of-discovery'],
    queryFn: () => base44.entities.HallOfDiscoveryEntry.list('-milestone_date', 100),
  });

  const filtered = activeCategory
    ? entries.filter(e => e.category === activeCategory)
    : entries;

  const featured = entries.filter(e => e.is_featured).slice(0, 3);

  return (
    <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-secondary to-card border border-border/50 p-8 md:p-10">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-magenta rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-neon-purple rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-neon-magenta" />
              <span className="text-xs uppercase tracking-widest text-neon-magenta font-semibold">Permanent Celebration</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Hall of Discovery™
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              A permanent section celebrating songs that first launched on The Mainstream Frequency
              and later achieved major milestones. Every song here was heard first on our platform.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Featured Entries */}
      {featured.length > 0 && !activeCategory && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-8">
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-neon-magenta" />
            Featured Inductees
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {featured.map(entry => (
              <HallEntryCard key={entry.id} entry={entry} featured />
            ))}
          </div>
        </motion.div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !activeCategory
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary/50 text-muted-foreground border-border/30 hover:border-primary/30'
          }`}
        >
          All Categories ({entries.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = entries.filter(e => e.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary/50 text-muted-foreground border-border/30 hover:border-primary/30'
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Category descriptions when filtering */}
      {activeCategory && (
        <div className="mb-6">
          {CATEGORIES.filter(c => c.id === activeCategory).map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} className="flex items-center gap-3">
                <Icon className={`w-5 h-5 text-neon-${cat.color}`} />
                <div>
                  <h3 className="font-display font-bold text-sm">{cat.label}</h3>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Entries Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            No entries in the Hall of Discovery yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Songs that debut on The Mainstream Frequency and achieve major milestones will be celebrated here.
          </p>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <HallEntryCard entry={entry} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Link back to Heard First Archive */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8">
        <Link to="/heard-first">
          <GlassCard className="p-6 flex items-center justify-between hover:border-neon-turquoise/30">
            <div>
              <h3 className="font-display font-bold text-lg">Heard First on The Mainstream™</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Browse the full collection of songs that debuted on The Mainstream Frequency.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-neon-turquoise" />
          </GlassCard>
        </Link>
      </motion.div>
    </div>
  );
}

function HallEntryCard({ entry, featured = false }) {
  const cat = CATEGORIES.find(c => c.id === entry.category);
  const color = cat?.color || 'cyan';
  const Icon = cat?.icon || Music2;

  return (
    <GlassCard className={`overflow-hidden h-full ${featured ? 'border-neon-magenta/20' : ''}`}>
      <div className="relative h-32 overflow-hidden">
        <img
          src={entry.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80'}
          alt={entry.song_title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute top-2 left-2">
          <NeonBadge color={color}>
            <Icon className="w-3 h-3 mr-1 inline" />
            {cat?.label || 'Discovery'}
          </NeonBadge>
        </div>
        {featured && (
          <div className="absolute top-2 right-2">
            <NeonBadge color="magenta">⭐ Featured</NeonBadge>
          </div>
        )}
      </div>
      <div className="p-4">
        <Link to={`/song/${entry.song_id}`}>
          <h4 className="font-semibold text-sm text-foreground hover:text-neon-cyan transition-colors truncate">
            {entry.song_title}
          </h4>
        </Link>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.artist_name}</p>
        {entry.genre && (
          <p className="text-[10px] text-neon-cyan capitalize mt-1">{entry.genre}</p>
        )}
        {entry.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{entry.description}</p>
        )}
        {entry.milestone_date && (
          <div className="flex items-center gap-1 mt-3">
            <Trophy className="w-3 h-3 text-neon-magenta" />
            <span className="text-[10px] text-muted-foreground">
              Achieved {new Date(entry.milestone_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
        {entry.first_release_date && (
          <div className="flex items-center gap-1 mt-1">
            <Music2 className="w-3 h-3 text-neon-cyan" />
            <span className="text-[10px] text-muted-foreground">
              First heard {new Date(entry.first_release_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}