import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Radio, Heart, Music, Compass, Sparkles, TrendingUp,
  Disc3, ArrowRight, Star, Play, Headphones,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import ArtistCard from '@/components/shared/ArtistCard';
import SongRow from '@/components/shared/SongRow';
import FrequencyCard from '@/components/shared/FrequencyCard';
import { Button } from '@/components/ui/button';
import NeonBadge from '@/components/shared/NeonBadge';

const TABS = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'similar_artists', label: 'Similar Artists', icon: Users },
  { id: 'fans_also_support', label: 'Fans Also Support', icon: Heart },
  { id: 'similar_moods', label: 'By Mood', icon: Sparkles },
  { id: 'similar_genres', label: 'By Genre', icon: Music },
  { id: 'discovery_partner_picks', label: 'Partner Picks', icon: Compass },
  { id: 'community_picks', label: 'Community Picks', icon: Radio },
  { id: 'similar_communities', label: 'Communities', icon: Users },
  { id: 'new_releases', label: 'New Releases', icon: Disc3 },
];

function SectionShell({ icon: Icon, title, subtitle, children, color = 'purple' }) {
  const colorMap = {
    purple: 'text-neon-purple',
    cyan: 'text-neon-cyan',
    magenta: 'text-neon-magenta',
    turquoise: 'text-neon-turquoise',
    blue: 'text-neon-blue',
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${colorMap[color]}`} />
        <h3 className="font-display font-bold text-sm">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground">· {subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function PartnerPickCard({ pick }) {
  const navigate = useNavigate();
  return (
    <GlassCard className="p-4 overflow-hidden" onClick={() => navigate(`/artist/${pick.artist_profile_id}`)}>
      {pick.cover_image && (
        <div className="w-full h-28 rounded-lg overflow-hidden mb-3">
          <img src={pick.cover_image} alt={pick.title} className="w-full h-full object-cover" />
        </div>
      )}
      <NeonBadge color="cyan" className="mb-2">Discovery Partner Pick</NeonBadge>
      <h4 className="font-semibold text-sm truncate">{pick.title}</h4>
      <p className="text-xs text-muted-foreground truncate">{pick.artist_name}</p>
      {pick.body && <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{pick.body}</p>}
    </GlassCard>
  );
}

function CommunityPickCard({ playlist }) {
  const navigate = useNavigate();
  return (
    <GlassCard className="p-4" onClick={() => navigate('/playlists')}>
      <div className="flex items-start gap-3">
        {playlist.cover_image ? (
          <img src={playlist.cover_image} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gradient-neon flex items-center justify-center flex-shrink-0">
            <Disc3 className="w-6 h-6 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <h4 className="font-semibold text-sm truncate">{playlist.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{playlist.description || 'Community curated'}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Headphones className="w-3 h-3" />{playlist.follower_count || 0}</span>
            <NeonBadge color="turquoise">{playlist.type}</NeonBadge>
            {playlist.is_living && <NeonBadge color="magenta">Living</NeonBadge>}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

const MOOD_CLASS_MAP = {
  energetic: 'bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan',
  chill: 'bg-neon-blue/20 border-neon-blue/40 text-neon-blue',
  emotional: 'bg-neon-magenta/20 border-neon-magenta/40 text-neon-magenta',
  uplifting: 'bg-neon-turquoise/20 border-neon-turquoise/40 text-neon-turquoise',
  melancholic: 'bg-neon-purple/20 border-neon-purple/40 text-neon-purple',
  romantic: 'bg-neon-magenta/20 border-neon-magenta/40 text-neon-magenta',
  angsty: 'bg-neon-purple/20 border-neon-purple/40 text-neon-purple',
  peaceful: 'bg-neon-blue/20 border-neon-blue/40 text-neon-blue',
  nostalgic: 'bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan',
  empowering: 'bg-neon-turquoise/20 border-neon-turquoise/40 text-neon-turquoise',
  dark: 'bg-neon-purple/20 border-neon-purple/40 text-neon-purple',
  party: 'bg-neon-magenta/20 border-neon-magenta/40 text-neon-magenta',
  workout: 'bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan',
  focus: 'bg-neon-blue/20 border-neon-blue/40 text-neon-blue',
  other: 'bg-neon-purple/20 border-neon-purple/40 text-neon-purple',
};

function MoodCluster({ mood, songs, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(mood)}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? MOOD_CLASS_MAP[mood] || MOOD_CLASS_MAP.other
          : 'bg-secondary/30 border-border/30 text-muted-foreground hover:text-foreground'
      }`}
    >
      {mood}
    </button>
  );
}

