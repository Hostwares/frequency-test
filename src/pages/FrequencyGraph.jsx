import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Network, Music, Users, Radio, TrendingUp, ExternalLink, X,
  Sparkles, Filter, Zap, GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

// ─── Force simulation ─────────────────────────────────────────────────────────
function useForceGraph(nodes, links, width, height) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    if (!nodes.length || width < 100) return;

    const pos = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const r = Math.min(width, height) * 0.32;
      pos[n.id] = {
        x: width / 2 + r * Math.cos(angle),
        y: height / 2 + r * Math.sin(angle),
        vx: 0, vy: 0,
      };
    });

    const REPULSION = 4000, SPRING_LEN = 100, SPRING_K = 0.03, DAMPING = 0.82, CENTER_K = 0.005;
    let frame, iter = 0;

    const tick = () => {
      iter++;
      if (iter > 400) return;
      const p = {};
      Object.keys(pos).forEach(k => { p[k] = { ...pos[k] }; });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i].id, b = nodes[j].id;
          const dx = p[b].x - p[a].x, dy = p[b].y - p[a].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          p[a].vx -= fx; p[a].vy -= fy; p[b].vx += fx; p[b].vy += fy;
        }
      }
      links.forEach(({ source, target }) => {
        if (!p[source] || !p[target]) return;
        const dx = p[target].x - p[source].x, dy = p[target].y - p[source].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - SPRING_LEN) * SPRING_K;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        p[source].vx += fx; p[source].vy += fy; p[target].vx -= fx; p[target].vy -= fy;
      });
      nodes.forEach(n => {
        p[n.id].vx += (width / 2 - p[n.id].x) * CENTER_K;
        p[n.id].vy += (height / 2 - p[n.id].y) * CENTER_K;
        p[n.id].vx *= DAMPING; p[n.id].vy *= DAMPING;
        p[n.id].x = Math.max(40, Math.min(width - 40, p[n.id].x + p[n.id].vx));
        p[n.id].y = Math.max(40, Math.min(height - 40, p[n.id].y + p[n.id].vy));
        pos[n.id] = p[n.id];
      });
      setPositions({ ...pos });
      frame = requestAnimationFrame(tick);
    };

    setPositions({ ...pos });
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, links.length, width, height]);

  return positions;
}

const NODE_CONFIG = {
  artist: { color: '#a855f7', r: 14 },
  fan:    { color: '#06b6d4', r: 6 },
};

