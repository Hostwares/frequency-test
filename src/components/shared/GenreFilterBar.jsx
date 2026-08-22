import React, { useState, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { GENRES } from '@/lib/genres';
import { Button } from '@/components/ui/button';

// A curated set of popular/broad genres shown as quick-tap chips
const POPULAR_GENRES = [
  'hip hop', 'pop', 'rock', 'jazz', 'electronic', 'r&b', 'country', 'classical',
  'reggae', 'soul', 'metal', 'folk', 'blues', 'indie pop', 'indie rock',
  'house', 'techno', 'trap', 'ambient', 'punk', 'funk', 'alternative rock',
  'lo-fi hip hop', 'synthwave', 'drum and bass', 'afrobeats (West African urban/pop music)',
  'latin', 'bossa nova', 'k-pop', 'j-pop', 'dancehall', 'gospel', 'neo soul',
];

export default function GenreFilterBar({ value, onChange }) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return GENRES.filter(g => g.toLowerCase().includes(q)).slice(0, 30);
  }, [search]);

  const handleSelect = (genre) => {
    onChange(value === genre ? '' : genre);
    setSearch('');
    setShowAll(false);
  };

  return (
    <div className="space-y-3">
      {/* Quick chips row */}
      <div className="flex flex-wrap gap-2 items-center">
        {POPULAR_GENRES.map(genre => (
          <button
            key={genre}
            onClick={() => handleSelect(genre)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
              value === genre
                ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                : 'bg-secondary/50 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {genre}
          </button>
        ))}
        <button
          onClick={() => setShowAll(s => !s)}
          className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-border/60 text-muted-foreground hover:border-neon-cyan/50 hover:text-neon-cyan transition-all flex items-center gap-1"
        >
          {showAll ? 'Less' : 'All genres'} <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
        </button>
        {value && (
          <button
            onClick={() => onChange('')}
            className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-all flex items-center gap-1"
          >
            Clear <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Expanded search + all genres */}
      {showAll && (
        <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder={`Search all ${GENRES.length} genres...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          {search ? (
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {searchResults.length > 0 ? searchResults.map(g => (
                <button
                  key={g}
                  onClick={() => handleSelect(g)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                    value === g
                      ? 'bg-primary text-white border-primary'
                      : 'bg-secondary border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {g}
                </button>
              )) : (
                <p className="text-xs text-muted-foreground">No genres match "{search}"</p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => handleSelect(g)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                    value === g
                      ? 'bg-primary text-white border-primary'
                      : 'bg-secondary border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active filter display */}
      {value && !POPULAR_GENRES.includes(value) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtering by:</span>
          <span className="px-2.5 py-1 rounded-full text-xs bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
            {value}
            <button onClick={() => onChange('')}><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}
    </div>
  );
}