import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Network, Zap, Users, Radio, ExternalLink, X, Music, GitBranch } from 'lucide-react';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';

// ─── Force simulation ─────────────────────────────────────────────────────────
function useForceGraph(nodes, links, width, height) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    if (!nodes.length) return;

    const pos = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const r = Math.min(width, height) * 0.3;
      pos[n.id] = {
        x: width / 2 + (n.id === 'center' ? 0 : r * Math.cos(angle)),
        y: height / 2 + (n.id === 'center' ? 0 : r * Math.sin(angle)),
        vx: 0, vy: 0,
      };
    });

    const REPULSION = 2500, SPRING_LEN = 120, SPRING_K = 0.04, DAMPING = 0.85, CENTER_K = 0.008;
    let frame, iter = 0;

    const tick = () => {
      iter++;
      if (iter > 300) return;
      const p = { ...pos };
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
        p[n.id].x = Math.max(30, Math.min(width - 30, p[n.id].x + p[n.id].vx));
        p[n.id].y = Math.max(30, Math.min(height - 30, p[n.id].y + p[n.id].vy));
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

// ─── Config ───────────────────────────────────────────────────────────────────
const NODE_CONFIG = {
  center:    { color: '#a855f7', r: 18 },
  connected: { color: '#06b6d4', r: 13 },
  network:   { color: '#d946ef', r: 10 },
  supporter: { color: '#3b82f6', r:  8 },
};
const LINK_COLOR = { recommended: '#a855f7', network: '#d946ef', supporter: '#3b82f6' };

const CONNECTION_LABELS = {
  recommended: 'Direct recommendation',
  network:     'Same genre / network',
  supporter:   'Shared fan base',
};

// ─── Node detail panel ────────────────────────────────────────────────────────
function NodeDetailPanel({ node, connectedLinks, onClose, onNavigate }) {
  if (!node) return null;
  const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.network;
  const isArtist = node.type === 'connected' || node.type === 'network';
  const connectionType = connectedLinks[0]?.type;

  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md p-4 shadow-2xl"
      style={{ borderColor: cfg.color + '55' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: cfg.color + '22', border: `1.5px solid ${cfg.color}55` }}>
            {node.type === 'supporter'
              ? <Users className="w-4 h-4" style={{ color: cfg.color }} />
              : <Music className="w-4 h-4" style={{ color: cfg.color }} />}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{node.label}</p>
            {node.genre && <p className="text-[11px] text-muted-foreground mt-0.5">{node.genre}</p>}
            {node.tier  && <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{node.tier} tier supporter</p>}
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      {connectionType && (
        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
          <GitBranch className="w-3 h-3" />
          <span>{CONNECTION_LABELS[connectionType] || connectionType}</span>
        </div>
      )}

      {isArtist && node.artistId && (
        <Button size="sm"
          className="mt-3 w-full h-8 text-xs bg-gradient-neon hover:opacity-90 text-white"
          onClick={() => onNavigate(node.artistId)}>
          <ExternalLink className="w-3 h-3 mr-1.5" />
          View Artist Profile
        </Button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ArtistNetworkGraph({ artistProfile }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 600, h: 420 });
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ w: width, h: Math.max(320, Math.min(440, width * 0.62)) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { data: allArtists = [] } = useQuery({
    queryKey: ['all-artists-network'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 60),
  });

  const { data: supporters = [] } = useQuery({
    queryKey: ['network-supporters', artistProfile?.id],
    queryFn: () => base44.entities.SupportAllocation.filter({ artist_profile_id: artistProfile.id, is_active: true }),
    enabled: !!artistProfile?.id,
  });

  const { nodes, links } = useMemo(() => {
    if (!artistProfile) return { nodes: [], links: [] };

    const nodes = [{ id: 'center', type: 'center', label: artistProfile.artist_name, genre: artistProfile.genre }];
    const links = [];
    const addedIds = new Set(['center']);

    (artistProfile.recommended_artists || []).slice(0, 6).forEach((recId, i) => {
      const artist = allArtists.find(a => a.id === recId);
      const nodeId = `rec-${i}`;
      nodes.push({ id: nodeId, type: 'connected', label: artist?.artist_name || `Artist ${i + 1}`, genre: artist?.genre, score: artist?.resonance_score, artistId: artist?.id });
      links.push({ source: 'center', target: nodeId, type: 'recommended' });
      addedIds.add(nodeId);
    });

    if (artistProfile.network_name) {
      allArtists
        .filter(a => a.id !== artistProfile.id && a.network_name === artistProfile.network_name)
        .slice(0, 4)
        .forEach((a, i) => {
          const nodeId = `net-${i}`;
          nodes.push({ id: nodeId, type: 'network', label: a.artist_name, genre: a.genre, artistId: a.id });
          links.push({ source: 'center', target: nodeId, type: 'network' });
          addedIds.add(nodeId);
        });
    }

    allArtists
      .filter(a => a.id !== artistProfile.id && a.genre === artistProfile.genre && !addedIds.has(a.id))
      .slice(0, 5)
      .forEach((a, i) => {
        const nodeId = `genre-${i}`;
        nodes.push({ id: nodeId, type: 'network', label: a.artist_name, genre: a.genre, artistId: a.id });
        links.push({ source: 'center', target: nodeId, type: 'network' });
      });

    supporters.slice(0, 4).forEach((s, i) => {
      const nodeId = `fan-${i}`;
      nodes.push({ id: nodeId, type: 'supporter', label: `Fan ${i + 1}`, tier: s.tier });
      links.push({ source: 'center', target: nodeId, type: 'supporter' });
    });

    if (nodes.length === 1) {
      ['Indie Rock', 'Alt Folk', 'Dream Pop', 'Lo-fi'].forEach((genre, i) => {
        const nodeId = `placeholder-${i}`;
        nodes.push({ id: nodeId, type: 'network', label: genre, genre });
        links.push({ source: 'center', target: nodeId, type: 'network' });
      });
    }

    return { nodes, links };
  }, [artistProfile, allArtists, supporters]);

  const positions = useForceGraph(nodes, links, dims.w, dims.h);

  // Links connected to the selected/hovered node
  const activeNodeId = selected || hovered;
  const highlightedLinks = useMemo(() => {
    if (!activeNodeId) return new Set();
    return new Set(
      links.filter(l => l.source === activeNodeId || l.target === activeNodeId)
           .flatMap(l => [l.source, l.target])
    );
  }, [activeNodeId, links]);

  const selectedNode = selected ? nodes.find(n => n.id === selected) : null;
  const selectedLinks = selected ? links.filter(l => l.source === selected || l.target === selected) : [];

  const stats = {
    connections: nodes.filter(n => n.type === 'connected').length,
    network: nodes.filter(n => n.type === 'network').length,
    fans: nodes.filter(n => n.type === 'supporter').length,
  };

  const handleNodeClick = (node) => {
    if (node.type === 'center') return;
    setSelected(prev => prev === node.id ? null : node.id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-neon-purple" />
          <h2 className="font-display font-semibold text-sm">Artist Network Graph</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <NeonBadge color="cyan">{stats.connections} direct</NeonBadge>
          <NeonBadge color="magenta">{stats.network} network</NeonBadge>
          <NeonBadge color="blue">{stats.fans} fans</NeonBadge>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        {[
          { color: '#a855f7', label: 'You' },
          { color: '#06b6d4', label: 'Direct connections' },
          { color: '#d946ef', label: 'Same network / genre' },
          { color: '#3b82f6', label: 'Fan hubs' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="text-[10px] text-muted-foreground/60 ml-auto italic">Click a node to explore</span>
      </div>

      {/* SVG Canvas */}
      <div ref={containerRef} className="w-full relative rounded-xl overflow-hidden bg-background/40 border border-border/30">
        <svg width={dims.w} height={dims.h} className="w-full" style={{ height: dims.h }}>
          <defs>
            {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
              <radialGradient key={type} id={`grad-${type}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={cfg.color} stopOpacity="0.3" />
              </radialGradient>
            ))}
            <filter id="glow-filter">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Links */}
          {links.map((link, i) => {
            const s = positions[link.source];
            const t = positions[link.target];
            if (!s || !t) return null;
            const isHighlighted = activeNodeId && (link.source === activeNodeId || link.target === activeNodeId);
            const isDimmed = activeNodeId && !isHighlighted;
            return (
              <line key={i}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={isHighlighted ? LINK_COLOR[link.type] : (LINK_COLOR[link.type] || '#555')}
                strokeWidth={isHighlighted ? 2.5 : (link.type === 'recommended' ? 1.5 : 1)}
                strokeOpacity={isDimmed ? 0.1 : isHighlighted ? 0.85 : 0.35}
                strokeDasharray={link.type === 'supporter' ? '3 4' : undefined}
                style={{ transition: 'stroke-opacity 0.2s, stroke-width 0.2s' }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const pos = positions[node.id];
            if (!pos) return null;
            const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.network;
            const isCenter = node.type === 'center';
            const isHovered = hovered === node.id;
            const isSelected = selected === node.id;
            const isDimmed = activeNodeId && !isCenter && !highlightedLinks.has(node.id) && node.id !== activeNodeId;
            const isClickable = !isCenter;

            return (
              <g key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: isClickable ? 'pointer' : 'default', opacity: isDimmed ? 0.2 : 1, transition: 'opacity 0.2s' }}
              >
                {/* Selected ring */}
                {isSelected && (
                  <circle r={cfg.r + 10} fill="none" stroke={cfg.color} strokeWidth={2} strokeOpacity={0.9}
                    strokeDasharray="4 2" />
                )}
                {/* Glow ring */}
                {(isCenter || isHovered) && (
                  <circle r={cfg.r + 8} fill="none" stroke={cfg.color} strokeWidth={1.5}
                    strokeOpacity={isHovered ? 0.7 : 0.4}
                    style={{ animation: isCenter ? 'pulse 2s ease-in-out infinite' : undefined }} />
                )}
                {/* Main circle */}
                <circle
                  r={isSelected || isHovered ? cfg.r + 3 : cfg.r}
                  fill={`url(#grad-${node.type})`}
                  stroke={cfg.color}
                  strokeWidth={isCenter || isSelected ? 2 : 1}
                  filter={isCenter || isHovered || isSelected ? 'url(#glow-filter)' : undefined}
                  style={{ transition: 'r 0.15s' }}
                />
                {isCenter && (
                  <text textAnchor="middle" dominantBaseline="central" fontSize={10} fill="white" style={{ pointerEvents: 'none' }}>
                    ♪
                  </text>
                )}
                {/* Label */}
                <text y={cfg.r + 12} textAnchor="middle"
                  fontSize={isCenter ? 10 : 8} fontWeight={isCenter || isSelected ? 700 : 400}
                  fill={isSelected ? '#e2e8f0' : isCenter ? '#e2e8f0' : '#94a3b8'}
                  style={{ pointerEvents: 'none', fontFamily: 'var(--font-body)' }}>
                  {node.label?.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
                </text>
                {/* Click-to-navigate hint on hover (artist nodes only) */}
                {isHovered && !isCenter && node.artistId && (
                  <g>
                    <rect x={-44} y={-cfg.r - 30} width={88} height={20} rx={4}
                      fill="rgba(15,10,30,0.92)" stroke={cfg.color} strokeWidth={0.5} strokeOpacity={0.7} />
                    <text y={-cfg.r - 17} textAnchor="middle" fontSize={7.5} fill="#e2e8f0"
                      style={{ pointerEvents: 'none', fontFamily: 'var(--font-body)' }}>
                      {node.genre} · tap to view
                    </text>
                  </g>
                )}
                {isHovered && !isCenter && !node.artistId && node.genre && (
                  <g>
                    <rect x={-44} y={-cfg.r - 28} width={88} height={18} rx={4}
                      fill="rgba(15,10,30,0.92)" stroke={cfg.color} strokeWidth={0.5} strokeOpacity={0.6} />
                    <text y={-cfg.r - 16} textAnchor="middle" fontSize={7.5} fill="#94a3b8"
                      style={{ pointerEvents: 'none', fontFamily: 'var(--font-body)' }}>
                      {node.genre}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Node detail panel */}
        <NodeDetailPanel
          node={selectedNode}
          connectedLinks={selectedLinks}
          onClose={() => setSelected(null)}
          onNavigate={(id) => navigate(`/artist/${id}`)}
        />

        <style>{`
          @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.15)} }
        `}</style>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
          <Zap className="w-3.5 h-3.5 text-neon-purple mx-auto mb-1" />
          <p className="text-base font-bold text-neon-purple">{nodes.length - 1}</p>
          <p className="text-[10px] text-muted-foreground">Nodes in network</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
          <Radio className="w-3.5 h-3.5 text-neon-cyan mx-auto mb-1" />
          <p className="text-base font-bold text-neon-cyan">{links.length}</p>
          <p className="text-[10px] text-muted-foreground">Connections</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
          <Users className="w-3.5 h-3.5 text-neon-magenta mx-auto mb-1" />
          <p className="text-base font-bold text-neon-magenta">{stats.fans}</p>
          <p className="text-[10px] text-muted-foreground">Fan bridges</p>
        </div>
      </div>
    </div>
  );
}