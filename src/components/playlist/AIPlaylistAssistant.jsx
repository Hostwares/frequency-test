import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Lock, Loader2, Wand2, MessageSquare, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  getAllocationTierForPlan,
  getAIAssistanceFeatures,
  canAccessAIFeature,
  AI_ASSISTANCE_LABELS,
} from '@/lib/fundedNetworkLimits';
import { toast } from 'sonner';

const TIER_LABELS = {
  standard: 'Basic',
  advanced: 'Advanced',
  advanced_plus: 'Premium',
};

const TIER_COLORS = {
  standard: 'purple',
  advanced: 'cyan',
  advanced_plus: 'magenta',
};

export default function AIPlaylistAssistant({ playlist, onAddSongsToPlaylist, onApplyAllocations }) {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: subscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: async () => {
      const res = await base44.entities.UserSubscription.filter({ user_id: user?.id, status: 'active' });
      return res?.[0] || null;
    },
    enabled: !!user?.id,
  });

  const tier = getAllocationTierForPlan(subscription?.plan_code);
  const features = getAIAssistanceFeatures(tier);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [allocations, setAllocations] = useState(null);
  const [prompt, setPrompt] = useState('');

  const invokeAI = async (feature) => {
    setLoading(feature);
    setSuggestions(null);
    setAllocations(null);
    try {
      const res = await base44.functions.invoke('aiPlaylistAssist', {
        feature,
        playlist_id: playlist?.id,
        prompt: feature === 'natural_language' ? prompt : undefined,
        current_song_ids: playlist?.song_ids,
      });
      const data = res.data;
      if (data.error === 'feature_locked') {
        toast.error('AI feature locked', {
          description: data.message,
          action: { label: 'Upgrade', onClick: () => navigate('/pricing') },
          duration: 6000,
        });
        return;
      }
      if (data.error) {
        toast.error(data.error);
        return;
      }
      if (data.suggestions) setSuggestions(data.suggestions);
      if (data.allocations) setAllocations(data.allocations);
    } catch (e) {
      toast.error(e?.message || 'AI assistance failed');
    } finally {
      setLoading(null);
    }
  };

  const handleAddSuggestion = (s) => {
    if (s.song_id && onAddSongsToPlaylist) {
      onAddSongsToPlaylist([s.song_id]);
      toast.success(`Added "${s.song_title}" to playlist`);
    }
  };

  const handleApplyAllocations = () => {
    if (!allocations || !onApplyAllocations) return;
    const existing = playlist?.artist_allocations || [];
    // Match AI allocations back to artist_profile_id via song lookups
    // For now, the backend returns artist_name + percentage; we pass as-is
    onApplyAllocations(allocations);
    toast.success('AI allocation suggestions ready — review and apply in the allocation editor');
  };

  return (
    <GlassCard hover={false} className="p-5 mb-4 border-neon-purple/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-neon-purple" />
          <span className="text-sm font-semibold">AI Playlist Assistant</span>
          <NeonBadge color={TIER_COLORS[tier]}>{TIER_LABELS[tier]}</NeonBadge>
        </div>
      </div>

      {/* Basic: Auto-suggest */}
      <FeatureRow
        icon={<Wand2 className="w-4 h-4" />}
        title={AI_ASSISTANCE_LABELS.auto_suggest}
        description="AI suggests songs that complement your playlist's current content"
        locked={!canAccessAIFeature(tier, 'auto_suggest')}
        loading={loading === 'auto_suggest'}
        onAction={() => invokeAI('auto_suggest')}
        actionLabel="Suggest Songs"
        navigate={navigate}
      />

      {/* Advanced: Natural-language builder */}
      <FeatureRow
        icon={<MessageSquare className="w-4 h-4" />}
        title={AI_ASSISTANCE_LABELS.natural_language}
        description="Describe what you want and AI builds a matching playlist"
        locked={!canAccessAIFeature(tier, 'natural_language')}
        loading={loading === 'natural_language'}
        onAction={() => invokeAI('natural_language')}
        actionLabel="Build Playlist"
        navigate={navigate}
      >
        {canAccessAIFeature(tier, 'natural_language') && (
          <Textarea
            placeholder="e.g., chill indie rock songs for a rainy Sunday afternoon..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="h-16 text-xs mb-2"
          />
        )}
      </FeatureRow>

      {/* Premium: Allocation optimization */}
      <FeatureRow
        icon={<TrendingUp className="w-4 h-4" />}
        title={AI_ASSISTANCE_LABELS.allocation_optimization}
        description="AI recommends artist weight adjustments based on resonance patterns"
        locked={!canAccessAIFeature(tier, 'allocation_optimization')}
        loading={loading === 'allocation_optimization'}
        onAction={() => invokeAI('allocation_optimization')}
        actionLabel="Optimize Allocation"
        navigate={navigate}
      />

      {/* Results: Song suggestions */}
      {suggestions && (
        <div className="mt-4 rounded-lg bg-secondary/30 border border-border/50 p-3">
          <p className="text-xs font-medium mb-2">AI Suggestions</p>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{s.song_title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.artist_name}</p>
                  <p className="text-[10px] text-muted-foreground italic">{s.reason}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] flex-shrink-0"
                  onClick={() => handleAddSuggestion(s)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results: Allocation suggestions */}
      {allocations && (
        <div className="mt-4 rounded-lg bg-secondary/30 border border-border/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium">AI Allocation Recommendations</p>
            <Button size="sm" className="h-6 text-[10px]" onClick={handleApplyAllocations}>
              Apply
            </Button>
          </div>
          <div className="space-y-1.5">
            {allocations.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs flex-1 truncate">{a.artist_name}</span>
                <span className="text-xs font-medium text-neon-cyan">{a.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function FeatureRow({ icon, title, description, locked, loading, onAction, actionLabel, children, navigate }) {
  return (
    <div className={`mb-3 last:mb-0 ${locked ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">{title}</span>
            {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
          </div>
          <p className="text-[10px] text-muted-foreground">{description}</p>
          {children}
        </div>
        {!locked && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] flex-shrink-0"
            onClick={onAction}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : actionLabel}
          </Button>
        )}
      </div>
      {locked && (
        <p className="text-[10px] text-muted-foreground mt-1 ml-6 flex items-center gap-1">
          <Lock className="w-2.5 h-2.5" />
          <button className="text-primary underline" onClick={() => navigate('/pricing')}>Upgrade</button> to unlock
        </p>
      )}
    </div>
  );
}