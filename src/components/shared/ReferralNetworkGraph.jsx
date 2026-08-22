import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Share2, Users, Music, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { motion } from 'framer-motion';

// Simple force-directed graph using SVG
function ForceDirectedNetwork({ nodes, links, width = 800, height = 500 }) {
  const [positions, setPositions] = useState({});
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [dragging, setDragging] = useState(null);
  const svgRef = useRef(null);

  // Initialize positions with force-directed layout
  useEffect(() => {
    if (nodes.length === 0) return;

    const initialPositions = {};
    const centerX = width / 2;
    const centerY = height / 2;

    // Place fan at center
    const fanNode = nodes.find(n => n.type === 'fan');
    if (fanNode) {
      initialPositions[fanNode.id] = { x: centerX, y: centerY };
    }

    // Place artists in a circle around fan
    const artistNodes = nodes.filter(n => n.type === 'artist');
    const radius = Math.min(width, height) * 0.3;
    artistNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / artistNodes.length - Math.PI / 2;
      initialPositions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    // Place referred fans near their artists
    const referredNodes = nodes.filter(n => n.type === 'referred_fan');
    referredNodes.forEach((node) => {
      const artistNode = links.find(l => l.source === node.id || l.target === node.id);
      if (artistNode) {
        const artistPos = initialPositions[artistNode.source === node.id ? artistNode.target : artistNode.source];
        if (artistPos) {
          const offsetAngle = Math.random() * 2 * Math.PI;
          const offsetRadius = 60 + Math.random() * 40;
          initialPositions[node.id] = {
            x: artistPos.x + offsetRadius * Math.cos(offsetAngle),
            y: artistPos.y + offsetRadius * Math.sin(offsetAngle),
          };
        }
      }
    });

    // Simple force-directed simulation
    let positions = { ...initialPositions };
    const velocities = {};
    Object.keys(positions).forEach(id => {
      velocities[id] = { x: 0, y: 0 };
    });

    for (let iter = 0; iter < 100; iter++) {
      const forces = {};
      Object.keys(positions).forEach(id => {
        forces[id] = { x: 0, y: 0 };
      });

      // Repulsion between all nodes
      Object.keys(positions).forEach(id1 => {
        Object.keys(positions).forEach(id2 => {
          if (id1 >= id2) return;
          const p1 = positions[id1];
          const p2 = positions[id2];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 5000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          forces[id1].x -= fx;
          forces[id1].y -= fy;
          forces[id2].x += fx;
          forces[id2].y += fy;
        });
      });

      // Attraction along links
      links.forEach(link => {
        const p1 = positions[link.source];
        const p2 = positions[link.target];
        if (!p1 || !p2) return;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces[link.source].x += fx;
        forces[link.source].y += fy;
        forces[link.target].x -= fx;
        forces[link.target].y -= fy;
      });

      // Center gravity
      Object.keys(positions).forEach(id => {
        const p = positions[id];
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        forces[id].x += dx * 0.005;
        forces[id].y += dy * 0.005;
      });

      // Update positions
      Object.keys(positions).forEach(id => {
        velocities[id].x = (velocities[id].x + forces[id].x) * 0.9;
        velocities[id].y = (velocities[id].y + forces[id].y) * 0.9;
        positions[id].x += velocities[id].x;
        positions[id].y += velocities[id].y;
      });
    }

    setPositions(positions);
  }, [nodes, links, width, height]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newK = Math.min(Math.max(transform.k + delta, 0.5), 3);
    setTransform(t => ({ ...t, k: newK }));
  };

  const handleMouseDown = (nodeId, e) => {
    e.preventDefault();
    setDragging(nodeId);
  };

  const handleMouseMove = (e) => {
    if (!dragging || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.k;
    const y = (e.clientY - rect.top - transform.y) / transform.k;
    setPositions(p => ({
      ...p,
      [dragging]: { x, y },
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleZoom = (direction) => {
    setTransform(t => ({
      ...t,
      k: direction === 'in' ? Math.min(t.k * 1.2, 3) : Math.max(t.k / 1.2, 0.5),
    }));
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="border border-border/30 rounded-xl bg-secondary/10"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Links */}
          {links.map((link, i) => {
            const source = positions[link.source];
            const target = positions[link.target];
            if (!source || !target) return null;
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={link.type === 'referred' ? '#06b6d4' : '#a855f7'}
                strokeWidth={link.type === 'referred' ? 1.5 : 2}
                opacity={0.4}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const isDragging = dragging === node.id;
            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                className="cursor-pointer"
              >
                {node.type === 'fan' && (
                  <>
                    <circle r={24} fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth={2} />
                    <circle r={16} fill="#06b6d4" />
                    <text textAnchor="middle" dy={5} fill="white" fontSize={20} fontWeight="bold">🎯</text>
                  </>
                )}
                {node.type === 'artist' && (
                  <>
                    <circle r={20} fill="rgba(168, 85, 247, 0.15)" stroke="#a855f7" strokeWidth={2} />
                    <circle r={14} fill="#a855f7" />
                    <text textAnchor="middle" dy={5} fill="white" fontSize={16} fontWeight="bold">🎵</text>
                  </>
                )}
                {node.type === 'referred_fan' && (
                  <>
                    <circle r={14} fill="rgba(217, 70, 239, 0.15)" stroke="#d946ef" strokeWidth={1.5} />
                    <circle r={10} fill="#d946ef" />
                    <text textAnchor="middle" dy={4} fill="white" fontSize={12} fontWeight="bold">👤</text>
                  </>
                )}
                {isDragging && (
                  <circle r={node.type === 'fan' ? 28 : node.type === 'artist' ? 24 : 18} fill="none" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" className="animate-spin" />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => handleZoom('in')}
          className="p-2 rounded-lg bg-card/80 backdrop-blur border border-border/50 hover:border-neon-cyan/50 transition-colors"
        >
          <ZoomIn className="w-4 h-4 text-neon-cyan" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="p-2 rounded-lg bg-card/80 backdrop-blur border border-border/50 hover:border-neon-cyan/50 transition-colors"
        >
          <ZoomOut className="w-4 h-4 text-neon-cyan" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-card/80 backdrop-blur border border-border/50 rounded-lg p-3 text-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-neon-cyan" />
          <span className="text-muted-foreground">You</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-neon-purple" />
          <span className="text-muted-foreground">Artist</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neon-magenta" />
          <span className="text-muted-foreground">Referred Fan</span>
        </div>
      </div>
    </div>
  );
}

export default function ReferralNetworkGraph({ userId }) {
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['fan-referrals-network', userId],
    queryFn: () => base44.entities.SupportAllocation.filter({ referred_by_fan_id: userId, is_active: true }),
    enabled: !!userId,
  });

  const { data: allArtists } = useQuery({
    queryKey: ['all-artists-for-network'],
    queryFn: () => base44.entities.ArtistProfile.filter({}),
  });

  const networkData = useMemo(() => {
    if (!referrals.length) return { nodes: [], links: [] };

    const nodes = [];
    const links = [];
    const nodeSet = new Set();

    // Add current fan (center)
    nodes.push({
      id: `fan_${userId}`,
      type: 'fan',
      name: 'You',
    });
    nodeSet.add(`fan_${userId}`);

    // Group referrals by artist
    const byArtist = {};
    referrals.forEach(r => {
      const key = r.artist_profile_id;
      if (!byArtist[key]) {
        byArtist[key] = { artist: r, count: 0, total: 0 };
      }
      byArtist[key].count++;
      byArtist[key].total += r.amount || 0;
    });

    // Add artists and referred fans
    Object.values(byArtist).forEach(({ artist, count, total }) => {
      const artistId = `artist_${artist.artist_profile_id}`;
      
      // Add artist node
      if (!nodeSet.has(artistId)) {
        nodes.push({
          id: artistId,
          type: 'artist',
          name: artist.artist_name,
          fanCount: count,
          totalSupport: total,
        });
        nodeSet.add(artistId);
      }

      // Link fan to artist
      links.push({
        source: `fan_${userId}`,
        target: artistId,
        type: 'supports',
        value: total,
      });

      // Add referred fans (up to 5 per artist for clarity)
      const referredFanCount = Math.min(count - 1, 5);
      for (let i = 0; i < referredFanCount; i++) {
        const referredFanId = `referred_${artist.artist_profile_id}_${i}`;
        if (!nodeSet.has(referredFanId)) {
          nodes.push({
            id: referredFanId,
            type: 'referred_fan',
            name: `Fan ${i + 1}`,
          });
          nodeSet.add(referredFanId);
        }

        links.push({
          source: referredFanId,
          target: artistId,
          type: 'referred',
          value: 1,
        });
      }
    });

    return { nodes, links };
  }, [referrals, userId]);

  const totalNodes = networkData.nodes.length;
  const totalLinks = networkData.links.length;
  const artistsCount = networkData.nodes.filter(n => n.type === 'artist').length;
  const referredFansCount = networkData.nodes.filter(n => n.type === 'referred_fan').length;

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <Share2 className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Your Referral Network</h2>
            <p className="text-xs text-muted-foreground">Visual map of your influence</p>
          </div>
        </div>
        <NeonBadge color="cyan">
          <Users className="w-3 h-3 mr-1" />
          {totalNodes - 1} nodes
        </NeonBadge>
      </div>

      {isLoading ? (
        <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
          Loading network...
        </div>
      ) : referrals.length === 0 ? (
        <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-center">
          <Share2 className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No referral network yet.</p>
          <p className="text-xs text-muted-foreground/60">Refer fans to artists to build your network.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
              <Music className="w-4 h-4 text-neon-purple mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-purple">{artistsCount}</p>
              <p className="text-[10px] text-muted-foreground">Artists</p>
            </div>
            <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
              <Users className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-cyan">{referrals.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Referrals</p>
            </div>
            <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
              <Share2 className="w-4 h-4 text-neon-magenta mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-magenta">{referredFansCount}</p>
              <p className="text-[10px] text-muted-foreground">Connected Fans</p>
            </div>
          </div>

          {/* Network Graph */}
          <ForceDirectedNetwork
            nodes={networkData.nodes}
            links={networkData.links}
            width={800}
            height={450}
          />

          <div className="mt-4 text-center text-xs text-muted-foreground/60">
            <p>Drag nodes to rearrange • Scroll to zoom</p>
          </div>
        </>
      )}
    </GlassCard>
  );
}