import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import HeroBannerCard from './HeroBannerCard';

const AUTO_ROTATE_MS = 12000;

export default function HeroBannerCarousel({ fallback = null, immersive = true }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef(null);
  const isScrollingProgrammatically = useRef(false);
  const sessionId = useRef(Math.random().toString(36).substring(2)).current;

  const { data: banners, isLoading } = useQuery({
    queryKey: ['hero-banners'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getHeroBanners', {});
      return res.data?.banners || [];
    },
    staleTime: 60000,
  });

  const bannerList = banners || [];

  const scrollToIndex = useCallback((index) => {
    const container = scrollRef.current;
    if (!container || !container.children[index]) return;
    isScrollingProgrammatically.current = true;
    container.scrollTo({ left: container.children[index].offsetLeft, behavior: 'smooth' });
    setTimeout(() => { isScrollingProgrammatically.current = false; }, 800);
  }, []);

  const goTo = useCallback((index) => {
    if (bannerList.length === 0) return;
    const next = ((index % bannerList.length) + bannerList.length) % bannerList.length;
    setActiveIndex(next);
    scrollToIndex(next);
  }, [bannerList.length, scrollToIndex]);

  // Auto-rotation
  useEffect(() => {
    if (isPaused || bannerList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % bannerList.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_ROTATE_MS);
    return () => clearInterval(interval);
  }, [isPaused, bannerList.length, scrollToIndex]);

  // Track impressions (fire-and-forget, silently ignore errors)
  useEffect(() => {
    if (bannerList[activeIndex]) {
      base44.functions.invoke('trackHeroBannerInteraction', {
        banner_id: bannerList[activeIndex].id,
        interaction_type: 'impression',
        session_id: sessionId,
      }).catch(() => {});
    }
  }, [activeIndex, bannerList, sessionId]);

  // Scroll handler — update active index on manual scroll
  const handleScroll = useCallback(() => {
    if (isScrollingProgrammatically.current) return;
    const container = scrollRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    let closest = 0;
    let minDist = Infinity;
    Array.from(container.children).forEach((child, i) => {
      const dist = Math.abs(child.offsetLeft - scrollLeft);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    if (closest !== activeIndex) setActiveIndex(closest);
  }, [activeIndex]);

  if (isLoading) {
    return <div className="w-full aspect-[16/10] md:aspect-[21/8] bg-secondary/30 animate-pulse" />;
  }

  if (!bannerList || bannerList.length === 0) return fallback;

  if (bannerList.length === 1) {
    return (
      <div className={immersive ? '-mx-4 md:-mx-8' : ''}>
        <HeroBannerCard banner={bannerList[0]} fullWidth={immersive} />
      </div>
    );
  }

  return (
    <div className={`relative group/carousel ${immersive ? '-mx-4 md:-mx-8' : ''}`}>
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
      >
        {/* Leading spacer for edge alignment in immersive mode */}
        {immersive && <div className="flex-shrink-0 w-4 md:w-8" aria-hidden="true" />}

        {bannerList.map((banner, index) => (
          <div
            key={banner.id}
            className="snap-center flex-shrink-0 w-[85%] md:w-[82%]"
          >
            <HeroBannerCard banner={banner} index={index} fullWidth={immersive} />
          </div>
        ))}

        {/* Trailing spacer for edge alignment in immersive mode */}
        {immersive && <div className="flex-shrink-0 w-4 md:w-8" aria-hidden="true" />}
      </div>

      {/* Arrow navigation — positioned at card edges */}
      <button
        onClick={() => goTo(activeIndex - 1)}
        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 backdrop-blur-md rounded-full p-2 md:p-3 hover:bg-black/80 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center shadow-lg"
        aria-label="Previous banner"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={() => goTo(activeIndex + 1)}
        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 backdrop-blur-md rounded-full p-2 md:p-3 hover:bg-black/80 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center shadow-lg"
        aria-label="Next banner"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Progress bar + dot indicators */}
      <div className={`flex flex-col items-center gap-2 mt-3 md:mt-4 ${immersive ? 'px-4 md:px-8' : ''}`}>
        <div className="flex justify-center gap-2">
          {bannerList.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-8 bg-primary' : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'
              }`}
              aria-label={`Go to banner ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}