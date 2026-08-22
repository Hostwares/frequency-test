import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BadgeCheck, Users, Sparkles, Heart, Share2, 
  MapPin, Globe, ExternalLink, Music, ShoppingBag, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import VerificationBadge from '@/components/shared/VerificationBadge';
import SongRow from '@/components/shared/SongRow';
import ArtistCard from '@/components/shared/ArtistCard';
import SupportArtistModal from '@/components/artist/SupportArtistModal';
import MilestoneAchieved from '@/components/artist/MilestoneAchieved';
import ArtistSocialLinks from '@/components/shared/ArtistSocialLinks';
import TrackFeedback from '@/components/song/TrackFeedback';
import UserActionsMenu from '@/components/shared/UserActionsMenu';
import ArtistHandle from '@/components/shared/ArtistHandle';
import VerifiedArtistBadge from '@/components/shared/VerifiedArtistBadge';
import ArtistShareButton from '@/components/shared/ArtistShareButton';
import ArtistQRCode from '@/components/shared/ArtistQRCode';
import ArtistFirstReleaseTimeline from '@/components/shared/ArtistFirstReleaseTimeline';
import ArtistRecommendationPanel from '@/components/shared/ArtistRecommendationPanel';
import FanAllocationTransparency from '@/components/shared/FanAllocationTransparency';
import BuySongButton from '@/components/shared/BuySongButton';
import PurchaseVsFundingExplainer from '@/components/shared/PurchaseVsFundingExplainer';
import FanReviewsSection from '@/components/reviews/FanReviewsSection';
import { useCatalogAccess } from '@/hooks/useCatalogAccess';

