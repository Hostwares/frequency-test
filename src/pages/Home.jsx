import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Disc3, Radio, Calendar, ArrowRight, Headphones, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ArtistCard from '@/components/shared/ArtistCard';
import FrequencyCard from '@/components/shared/FrequencyCard';
import SongRow from '@/components/shared/SongRow';
import RecentlyPlayed from '@/components/player/RecentlyPlayed';
import GlassCard from '@/components/shared/GlassCard';
import WaveformBar from '@/components/layout/WaveformBar';
import RecommendationEngine from '@/components/shared/RecommendationEngine';
import PartnerSpotlightSection from '@/components/shared/PartnerSpotlightSection';
import HeroBannerCarousel from '@/components/hero/HeroBannerCarousel';
import DiscoveryPartnerLeaderboard from '@/components/discovery/DiscoveryPartnerLeaderboard';
import ShortcutCardGrid from '@/components/pwa/ShortcutCardGrid';

function HeroSection() {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-secondary to-card border border-border/50 p-5 md:p-12">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-neon-purple rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-neon-cyan rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-neon-magenta rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <WaveformBar count={7} color="bg-neon-cyan" />
          <span className="text-xs uppercase tracking-widest text-neon-cyan font-semibold">The Pulse</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-tight">
          Real Music.{' '}
          <span className="text-gradient-neon">Real Artists.</span>
          <br />Real Impact.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-lg text-sm md:text-base leading-relaxed">
          A fan-first music economy. No pay-per-stream. No paid placement. 
          Your support goes directly to artists you believe in.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button className="bg-gradient-neon hover:opacity-90 text-white font-semibold px-6" onClick={() => navigate('/artists')}>
            Start Discovering
          </Button>
          <Button variant="outline" className="border-border/60 hover:border-primary/50" onClick={() => navigate('/pricing')}>
            <span>How It Works</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, linkTo, linkText }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <h2 className="text-lg md:text-xl font-display font-bold text-foreground">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
          {linkText || 'View All'} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const { data: artists = [] } = useQuery({
    queryKey: ['artists-featured'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 8),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs-new'],
    queryFn: () => base44.entities.Song.list('-created_date', 6),
  });

  const { data: communities = [] } = useQuery({
    queryKey: ['communities-featured'],
    queryFn: () => base44.entities.FrequencyCommunity.list('-member_count', 6),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-upcoming'],
    queryFn: () => base44.entities.Event.list('date', 4),
  });



  return (
    <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto space-y-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <HeroBannerCarousel fallback={<HeroSection />} />
      </motion.div>

      {/* Recently Played */}
      <RecentlyPlayed />

      {/* PWA Quick Launch Shortcuts */}
      <ShortcutCardGrid />

      {/* Community-Driven Recommendation Engine */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <RecommendationEngine />
      </motion.section>

      {/* Emerging Artists */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <SectionHeader icon={TrendingUp} title="Emerging Artists" subtitle="Rising through real fan connections" linkTo="/artists" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {artists.map(artist => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
        {artists.length === 0 && (
          <GlassCard hover={false} className="p-8 text-center">
            <Disc3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No artists yet. Be the first to create a profile!</p>
          </GlassCard>
        )}
      </motion.section>

      {/* New Releases */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <SectionHeader icon={Disc3} title="New Releases" subtitle="Fresh music from the community" />
        <GlassCard hover={false} className="divide-y divide-border/30">
          {songs.map((song, i) => (
            <SongRow key={song.id} song={song} index={i} queue={songs} />
          ))}
          {songs.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No songs uploaded yet.
            </div>
          )}
        </GlassCard>
      </motion.section>

      {/* Frequencies */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <SectionHeader icon={Radio} title="Frequencies" subtitle="Music communities built by fans" linkTo="/frequencies" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map(c => (
            <FrequencyCard key={c.id} community={c} />
          ))}
          {communities.length === 0 && (
            <GlassCard hover={false} className="p-8 text-center col-span-full">
              <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No Frequency communities yet.</p>
            </GlassCard>
          )}
        </div>
      </motion.section>

      {/* Heard First on The Mainstream™ */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/heard-first">
            <GlassCard className="p-6 flex items-center justify-between hover:border-neon-turquoise/30 h-full">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-5 h-5 text-neon-turquoise" />
                  <span className="text-xs uppercase tracking-widest text-neon-turquoise font-semibold">Exclusive Discovery Archive</span>
                </div>
                <h3 className="font-display font-bold text-lg">Heard First on The Mainstream™</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Songs that debuted exclusively here before their wider release.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-neon-turquoise flex-shrink-0 ml-4" />
            </GlassCard>
          </Link>
          <Link to="/hall-of-discovery">
            <GlassCard className="p-6 flex items-center justify-between hover:border-neon-magenta/30 h-full">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-neon-magenta" />
                  <span className="text-xs uppercase tracking-widest text-neon-magenta font-semibold">Permanent Celebration</span>
                </div>
                <h3 className="font-display font-bold text-lg">Hall of Discovery™</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Songs first launched here that achieved major milestones.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-neon-magenta flex-shrink-0 ml-4" />
            </GlassCard>
          </Link>
        </div>
      </motion.section>

      {/* Partner Spotlights — verified partners only */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <PartnerSpotlightSection />
      </motion.section>

      {/* Discovery Partner Leaderboard */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <DiscoveryPartnerLeaderboard />
      </motion.section>

      {/* Upcoming Events */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <SectionHeader icon={Calendar} title="Upcoming Events" subtitle="Shows, parties, and festivals" linkTo="/events" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map(event => (
            <GlassCard key={event.id} className="p-5 flex gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={event.cover_image || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=100&q=80'}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate">{event.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{event.location}</p>
                <p className="text-xs text-neon-cyan mt-1">
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </GlassCard>
          ))}
          {events.length === 0 && (
            <GlassCard hover={false} className="p-8 text-center col-span-full">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No upcoming events.</p>
            </GlassCard>
          )}
        </div>
      </motion.section>
    </div>
  );
}