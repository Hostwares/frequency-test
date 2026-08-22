import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Star, Users, ShieldCheck, Search, Globe } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Input } from '@/components/ui/input';

const PARTNER_TYPE_LABELS = {
  music_blog: 'Music Blog', independent_curator: 'Curator',
  influencer: 'Influencer', radio_host: 'Radio Host', podcast_host: 'Podcast',
  music_reviewer: 'Reviewer', veteran_organization: 'Veteran Org',
  festival_organizer: 'Festival', college_music_program: 'College',
  local_music_organization: 'Local Org', music_journalist: 'Journalist',
  community_music_leader: 'Community Leader', other: 'Other',
};

const TYPE_COLORS = {
  music_blog: 'purple', independent_curator: 'cyan', influencer: 'magenta',
  radio_host: 'blue', podcast_host: 'turquoise', music_reviewer: 'purple',
  veteran_organization: 'cyan', festival_organizer: 'magenta',
  college_music_program: 'blue', local_music_organization: 'turquoise',
  music_journalist: 'purple', community_music_leader: 'cyan', other: 'blue',
};

function PartnerCard({ partner }) {
  const navigate = useNavigate();
  return (
    <GlassCard glow="cyan" className="p-5" onClick={() => navigate(`/discovery-partner/${partner.id}`)}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
          {partner.profile_image
            ? <img src={partner.profile_image} alt={partner.name} className="w-full h-full object-cover" />
            : <Compass className="w-6 h-6 text-neon-cyan m-3" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-display font-bold truncate">{partner.name}</p>
            {partner.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan flex-shrink-0" />}
          </div>
          <NeonBadge color={TYPE_COLORS[partner.partner_type] || 'blue'}>
            {PARTNER_TYPE_LABELS[partner.partner_type] || 'Discovery Partner'}
          </NeonBadge>
        </div>
      </div>

      {partner.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{partner.description}</p>
      )}

      {partner.genres_covered?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {partner.genres_covered.slice(0, 3).map(g => (
            <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">{g}</span>
          ))}
          {partner.genres_covered.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{partner.genres_covered.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/30 pt-3 mt-1">
        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-neon-magenta" />{partner.reputation_score || 0} rep</span>
        <span className="flex items-center gap-1"><Compass className="w-3 h-3 text-neon-cyan" />{partner.artists_discovered || 0} discovered</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3 text-neon-purple" />{partner.follower_count || 0}</span>
      </div>
    </GlassCard>
  );
}

export default function DiscoveryPartners() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['discovery-partners'],
    queryFn: () => base44.entities.DiscoveryPartner.filter({ is_active: true }, '-reputation_score', 50),
  });

  const filtered = partners.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.partner_type === typeFilter;
    return matchSearch && matchType;
  });

  const typeOptions = ['all', ...Object.keys(PARTNER_TYPE_LABELS)];

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-neon-cyan/10">
              <Compass className="w-5 h-5 text-neon-cyan" />
            </div>
            <h1 className="text-2xl font-display font-bold">Discovery Partners</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Trusted curators, music blogs, and community leaders who earn exposure through quality recommendations — not money.
          </p>
        </div>

        {/* Philosophy banner */}
        <div className="bg-gradient-to-r from-neon-cyan/8 via-neon-purple/5 to-transparent border border-neon-cyan/15 rounded-xl p-4 mb-8 flex items-center gap-4">
          <Globe className="w-6 h-6 text-neon-cyan flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-neon-cyan">Trust → Exposure</p>
            <p className="text-xs text-muted-foreground">Discovery on Frequency is earned through community trust and successful recommendations. It can never be purchased.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search discovery partners..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary/20" />
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {typeOptions.map(t => (
            <button key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-colors border
                ${typeFilter === t
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'text-muted-foreground border-border/30 hover:border-border/60 hover:text-foreground'}`}>
              {t === 'all' ? 'All Types' : PARTNER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-secondary/20 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <GlassCard hover={false} className="p-12 text-center">
            <Compass className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No discovery partners found.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <PartnerCard partner={p} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}