import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Heart, Share2, Music, Headphones, 
  Clock, Star, MessageSquare, TrendingUp 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import TrackFeedback from '@/components/song/TrackFeedback';
import ArtistHandle from '@/components/shared/ArtistHandle';
import MainstreamFirstBadge from '@/components/shared/MainstreamFirstBadge';
import SongDiscoveryHistory from '@/components/shared/SongDiscoveryHistory';
import BuySongButton from '@/components/shared/BuySongButton';
import PurchaseVsFundingExplainer from '@/components/shared/PurchaseVsFundingExplainer';
import PreviewPlayer from '@/components/shared/PreviewPlayer';
import { useCatalogAccess } from '@/hooks/useCatalogAccess';
import { usePlayer } from '@/context/PlayerContext';
import FanReviewsSection from '@/components/reviews/FanReviewsSection';
import SongStoreReviewsSection from '@/components/reviews/SongStoreReviewsSection';
import { toast } from 'sonner';

export default function SongDetail() {
  const { id: songId } = useParams();

  const { data: song, isLoading } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => base44.entities.Song.filter({ id: songId }),
    enabled: !!songId,
    select: (data) => data?.[0],
  });

  const { data: artist } = useQuery({
    queryKey: ['artist', song?.artist_profile_id],
    queryFn: () => base44.entities.ArtistProfile.filter({ id: song?.artist_profile_id }),
    enabled: !!song?.artist_profile_id,
    select: (data) => data?.[0],
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['song-ratings', songId],
    queryFn: () => base44.entities.SongRating.filter({ song_id: songId }),
    enabled: !!songId,
  });

  const { canPlay } = useCatalogAccess();
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer();
  const isCurrent = currentTrack?.id === song?.id;

  // Calculate average rating
  const averageRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(1)
    : 'New';

  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: ratings.filter(r => r.rating === stars).length,
  }));

  const topMoods = ratings
    .flatMap(r => r.mood_tags || [])
    .reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

  const sortedMoods = Object.entries(topMoods)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Song not found
      </div>
    );
  }

  const locked = !canPlay(song);

  return (
    <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Back Button */}
        <Link to={artist ? `/artist/${artist.artist_handle || artist.id}` : '/artists'}>
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <Music className="w-4 h-4" />
            Back to {artist?.artist_name || 'Artists'}
          </Button>
        </Link>

        {/* Song Header */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Cover Art */}
          <div className="md:col-span-1">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl bg-gradient-card">
              <img
                src={song.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80'}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Song Info */}
          <div className="md:col-span-2 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <NeonBadge color="purple">{song.genre || 'Music'}</NeonBadge>
              <MainstreamFirstBadge 
                status={song.mainstream_first_status}
                startDate={song.mainstream_first_start_date}
                isHeardFirst={song.is_heard_first}
              />
              {averageRating !== 'New' && (
                <NeonBadge color="cyan">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  {averageRating}/5
                </NeonBadge>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{song.title}</h1>
            
            {artist && (
              <div className="mb-4">
                <Link to={`/artist/${artist.artist_handle || artist.id}`} className="text-lg text-muted-foreground hover:text-neon-cyan transition-colors">
                  {artist.artist_name}
                </Link>
                {artist.artist_handle && (
                  <div className="mt-0.5">
                    <ArtistHandle handle={artist.artist_handle} size="sm" />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                {song.play_count || 0} plays
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : '3:30'}
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {ratings.length} reviews
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                className="bg-gradient-neon hover:opacity-90 gap-2"
                onClick={() => {
                  if (!song) return;
                  if (locked) return;
                  if (isCurrent) togglePlay();
                  else playTrack(song);
                }}
                disabled={locked}
              >
                {isCurrent && isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                {isCurrent && isPlaying ? 'Pause' : 'Play Now'}
              </Button>
              <Button variant="outline" className="gap-2">
                <Heart className="w-4 h-4" />
                Favorite
              </Button>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied!');
                }}
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>

            {song.is_purchasable && locked && (
              <div className="mt-5">
                <PreviewPlayer song={song} />
              </div>
            )}

            {artist?.direct_purchases_enabled && song.is_purchasable && Number(song.purchase_price || 0) >= 0.5 && (
              <div className="mt-5 space-y-3">
                <BuySongButton song={song} artist={artist} />
                <PurchaseVsFundingExplainer variant="purchase" />
              </div>
            )}
          </div>
        </div>

        {/* Rating Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <GlassCard hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-neon-purple/10">
                <Star className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Fan Ratings</h3>
                <p className="text-xs text-muted-foreground">{ratings.length} reviews</p>
              </div>
            </div>

            {averageRating !== 'New' ? (
              <>
                <div className="text-4xl font-bold font-display text-neon-purple mb-4">
                  {averageRating}
                  <span className="text-lg text-muted-foreground ml-1">/5</span>
                </div>
                
                <div className="space-y-2">
                  {ratingDistribution.map(({ stars, count }) => (
                    <div key={stars} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-12">{stars} stars</span>
                      <Progress 
                        value={(count / ratings.length) * 100} 
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Be the first to rate this track</p>
              </div>
            )}
          </GlassCard>

          <GlassCard hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-neon-cyan/10">
                <TrendingUp className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Top Moods</h3>
                <p className="text-xs text-muted-foreground">What fans are feeling</p>
              </div>
            </div>

            {sortedMoods.length > 0 ? (
              <div className="space-y-3">
                {sortedMoods.map(([mood, count], idx) => (
                  <div key={mood} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-muted-foreground capitalize">{mood}</div>
                    <Progress 
                      value={(count / ratings.length) * 100} 
                      className="h-2 flex-1"
                    />
                    <NeonBadge color="cyan">{count}</NeonBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No mood data yet</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Discovery History — permanent record for Mainstream First / Heard First songs */}
        <SongDiscoveryHistory song={song} />

        {/* Leave Rating */}
        <TrackFeedback 
          songId={song.id}
          artistProfileId={song.artist_profile_id}
          songTitle={song.title}
        />

        {/* Song Store Reviews (verified purchase, name shown) */}
        {song.is_purchasable && (
          <div className="mt-8">
            <SongStoreReviewsSection song={song} artist={artist} />
          </div>
        )}

        {/* Fan Reviews (public, name hidden) */}
        <div className="mt-8">
          <FanReviewsSection
            reviewType="song"
            targetId={song.id}
            artistProfileId={song.artist_profile_id}
            artistName={artist?.artist_name}
            songTitle={song.title}
          />
        </div>
      </motion.div>
    </div>
  );
}