export default function FrequencyGraphPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [genreFilter, setGenreFilter] = useState('all');
  const [showFans, setShowFans] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ w: width, h: Math.max(500, Math.min(700, width * 0.65)) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { data: artists = [], isLoading: artistsLoading } = useQuery({
    queryKey: ['graph-artists'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 40),
  });

  const { data: allocations = [], isLoading: allocLoading } = useQuery({
    queryKey: ['graph-allocations'],
    queryFn: () => base44.entities.SupportAllocation.filter({ is_active: true }, '-created_date', 200),
  });

  const { data: communities = [] } = useQuery({
    queryKey: ['graph-communities'],
    queryFn: () => base44.entities.FrequencyCommunity.list('-member_count', 20),
  });

  const genres = useMemo(() => {
    const set = new Set();
    artists.forEach(a => { if (a.genre) set.add(a.genre); });
    return ['all', ...Array.from(set).sort()];
  }, [artists]);

  const filteredArtists = useMemo(() => {
    if (genreFilter === 'all') return artists;
    return artists.filter(a => a.genre === genreFilter);
  }, [artists, genreFilter]);

  const artistIds = useMemo(() => new Set(filteredArtists.map(a => a.id)), [filteredArtists]);

  const relevantAllocations = useMemo(() => {
    if (!showFans) return [];
    return allocations.filter(a => artistIds.has(a.artist_profile_id));
  }, [allocations, artistIds, showFans]);

  // Build nodes and links
  const { nodes, links, fanCounts, growingLinks } = useMemo(() => {
    const nodes = [];
    const links = [];
    const fanCounts = {};
    const growingLinks = new Set();

    // Artist nodes — sized by resonance score
    filteredArtists.forEach(a => {
      const score = a.resonance_score || 0;
      nodes.push({
        id: `artist-${a.id}`,
        type: 'artist',
        label: a.artist_name,
        genre: a.genre,
        score,
        artistId: a.id,
        r: Math.max(10, Math.min(22, 10 + score / 10)),
      });
      fanCounts[a.id] = 0;
    });

    // Fan nodes + support links
    const fanNodeMap = new Map(); // dedupe fans
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    relevantAllocations.forEach(alloc => {
      const artistNodeId = `artist-${alloc.artist_profile_id}`;
      fanCounts[alloc.artist_profile_id] = (fanCounts[alloc.artist_profile_id] || 0) + 1;

      // Mark as growing if allocation was created in last 30 days
      const isGrowing = alloc.created_date && new Date(alloc.created_date) >= thirtyDaysAgo;
      if (isGrowing) growingLinks.add(`${artistNodeId}`);

      // Deduplicate fan nodes — one node per fan, links to multiple artists
      const fanNodeId = `fan-${alloc.fan_user_id}`;
      if (!fanNodeMap.has(fanNodeId)) {
        fanNodeMap.set(fanNodeId, true);
        nodes.push({
          id: fanNodeId,
          type: 'fan',
          label: 'Fan',
          tier: alloc.tier,
          r: NODE_CONFIG.fan.r,
        });
      }
      links.push({
        source: fanNodeId,
        target: artistNodeId,
        type: 'support',
        growing: isGrowing,
        amount: alloc.amount || 0,
      });
    });

    // Genre-based links between artists (same genre)
    const genreGroups = {};
    filteredArtists.forEach(a => {
      if (!a.genre) return;
      if (!genreGroups[a.genre]) genreGroups[a.genre] = [];
      genreGroups[a.genre].push(a.id);
    });
    Object.values(genreGroups).forEach(group => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (Math.random() < 0.3) {
            links.push({
              source: `artist-${group[i]}`,
              target: `artist-${group[j]}`,
              type: 'genre',
              growing: false,
            });
          }
        }
      }
    });

    return { nodes, links, fanCounts, growingLinks };
  }, [filteredArtists, relevantAllocations]);

  const positions = useForceGraph(nodes, links, dims.w, dims.h);

  const activeNodeId = selected || hovered;
  const highlightedNodeIds = useMemo(() => {
    if (!activeNodeId) return new Set();
    const set = new Set([activeNodeId]);
    links.forEach(l => {
      if (l.source === activeNodeId) set.add(l.target);
      if (l.target === activeNodeId) set.add(l.source);
    });
    return set;
  }, [activeNodeId, links]);

  const selectedNode = selected ? nodes.find(n => n.id === selected) : null;
  const selectedLinks = selected ? links.filter(l => l.source === selected || l.target === selected) : [];

  const stats = {
    artists: filteredArtists.length,
    fans: nodes.filter(n => n.type === 'fan').length,
    connections: links.length,
    growing: growingLinks.size,
  };

  const handleNodeClick = (node) => {
    setSelected(prev => prev === node.id ? null : node.id);
  };

  const isLoading = artistsLoading || allocLoading;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <Network className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Frequency Graph</h1>
            <p className="text-xs text-muted-foreground">
              Interactive map of artists, fans, and community connections
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Music,     label: 'Artists',     value: stats.artists,     color: 'text-neon-purple' },
            { icon: Users,     label: 'Fan Nodes',   value: stats.fans,        color: 'text-neon-cyan' },
            { icon: GitBranch, label: 'Connections', value: stats.connections, color: 'text-neon-magenta' },
            { icon: TrendingUp, label: 'Growing',    value: stats.growing,     color: 'text-neon-turquoise' },
          ].map(({ icon: Icon, label, value, color }) => (
            <GlassCard key={label} hover={false} className="p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>Genre:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {genres.map(g => (
              <button key={g}
                onClick={() => setGenreFilter(g)}
                className={`px-2.5 py-1 rounded-full text-[11px] capitalize transition-colors border
                  ${genreFilter === g
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'text-muted-foreground border-border/30 hover:border-border/60 hover:text-foreground'}`}>
                {g === 'all' ? 'All Genres' : g}
              </button>
            ))}
          </div>
          <Button
            variant={showFans ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFans(!showFans)}
            className={showFans ? 'bg-primary text-white h-7 text-xs' : 'h-7 text-xs border-border/50 text-muted-foreground'}
          >
            <Users className="w-3 h-3 mr-1" />
            {showFans ? 'Fans On' : 'Fans Off'}
          </Button>
        </div>

        {/* Graph canvas */}
        <GlassCard hover={false} className="p-0 overflow-hidden">
          <div ref={containerRef} className="w-full relative">
            {isLoading ? (
              <div className="flex items-center justify-center" style={{ height: dims.h }}>
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : nodes.length === 0 ? (
              <div className="flex items-center justify-center py-16" style={{ minHeight: 300 }}>
                <div className="text-center">
                  <Network className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No data to display</p>
                </div>
              </div>
            ) : (
              <svg width={dims.w} height={dims.h} className="w-full block" style={{ height: dims.h }}>
                <defs>
                  <radialGradient id="grad-artist" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
                  </radialGradient>
                  <radialGradient id="grad-fan" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
                  </radialGradient>
                  <filter id="graph-glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* Links */}
                {links.map((link, i) => {
                  const s = positions[link.source];
                  const t = positions[link.target];
                  if (!s || !t) return null;
                  const isActive = activeNodeId && (link.source === activeNodeId || link.target === activeNodeId);
                  const isDimmed = activeNodeId && !isActive;
                  const isGenre = link.type === 'genre';
                  const isGrowing = link.growing;

                  let stroke = isGenre ? '#d946ef' : '#06b6d4';
                  if (isGrowing) stroke = '#14b8a6';

                  return (
                    <line key={i}
                      x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                      stroke={stroke}
                      strokeWidth={isActive ? 2.5 : isGrowing ? 1.5 : isGenre ? 0.8 : 1}
                      strokeOpacity={isDimmed ? 0.05 : isActive ? 0.9 : isGenre ? 0.15 : isGrowing ? 0.5 : 0.3}
                      strokeDasharray={isGenre ? '4 6' : isGrowing ? undefined : '3 4'}
                      style={{ transition: 'stroke-opacity 0.2s, stroke-width 0.2s' }}
                    />
                  );
                })}

                {/* Nodes */}
                {nodes.map(node => {
                  const pos = positions[node.id];
                  if (!pos) return null;
                  const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.fan;
                  const isArtist = node.type === 'artist';
                  const r = isArtist ? (node.r || cfg.r) : cfg.r;
                  const isHovered = hovered === node.id;
                  const isSelected = selected === node.id;
                  const isDimmed = activeNodeId && !highlightedNodeIds.has(node.id);
                  const isGrowingArtist = isArtist && growingLinks.has(`artist-${node.artistId}`);

                  return (
                    <g key={node.id}
                      transform={`translate(${pos.x},${pos.y})`}
                      onMouseEnter={() => setHovered(node.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => handleNodeClick(node)}
                      style={{ cursor: 'pointer', opacity: isDimmed ? 0.15 : 1, transition: 'opacity 0.2s' }}
                    >
                      {isSelected && (
                        <circle r={r + 8} fill="none" stroke={cfg.color} strokeWidth={2}
                          strokeOpacity={0.9} strokeDasharray="4 2" />
                      )}
                      {(isHovered || (isGrowingArtist && !activeNodeId)) && (
                        <circle r={r + 6} fill="none" stroke={isGrowingArtist ? '#14b8a6' : cfg.color}
                          strokeWidth={1.5} strokeOpacity={0.5}
                          style={isGrowingArtist ? { animation: 'pulse 2s ease-in-out infinite' } : undefined} />
                      )}
                      <circle
                        r={isHovered || isSelected ? r + 2 : r}
                        fill={`url(#grad-${node.type})`}
                        stroke={cfg.color}
                        strokeWidth={isArtist ? 1.5 : 1}
                        filter={isHovered || isSelected ? 'url(#graph-glow)' : undefined}
                        style={{ transition: 'r 0.15s' }}
                      />
                      {isArtist && (
                        <text textAnchor="middle" dominantBaseline="central"
                          fontSize={8} fill="white" style={{ pointerEvents: 'none' }}>
                          ♪
                        </text>
                      )}
                      {(isArtist || isHovered) && (
                        <text y={r + 11} textAnchor="middle"
                          fontSize={isArtist ? 8 : 7}
                          fontWeight={isSelected ? 700 : 400}
                          fill={isSelected ? '#e2e8f0' : '#94a3b8'}
                          style={{ pointerEvents: 'none', fontFamily: 'var(--font-body)' }}>
                          {node.label?.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Node detail panel */}
            {selectedNode && (
              <div className="absolute bottom-3 left-3 right-3 z-10 rounded-xl border bg-card/95 backdrop-blur-md p-4 shadow-2xl"
                style={{ borderColor: (NODE_CONFIG[selectedNode.type] || NODE_CONFIG.fan).color + '55' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: (NODE_CONFIG[selectedNode.type] || NODE_CONFIG.fan).color + '22',
                        border: `1.5px solid ${(NODE_CONFIG[selectedNode.type] || NODE_CONFIG.fan).color}55` }}>
                      {selectedNode.type === 'artist'
                        ? <Music className="w-4 h-4" style={{ color: NODE_CONFIG.artist.color }} />
                        : <Users className="w-4 h-4" style={{ color: NODE_CONFIG.fan.color }} />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{selectedNode.label}</p>
                      {selectedNode.genre && <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{selectedNode.genre}</p>}
                      {selectedNode.score != null && <p className="text-[11px] text-neon-purple mt-0.5">Resonance: {selectedNode.score}</p>}
                      {selectedNode.tier && <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{selectedNode.tier} tier</p>}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground mt-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedNode.type === 'artist' && (
                  <div className="flex items-center gap-2 mt-3">
                    <NeonBadge color="cyan">
                      <Users className="w-3 h-3 mr-0.5 inline" />
                      {fanCounts[selectedNode.artistId] || 0} supporters
                    </NeonBadge>
                    {growingLinks.has(`artist-${selectedNode.artistId}`) && (
                      <NeonBadge color="turquoise">
                        <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                        Growing
                      </NeonBadge>
                    )}
                    <Button size="sm"
                      className="ml-auto h-8 text-xs bg-gradient-neon hover:opacity-90 text-white"
                      onClick={() => navigate(`/artist/${selectedNode.artistId}`)}>
                      <ExternalLink className="w-3 h-3 mr-1.5" />
                      View Profile
                    </Button>
                  </div>
                )}
              </div>
            )}

            <style>{`
              @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.15)} }
            `}</style>
          </div>
        </GlassCard>

        {/* Legend */}
        <GlassCard hover={false} className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: '#a855f7' }} />
              <span>Artist (size = Resonance Score)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#06b6d4' }} />
              <span>Fan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5" style={{ background: '#06b6d4' }} />
              <span>Support link</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5" style={{ background: '#14b8a6' }} />
              <span>Growing (new, 30 days)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#d946ef' }} />
              <span>Genre connection</span>
            </div>
          </div>
        </GlassCard>

        {/* Growing communities insight */}
        {communities.length > 0 && (
          <GlassCard hover={false} className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-neon-turquoise" />
              <h2 className="font-display font-semibold text-sm">Growing Communities</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {communities
                .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
                .slice(0, 6)
                .map(c => (
                  <button key={c.id}
                    onClick={() => navigate(`/frequency/${c.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/30 hover:border-neon-turquoise/30 hover:bg-secondary/40 transition-all text-left">
                    <div className="w-9 h-9 rounded-lg bg-neon-turquoise/10 border border-neon-turquoise/20 flex items-center justify-center flex-shrink-0">
                      <Radio className="w-4 h-4 text-neon-turquoise" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.member_count || 0} members · {c.artist_count || 0} artists
                      </p>
                    </div>
                    <Zap className="w-3.5 h-3.5 text-neon-turquoise flex-shrink-0" />
                  </button>
                ))}
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}