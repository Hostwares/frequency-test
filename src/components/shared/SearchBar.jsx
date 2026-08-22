import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Mic2, Music, Disc3, Radio, Users, Compass,
  Music2, FileText, Gauge, Guitar, ArrowRight, X,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CATEGORY_CONFIG = [
  { key: 'artists', label: 'Artists', icon: Mic2, route: (item) => `/artist/${item.id}`, primary: (i) => i.artist_name, secondary: (i) => [i.genre, i.location].filter(Boolean).join(' · ') },
  { key: 'songs', label: 'Songs', icon: Music, route: (item) => `/song/${item.id}`, primary: (i) => i.title, secondary: (i) => i.artist_name },
  { key: 'albums', label: 'Albums', icon: Disc3, route: (item) => `/catalog`, primary: (i) => i.title, secondary: (i) => i.artist_name },
  { key: 'genres', label: 'Genres', icon: Music2, route: (item) => `/artists?genre=${encodeURIComponent(item)}`, primary: (i) => i, secondary: () => '' },
  { key: 'communities', label: 'Communities', icon: Radio, route: (item) => `/frequency/${item.id}`, primary: (i) => i.name, secondary: (i) => i.genre },
  { key: 'discovery_partners', label: 'Discovery Partners', icon: Compass, route: (item) => `/discovery-partner/${item.id}`, primary: (i) => i.name, secondary: (i) => i.location },
  { key: 'radio_stations', label: 'Radio Stations', icon: Radio, route: (item) => `/radio-programmer-dashboard`, primary: (i) => i.station_name, secondary: (i) => [i.format, i.location].filter(Boolean).join(' · ') },
  { key: 'radio_programmers', label: 'Radio Programmers', icon: Users, route: (item) => `/radio-programmer-dashboard`, primary: (i) => i.station_name, secondary: (i) => [i.role, i.location].filter(Boolean).join(' · ') },
  { key: 'moods', label: 'Moods', icon: Music2, route: (item) => `/catalog?mood=${encodeURIComponent(item)}`, primary: (i) => i, secondary: () => '' },
  { key: 'lyrics_matches', label: 'Lyrics', icon: FileText, route: (item) => `/song/${item.id}`, primary: (i) => i.title, secondary: (i) => i.artist_name },
  { key: 'bpm_matches', label: 'BPM', icon: Gauge, route: (item) => `/song/${item.id}`, primary: (i) => i.title, secondary: (i) => `${i.bpm} BPM · ${i.artist_name}` },
  { key: 'instrument_matches', label: 'Instruments / Credits', icon: Guitar, route: (item) => `/song/${item.id}`, primary: (i) => i.title, secondary: (i) => i.artist_name },
];

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch autocomplete results
  const { data: results, isFetching } = useQuery({
    queryKey: ['search-autocomplete', debouncedQuery],
    queryFn: async () => {
      const res = await base44.functions.invoke('search', { query: debouncedQuery, autocomplete: true });
      return res.data;
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 10000,
  });

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build flat list of visible results for keyboard navigation
  const flatResults = [];
  if (results) {
    for (const cat of CATEGORY_CONFIG) {
      const items = results[cat.key] || [];
      for (const item of items) {
        flatResults.push({ category: cat, item });
      }
    }
  }

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (flatResults.length > 0 && isOpen) {
        const { category, item } = flatResults[activeIndex];
        navigate(category.route(item));
        setIsOpen(false);
        setQuery('');
      } else if (query.trim()) {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (category, item) => {
    navigate(category.route(item));
    setIsOpen(false);
    setQuery('');
  };

  const hasResults = results && results.total_results > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search artists, songs, albums, lyrics, BPM, instruments..."
          className="w-full bg-secondary/40 border border-border/40 rounded-lg pl-10 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:bg-secondary/60 transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && debouncedQuery && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 bg-card border border-border/50 rounded-lg shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
          >
            {isFetching ? (
              <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Searching...
              </div>
            ) : !hasResults ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No results found for "{debouncedQuery}"
              </div>
            ) : (
              <>
                {CATEGORY_CONFIG.map(cat => {
                  const items = results[cat.key] || [];
                  if (items.length === 0) return null;
                  const Icon = cat.icon;
                  return (
                    <div key={cat.key} className="border-b border-border/20 last:border-b-0">
                      <div className="px-3 py-1.5 bg-secondary/20 flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{cat.label}</span>
                      </div>
                      {items.map((item, idx) => {
                        const flatIdx = flatResults.findIndex(r => r.category.key === cat.key && r.item === item);
                        const isActive = flatIdx === activeIndex;
                        return (
                          <button
                            key={`${cat.key}-${idx}`}
                            onClick={() => handleSelect(cat, item)}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                              isActive ? 'bg-primary/10' : 'hover:bg-secondary/30'
                            }`}
                          >
                            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-foreground truncate">{cat.primary(item)}</p>
                              {cat.secondary(item) && (
                                <p className="text-xs text-muted-foreground truncate">{cat.secondary(item)}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(debouncedQuery)}`);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full px-3 py-3 flex items-center justify-center gap-1.5 text-xs text-primary hover:bg-primary/5 transition-colors"
                >
                  View all results for "{debouncedQuery}"
                  <ArrowRight className="w-3 h-3" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}