function GenreCluster({ genre, artists, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(genre)}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? 'bg-neon-purple/20 border-neon-purple/40 text-neon-purple'
          : 'bg-secondary/30 border-border/30 text-muted-foreground hover:text-foreground'
      }`}
    >
      {genre}
    </button>
  );
}

export default function RecommendationEngine({ artistId, communityId }) {
  const [activeTab, setActiveTab] = useState('trending');
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const navigate = useNavigate();

  const { data: recs, isLoading } = useQuery({
    queryKey: ['recommendations', artistId, communityId],
    queryFn: async () => {
      const payload = {};
      if (artistId) payload.artist_profile_id = artistId;
      if (communityId) payload.community_id = communityId;
      const res = await base44.functions.invoke('getRecommendations', payload);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <GlassCard hover={false} className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Finding recommendations from the community...</p>
        </div>
      </GlassCard>
    );
  }

  if (!recs) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'trending':
        return (
          <SectionShell icon={TrendingUp} title="Trending Now" subtitle="Community-driven popularity" color="cyan">
            <GlassCard hover={false} className="divide-y divide-border/30">
              {recs.trending?.length > 0 ? (
                recs.trending.map((song, i) => (
                  <SongRow key={song.id} song={song} index={i} queue={recs.trending} />
                ))
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">No trending tracks yet.</p>
              )}
            </GlassCard>
          </SectionShell>
        );

      case 'similar_artists':
        return (
          <SectionShell icon={Users} title="Similar Artists" subtitle="Based on genre, network & sound" color="purple">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recs.similar_artists?.length > 0 ? (
                recs.similar_artists.map(artist => (
                  <ArtistCard key={artist.id} artist={artist} />)
                )
              ) : (
                <p className="col-span-full p-6 text-center text-sm text-muted-foreground">No similar artists found yet.</p>
              )}
            </div>
          </SectionShell>
        );

      case 'fans_also_support':
        return (
          <SectionShell icon={Heart} title="Fans Also Support" subtitle="Co-support patterns from real fans" color="magenta">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recs.fans_also_support?.length > 0 ? (
                recs.fans_also_support.map(artist => (
                  <ArtistCard key={artist.id} artist={artist} />)
                )
              ) : (
                <GlassCard hover={false} className="col-span-full p-8 text-center">
                  <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Support an artist to see who else their fans are supporting.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/artists')}>
                    Discover Artists <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </GlassCard>
              )}
            </div>
          </SectionShell>
        );

      case 'similar_moods': {
        const moodData = recs.similar_moods || {};
        const activeMood = selectedMood || moodData.target_mood;
        const clusterSongs = moodData.clusters?.[activeMood] || moodData.songs || [];
        return (
          <SectionShell icon={Sparkles} title="By Mood" subtitle="Songs that match your vibe" color="cyan">
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(moodData.clusters || {}).map(mood => (
                <MoodCluster
                  key={mood}
                  mood={mood}
                  songs={moodData.clusters[mood]}
                  active={activeMood === mood}
                  onSelect={setSelectedMood}
                />
              ))}
            </div>
            <GlassCard hover={false} className="divide-y divide-border/30">
              {clusterSongs.length > 0 ? (
                clusterSongs.map((song, i) => (
                  <SongRow key={song.id} song={song} index={i} queue={clusterSongs} />
                ))
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">No songs in this mood yet.</p>
              )}
            </GlassCard>
          </SectionShell>
        );
      }

      case 'similar_genres': {
        const genreData = recs.similar_genres || {};
        const activeGenre = selectedGenre || genreData.target_genre;
        const clusterArtists = genreData.clusters?.[activeGenre] || genreData.artists || [];
        return (
          <SectionShell icon={Music} title="By Genre" subtitle="Artists in your favorite genres" color="purple">
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(genreData.clusters || {}).map(genre => (
                <GenreCluster
                  key={genre}
                  genre={genre}
                  artists={genreData.clusters[genre]}
                  active={activeGenre === genre}
                  onSelect={setSelectedGenre}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clusterArtists.length > 0 ? (
                clusterArtists.map(artist => (
                  <ArtistCard key={artist.id} artist={artist} />)
                )
              ) : (
                <p className="col-span-full p-6 text-center text-sm text-muted-foreground">No artists in this genre yet.</p>
              )}
            </div>
          </SectionShell>
        );
      }

      case 'discovery_partner_picks':
        return (
          <SectionShell icon={Compass} title="Discovery Partner Picks" subtitle="Curated by verified partners" color="turquoise">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recs.discovery_partner_picks?.length > 0 ? (
                recs.discovery_partner_picks.map(pick => (
                  <PartnerPickCard key={pick.id} pick={pick} />
                ))
              ) : (
                <GlassCard hover={false} className="col-span-full p-8 text-center">
                  <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No partner picks published yet.</p>
                </GlassCard>
              )}
            </div>
          </SectionShell>
        );

      case 'community_picks':
        return (
          <SectionShell icon={Radio} title="Community Picks" subtitle="Playlists curated by the community" color="cyan">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recs.community_picks?.length > 0 ? (
                recs.community_picks.map(pl => (
                  <CommunityPickCard key={pl.id} playlist={pl} />
                ))
              ) : (
                <GlassCard hover={false} className="col-span-full p-8 text-center">
                  <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No community playlists yet.</p>
                </GlassCard>
              )}
            </div>
          </SectionShell>
        );

      case 'similar_communities':
        return (
          <SectionShell icon={Users} title="Similar Communities" subtitle="Based on genre & tags" color="turquoise">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recs.similar_communities?.length > 0 ? (
                recs.similar_communities.map(c => (
                  <FrequencyCard key={c.id} community={c} />
                ))
              ) : (
                <GlassCard hover={false} className="col-span-full p-8 text-center">
                  <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No communities found.</p>
                </GlassCard>
              )}
            </div>
          </SectionShell>
        );

      case 'new_releases':
        return (
          <SectionShell icon={Disc3} title="New Releases" subtitle="Fresh from the community" color="magenta">
            <GlassCard hover={false} className="divide-y divide-border/30">
              {recs.new_releases?.length > 0 ? (
                recs.new_releases.map((song, i) => (
                  <SongRow key={song.id} song={song} index={i} queue={recs.new_releases} />
                ))
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">No new releases yet.</p>
              )}
            </GlassCard>
          </SectionShell>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-5 h-5 text-primary" />
        <h2 className="text-lg md:text-xl font-display font-bold">Discover</h2>
        <span className="text-xs text-muted-foreground ml-1">· Community-driven recommendations</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-secondary/30 text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
}