export default function ArtistProfilePage() {
  const [supportOpen, setSupportOpen] = React.useState(false);
  const [storeFilter, setStoreFilter] = React.useState('all');
  const [genreFilter, setGenreFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('default');
  const { hasAccess } = useCatalogAccess();
  const { id: artistId } = useParams();

  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: async () => {
      const lookup = artistId.toLowerCase();
      let results = await base44.entities.ArtistProfile.filter({ artist_handle: lookup });
      if (!results || results.length === 0) {
        results = await base44.entities.ArtistProfile.filter({ id: artistId });
      }
      return results;
    },
    enabled: !!artistId,
    select: (data) => data?.[0],
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['artist-songs', artist?.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artist?.id }, '-play_count', 20),
    enabled: !!artist?.id,
  });

  const { data: merch = [] } = useQuery({
    queryKey: ['artist-merch', artist?.id],
    queryFn: () => base44.entities.MarketplaceItem.filter({ artist_profile_id: artist?.id }, '-created_date', 20),
    enabled: !!artist?.id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['artist-events', artist?.id],
    queryFn: () => base44.entities.Event.filter({ artist_profile_id: artist?.id }, 'date', 20),
    enabled: !!artist?.id,
  });

  const { data: recommendedArtists = [] } = useQuery({
    queryKey: ['recommended-artists'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 6),
    enabled: !!artist,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Artist not found
      </div>
    );
  }

  // ── Song Store filter (purchasable songs) ──
  const storeSongs = songs.filter((s) => s.is_purchasable);
  const hasStore = artist.direct_purchases_enabled && storeSongs.length > 0;
  const artistAccessible = hasAccess(artist.id);
  let visibleSongs = songs;
  if (storeFilter === 'available') {
    visibleSongs = artistAccessible ? [] : storeSongs;
  } else if (storeFilter === 'purchased') {
    visibleSongs = artistAccessible ? storeSongs : [];
  }
  if (genreFilter !== 'all') {
    visibleSongs = visibleSongs.filter((s) => s.genre === genreFilter);
  }
  const genres = [...new Set(songs.map((s) => s.genre).filter(Boolean))].sort();
  visibleSongs = [...visibleSongs].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.release_date || 0) - new Date(a.release_date || 0);
    if (sortBy === 'oldest') return new Date(a.release_date || 0) - new Date(b.release_date || 0);
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'price_low') return (a.purchase_price || 0) - (b.purchase_price || 0);
    if (sortBy === 'price_high') return (b.purchase_price || 0) - (a.purchase_price || 0);
    return 0;
  });

  return (
    <div className="pb-24">
      {/* Cover */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <img
          src={artist.cover_image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80'}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-20 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-background shadow-xl flex-shrink-0">
            <img
              src={artist.profile_image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80'}
              alt={artist.artist_name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-display font-bold">{artist.artist_name}</h1>
              {artist.is_verified && <VerifiedArtistBadge isVerified={true} size="lg" />}
            </div>
            {artist.artist_handle && (
              <div className="mt-1">
                <ArtistHandle handle={artist.artist_handle} size="md" />
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <VerificationBadge 
                verificationType={artist.verification_badge || 'human_created'} 
                isVerified={artist.is_verified} 
              />
              {artist.genre && <NeonBadge color="purple">{artist.genre}</NeonBadge>}
              {artist.location && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{artist.location}
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold font-display text-foreground">{artist.supporter_count || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Supporters</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold font-display text-neon-purple">{artist.resonance_score || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Resonance</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold font-display text-neon-cyan">{songs.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Songs</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5 flex-wrap items-center">
              <Button className="bg-gradient-neon hover:opacity-90 text-white font-semibold px-6" onClick={() => setSupportOpen(true)}>
                <Heart className="w-4 h-4 mr-2" /> Support
              </Button>
              <ArtistShareButton artist={artist} />
              <ArtistQRCode artist={artist} />
              {artist.website && (
                <Button variant="ghost" size="icon" asChild>
                  <a href={artist.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4" />
                  </a>
                </Button>
              )}
              {artist.user_id && (
                <UserActionsMenu targetUserId={artist.user_id} targetUserName={artist.artist_name} />
              )}
            </div>

            {/* Social & Streaming Links */}
            {artist.social_platforms && artist.social_platforms.length > 0 && (
              <div className="mt-4">
                <ArtistSocialLinks socialPlatforms={artist.social_platforms} />
              </div>
            )}
          </div>
        </motion.div>

        {/* Milestone Achieved */}
        <MilestoneAchieved artist={artist} />

        {/* Bio */}
        {artist.bio && (
          <GlassCard hover={false} className="mt-8 p-6">
            <p className="text-sm text-muted-foreground leading-relaxed">{artist.bio}</p>
          </GlassCard>
        )}

        {/* Fan Allocation Transparency™ */}
        <FanAllocationTransparency artist={artist} />

        {/* Tabs */}
        <Tabs defaultValue="music" className="mt-8">
          <TabsList className="bg-secondary/50 border border-border/30 overflow-x-auto flex-nowrap w-full justify-start sm:justify-center">
            <TabsTrigger value="music" className="flex-1 sm:flex-initial">Music</TabsTrigger>
            <TabsTrigger value="merch" className="flex-1 sm:flex-initial">Merch</TabsTrigger>
            <TabsTrigger value="events" className="flex-1 sm:flex-initial">Events</TabsTrigger>
            <TabsTrigger value="network" className="flex-1 sm:flex-initial">Network</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1 sm:flex-initial">Timeline</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 sm:flex-initial">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="music" className="mt-6 space-y-4">
            {artist.direct_purchases_enabled && <PurchaseVsFundingExplainer variant="purchase" />}
            {hasStore && (
              <div className="flex items-center gap-2 flex-wrap max-w-2xl">
                <span className="text-xs text-muted-foreground">Song Store:</span>
                <div className="inline-flex rounded-lg bg-secondary/60 border border-border/40 p-0.5">
                  {[
                    { key: 'all', label: 'All Songs' },
                    { key: 'available', label: 'Available for Access' },
                    { key: 'purchased', label: 'Already Purchased' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setStoreFilter(opt.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${storeFilter === opt.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap max-w-2xl">
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="bg-secondary/60 border border-border/40 rounded-md text-xs px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Genres</option>
                {genres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-secondary/60 border border-border/40 rounded-md text-xs px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="default">Sort: Default</option>
                <option value="newest">Newest Release</option>
                <option value="oldest">Oldest Release</option>
                <option value="title">Title A–Z</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
            {visibleSongs.map((song, i) => (
              <div key={song.id} className="group">
                <SongRow song={song} index={i} showArtist={false} queue={songs} />
                <div className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity max-w-2xl">
                  <TrackFeedback 
                    songId={song.id}
                    artistProfileId={artist.id}
                    songTitle={song.title}
                  />
                </div>
                <div className="px-4 pb-3 max-w-2xl">
                  <BuySongButton song={song} artist={artist} />
                </div>
              </div>
            ))}
            {visibleSongs.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {genreFilter !== 'all'
                  ? 'No songs match this genre.'
                  : storeFilter === 'available'
                  ? 'You already have access to this artist\u2019s full catalog.'
                  : storeFilter === 'purchased'
                  ? 'No purchased songs yet. Buy a song to unlock Current Catalog Access.'
                  : 'No songs yet'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="merch" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {merch.map(item => (
                <GlassCard key={item.id} className="overflow-hidden">
                  <div className="h-32 overflow-hidden">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-semibold truncate">{item.title}</h4>
                    <p className="text-neon-cyan font-bold mt-1">${item.price}</p>
                  </div>
                </GlassCard>
              ))}
              {merch.length === 0 && (
                <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  No merch available yet
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            <div className="space-y-3">
              {events.map(event => (
                <Link to={`/event/${event.id}`} key={event.id}>
                  <GlassCard className="p-5 flex gap-4 items-center hover:border-primary/30">
                    <div className="text-center flex-shrink-0 w-14">
                      <p className="text-lg font-bold text-neon-cyan">{new Date(event.date).getDate()}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm truncate">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">{event.location}</p>
                    </div>
                    {event.ticket_price > 0 && (
                      <NeonBadge color="cyan">${event.ticket_price}</NeonBadge>
                    )}
                  </GlassCard>
                </Link>
              ))}
              {events.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No upcoming events</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="network" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recommendedArtists.filter(a => a.id !== artist.id).slice(0, 6).map(a => (
                <ArtistCard key={a.id} artist={a} />
              ))}
              {recommendedArtists.length <= 1 && (
                <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
                  <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  No network connections yet
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <ArtistFirstReleaseTimeline artistProfileId={artist.id} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <FanReviewsSection
              reviewType="artist"
              targetId={artist.id}
              artistProfileId={artist.id}
              artistName={artist.artist_name}
            />
          </TabsContent>
        </Tabs>
        {/* Community-Driven Recommendations */}
        <ArtistRecommendationPanel
          artistId={artist.id}
          artistName={artist.artist_name}
          artistGenre={artist.genre}
        />
      </div>
      {artist && <SupportArtistModal artist={artist} open={supportOpen} onClose={() => setSupportOpen(false)} />}
    </div>
  );
}