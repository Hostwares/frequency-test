import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePlayer } from '@/context/PlayerContext';
import {
  Trophy, ArrowLeft, Play, Pause, Music, Video, User, Users,
  Heart, TrendingUp, Star, Loader2, ExternalLink, Calendar
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import NomineeVoteButton from '@/components/academy/NomineeVoteButton';
import NomineeRankedBallot from '@/components/academy/NomineeRankedBallot';
import CategoryNomineeList from '@/components/academy/CategoryNomineeList';

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
  eligible: { color: 'blue', label: 'Eligible' },
  nominated: { color: 'cyan', label: 'Nominated' },
  shortlisted: { color: 'purple', label: 'Shortlisted' },
  winner: { color: 'magenta', label: 'Winner' },
  honorable_mention: { color: 'turquoise', label: 'Honorable Mention' },
};

function getYouTubeEmbed(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

export default function NomineeDetail() {
  const { id } = useParams();
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer();

  const { data: nominee, isLoading: nomLoading } = useQuery({
    queryKey: ['awards-nominee', id],
    queryFn: () => base44.entities.AwardsNominee.get(id),
  });

  const { data: category } = useQuery({
    queryKey: ['awards-nominee-category', nominee?.category_id],
    queryFn: () => base44.entities.AwardsCategory.get(nominee.category_id),
    enabled: !!nominee?.category_id,
  });

  const { data: artist } = useQuery({
    queryKey: ['awards-nominee-artist', nominee?.artist_profile_id],
    queryFn: () => base44.entities.ArtistProfile.get(nominee.artist_profile_id),
    enabled: !!nominee?.artist_profile_id,
  });

  const { data: artistSongs = [] } = useQuery({
    queryKey: ['awards-nominee-artist-songs', nominee?.artist_profile_id],
    queryFn: () => base44.entities.Song.filter(
      { artist_profile_id: nominee.artist_profile_id, is_active_version: true },
      '-release_date', 10
    ),
    enabled: !!nominee?.artist_profile_id,
  });

  const { data: nominatedSong } = useQuery({
    queryKey: ['awards-nominee-song', nominee?.song_id],
    queryFn: () => base44.entities.Song.get(nominee.song_id),
    enabled: !!nominee?.song_id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['awards-nominee-events', nominee?.artist_profile_id],
    queryFn: () => base44.entities.Event.filter(
      { artist_profile_id: nominee.artist_profile_id },
      'date', 5
    ),
    enabled: !!nominee?.artist_profile_id,
  });

  const { data: myVotesData } = useQuery({
    queryKey: ['my-awards-votes'],
    queryFn: () => base44.functions.invoke('castAcademyVote', { action: 'get_my_votes' }),
    retry: false,
  });
  const myVotes = myVotesData?.data?.votes || [];

  const playableSongs = useMemo(() => {
    const songs = nominatedSong ? [nominatedSong] : artistSongs.filter(s => s.audio_url);
    return songs;
  }, [nominatedSong, artistSongs]);

  const videoEmbed = useMemo(() => getYouTubeEmbed(nominee?.video_url), [nominee?.video_url]);

  if (nomLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!nominee) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <h2 className="text-lg font-display font-semibold">Nominee Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1">This nominee may have been removed.</p>
        <Button asChild className="mt-4">
          <Link to="/academy-dashboard"><ArrowLeft className="w-4 h-4" /> Back to Academy</Link>
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[nominee.status] || STATUS_CONFIG.eligible;
  const coverImage = nominee.cover_image || artist?.profile_image || artist?.cover_image;
  const metrics = nominee.supporting_metrics || {};

  const handlePlaySong = (song) => {
    if (currentTrack?.id === song.id) { togglePlay(); return; }
    playTrack(song, playableSongs);
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6">
      {/* Back Link */}
      <Link to="/academy-dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Academy
      </Link>

      {/* Hero Header */}
      <GlassCard hover={false} className="overflow-hidden">
        <div className="relative h-48 md:h-64 bg-gradient-neon">
          {coverImage && (
            <img src={coverImage} alt={nominee.nominee_name} className="w-full h-full object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <NeonBadge color="turquoise" className="text-xs">
                {NOMINEE_TYPE_LABELS[nominee.nominee_type] || nominee.nominee_type}
              </NeonBadge>
              <NeonBadge color={statusCfg.color} className="text-xs">{statusCfg.label}</NeonBadge>
              {category && (
                <NeonBadge color="purple" className="text-xs">
                  <Trophy className="w-3 h-3 inline mr-1" />{category.name}
                </NeonBadge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{nominee.nominee_name}</h1>
            {artist?.artist_handle && (
              <p className="text-sm text-neon-cyan mt-0.5">!{artist.artist_handle}</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Bio Section */}
      {nominee.bio && (
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display font-semibold">About the Nominee</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{nominee.bio}</p>
        </GlassCard>
      )}

      {/* Nomination Reason */}
      {nominee.nomination_reason && (
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-neon-magenta" />
            <h3 className="text-sm font-display font-semibold">Why They Were Nominated</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{nominee.nomination_reason}</p>
        </GlassCard>
      )}

      {/* Live Performance Video */}
      {videoEmbed && (
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4 text-neon-magenta" />
            <h3 className="text-sm font-display font-semibold">
              {nominee.nominee_type === 'live_performance' ? 'Live Performance' : 'Featured Video'}
            </h3>
          </div>
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={videoEmbed}
              title={nominee.nominee_name}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </GlassCard>
      )}

      {/* Music Player — for song or artist nominees */}
      {playableSongs.length > 0 && (
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-neon-cyan" />
            <h3 className="text-sm font-display font-semibold">
              {nominatedSong ? 'Nominated Song' : 'Music'}
            </h3>
          </div>
          <div className="space-y-2">
            {playableSongs.map(song => {
              const isCurrent = currentTrack?.id === song.id;
              const isThisPlaying = isCurrent && isPlaying;
              return (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
                >
                  <button
                    onClick={() => handlePlaySong(song)}
                    className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors"
                  >
                    {isThisPlaying ? (
                      <Pause className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist_name}</p>
                  </div>
                  {song.is_heard_first && (
                    <NeonBadge color="turquoise" className="text-[10px]">Heard First</NeonBadge>
                  )}
                  {song.duration_seconds > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.floor(song.duration_seconds / 60)}:{String(Math.floor(song.duration_seconds % 60)).padStart(2, '0')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Artist Profile Link */}
      {artist && (
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-display font-semibold">Artist Profile</h3>
          </div>
          <Link
            to={`/artist/${artist.id}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
              {artist.profile_image && (
                <img src={artist.profile_image} alt={artist.artist_name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium group-hover:text-primary transition-colors">{artist.artist_name}</p>
              {artist.artist_handle && <p className="text-xs text-neon-cyan">!{artist.artist_handle}</p>}
              {artist.genre && <p className="text-xs text-muted-foreground">{artist.genre}</p>}
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </GlassCard>
      )}

      {/* Upcoming Events / Live Performances */}
      {events.length > 0 && (
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-neon-turquoise" />
            <h3 className="text-sm font-display font-semibold">Upcoming Events</h3>
          </div>
          <div className="space-y-2">
            {events.map(event => (
              <Link
                key={event.id}
                to={`/event/${event.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-neon-turquoise/15 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-neon-turquoise" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
                {event.is_livestreamed && <NeonBadge color="magenta" className="text-[10px]">Livestream</NeonBadge>}
              </Link>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Supporting Metrics */}
      {Object.keys(metrics).length > 0 && (
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-neon-blue" />
            <h3 className="text-sm font-display font-semibold">Supporting Metrics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.resonance_score != null && (
              <div className="text-center p-3 bg-secondary/20 rounded-lg">
                <TrendingUp className="w-4 h-4 text-neon-purple mx-auto mb-1" />
                <p className="text-lg font-bold text-neon-purple">{metrics.resonance_score}</p>
                <p className="text-[10px] text-muted-foreground">Resonance Score</p>
              </div>
            )}
            {metrics.supporter_count != null && (
              <div className="text-center p-3 bg-secondary/20 rounded-lg">
                <Heart className="w-4 h-4 text-neon-magenta mx-auto mb-1" />
                <p className="text-lg font-bold text-neon-magenta">{metrics.supporter_count}</p>
                <p className="text-[10px] text-muted-foreground">Supporters</p>
              </div>
            )}
            {metrics.play_count != null && (
              <div className="text-center p-3 bg-secondary/20 rounded-lg">
                <Play className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
                <p className="text-lg font-bold text-neon-cyan">{metrics.play_count}</p>
                <p className="text-[10px] text-muted-foreground">Plays</p>
              </div>
            )}
            {metrics.discovery_score != null && (
              <div className="text-center p-3 bg-secondary/20 rounded-lg">
                <Star className="w-4 h-4 text-neon-turquoise mx-auto mb-1" />
                <p className="text-lg font-bold text-neon-turquoise">{metrics.discovery_score}</p>
                <p className="text-[10px] text-muted-foreground">Discovery Score</p>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Vote Button / Ranked Ballot */}
      {category && category.voting_phase === 'final_voting' ? (
        <NomineeRankedBallot category={category} currentNomineeId={nominee.id} />
      ) : category && (
        <NomineeVoteButton nominee={nominee} category={category} />
      )}

      {/* Category Nominee List — shown when voting is open or to browse all nominees */}
      {category && (
        <CategoryNomineeList
          category={category}
          currentNomineeId={nominee.id}
          myVotes={myVotes}
        />
      )}

      {/* Motto */}
      <p className="text-center text-xs text-muted-foreground italic font-display pt-2">
        Become Who You Were Meant to Be.
      </p>
    </div>
  );
}