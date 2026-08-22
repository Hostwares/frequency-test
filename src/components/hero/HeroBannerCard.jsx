import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NeonBadge from '@/components/shared/NeonBadge';
import { base44 } from '@/api/base44Client';

const CATEGORY_COLORS = {
  mainstream_first: 'purple',
  heard_first: 'turquoise',
  rising: 'cyan',
  featured_artist: 'magenta',
  new_release: 'blue',
  discovery_partner_spotlight: 'cyan',
  community_spotlight: 'turquoise',
  radio_spotlight: 'purple',
  live_event: 'magenta',
  merchandise: 'blue',
  ticket_sale: 'cyan',
  editorial_collection: 'purple',
  promotional_campaign: 'magenta',
};

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80',
  'https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=1600&q=80',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1600&q=80',
];

export default function HeroBannerCard({ banner, index = 0, fullWidth = false }) {
  const navigate = useNavigate();

  const artwork = banner.desktop_artwork || banner.mobile_artwork || banner.artist_image || DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];
  const categoryColor = CATEGORY_COLORS[banner.category] || 'purple';
  const categoryLabel = banner.category_label || (banner.category || '').replace(/_/g, ' ');
  const isPlayAction = banner.cta_action === 'play_now';

  const handleCTA = (e) => {
    if (e) e.stopPropagation();
    base44.functions.invoke('trackHeroBannerInteraction', {
      banner_id: banner.id,
      interaction_type: 'click',
    }).catch(() => {});

    if (banner.cta_url) {
      navigate(banner.cta_url);
      return;
    }

    switch (banner.cta_action) {
      case 'view_artist':
      case 'support_artist':
        if (banner.artist_profile_id) navigate(`/artist/${banner.artist_profile_id}`);
        break;
      case 'view_community':
        if (banner.community_id) navigate(`/frequency/${banner.community_id}`);
        break;
      case 'view_event':
      case 'buy_tickets':
        if (banner.event_id) navigate(`/event/${banner.event_id}`);
        break;
      case 'play_now':
        if (banner.song_id) navigate(`/song/${banner.song_id}`);
        break;
      case 'shop_merch':
        navigate('/marketplace');
        break;
      case 'join_now':
        navigate('/pricing');
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={`relative w-full aspect-[16/10] md:aspect-[21/8] overflow-hidden group cursor-pointer ${
        fullWidth ? '' : 'rounded-2xl'
      }`}
      onClick={handleCTA}
    >
      <img
        src={artwork}
        alt={banner.headline}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[7000ms] ease-out group-hover:scale-105"
      />
      {/* Multi-layer gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/30" />

      {/* Category badge */}
      <div className="absolute top-4 left-4 md:top-6 md:left-8 z-10">
        <NeonBadge color={categoryColor} className="uppercase tracking-wider font-semibold">
          {categoryLabel}
        </NeonBadge>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-10">
        <div className="max-w-3xl">
          <h2 className="text-xl md:text-5xl font-display font-bold text-white leading-tight drop-shadow-lg">
            {banner.headline}
          </h2>
          {banner.subheadline && (
            <p className="text-xs md:text-lg text-white/75 mt-2 md:mt-3 max-w-2xl line-clamp-2 drop-shadow">
              {banner.subheadline}
            </p>
          )}
          <div className="flex items-center justify-between mt-4 md:mt-6 gap-4">
            <div className="flex items-center gap-2 text-xs md:text-sm text-white/60 min-w-0">
              {banner.artist_handle && (
                <span className="text-neon-cyan font-medium flex-shrink-0">!{banner.artist_handle}</span>
              )}
              {banner.genre && <span className="truncate hidden sm:inline">· {banner.genre}</span>}
            </div>
            <Button
              className="bg-gradient-neon hover:opacity-90 text-white font-semibold flex-shrink-0 shadow-lg"
              onClick={handleCTA}
            >
              {isPlayAction && <Play className="w-4 h-4 fill-white" />}
              <span className="hidden sm:inline">{banner.cta_text || 'Learn More'}</span>
              {!isPlayAction && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}