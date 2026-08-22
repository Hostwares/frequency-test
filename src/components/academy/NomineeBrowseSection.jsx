import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Trophy, Loader2, ExternalLink, Music, Video, User, ChevronDown, ChevronUp
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const NOMINEE_TYPE_LABELS = {
  artist: 'Artist',
  song: 'Song',
  release: 'Release',
  community: 'Community',
  discovery_partner: 'Discovery Partner',
  radio_programmer: 'Radio Programmer',
  editorial: 'Editorial',
  live_performance: 'Live Performance',
};

const STATUS_CONFIG = {
  eligible: 'blue',
  nominated: 'cyan',
  shortlisted: 'purple',
  winner: 'magenta',
  honorable_mention: 'turquoise',
};

export default function NomineeBrowseSection() {
  const currentYear = new Date().getFullYear();
  const [expandedCategory, setExpandedCategory] = useState(null);

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['awards-categories-public', currentYear],
    queryFn: () => base44.entities.AwardsCategory.filter(
      { year: currentYear, is_active: true }, 'sort_order', 100
    ),
  });

  const { data: nominees = [], isLoading: nomLoading } = useQuery({
    queryKey: ['awards-nominees-public', currentYear],
    queryFn: () => base44.entities.AwardsNominee.filter(
      { year: currentYear }, '-votes_count', 500
    ),
  });

  const nomineesByCategory = useMemo(() => {
    const map = {};
    nominees.forEach(n => {
      if (!map[n.category_id]) map[n.category_id] = [];
      map[n.category_id].push(n);
    });
    return map;
  }, [nominees]);

  if (catLoading || nomLoading) {
    return (
      <GlassCard hover={false} className="p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </GlassCard>
    );
  }

  const categoriesWithNominees = categories.filter(c => (nomineesByCategory[c.id]?.length || 0) > 0);

  if (categoriesWithNominees.length === 0) {
    return null;
  }

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-neon-magenta" />
        <h3 className="text-sm font-display font-semibold">Browse Nominees</h3>
        <span className="text-[10px] text-muted-foreground ml-1">
          {nominees.length} total · {currentYear} cycle
        </span>
      </div>

      <div className="space-y-2">
        {categoriesWithNominees.map(category => {
          const catNominees = nomineesByCategory[category.id] || [];
          const isExpanded = expandedCategory === category.id;

          return (
            <div key={category.id}>
              <button
                onClick={() => setExpandedCategory(prev => prev === category.id ? null : category.id)}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors text-left"
              >
                <Trophy className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-medium flex-1 truncate">{category.name}</span>
                <span className="text-[10px] text-muted-foreground">{catNominees.length}/{category.max_nominees || 5}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pl-1">
                  {catNominees.map(nominee => {
                    const hasMusic = nominee.song_id || nominee.artist_profile_id;
                    const hasVideo = !!nominee.video_url;
                    const statusColor = STATUS_CONFIG[nominee.status] || 'blue';

                    return (
                      <Link
                        key={nominee.id}
                        to={`/nominee/${nominee.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/10 hover:bg-secondary/30 border border-border/30 hover:border-primary/30 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                          {nominee.cover_image ? (
                            <img src={nominee.cover_image} alt={nominee.nominee_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                            {nominee.nominee_name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <NeonBadge color="blue" className="text-[9px]">
                              {NOMINEE_TYPE_LABELS[nominee.nominee_type] || nominee.nominee_type}
                            </NeonBadge>
                            {hasMusic && <Music className="w-3 h-3 text-neon-cyan" />}
                            {hasVideo && <Video className="w-3 h-3 text-neon-magenta" />}
                            {nominee.status === 'winner' && (
                              <NeonBadge color={statusColor} className="text-[9px]">Winner</NeonBadge>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}