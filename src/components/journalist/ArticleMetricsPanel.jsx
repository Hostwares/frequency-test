import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Eye, Share2, TrendingUp, Loader2, Newspaper, BarChart3,
  ArrowUpDown, Award, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const CATEGORY_LABELS = {
  artist_feature: 'Artist Feature',
  community_story: 'Community Story',
  interview: 'Interview',
  review: 'Review',
  opinion: 'Opinion',
  news: 'News',
  behind_the_scenes: 'Behind the Scenes',
  milestone_celebration: 'Milestone',
};

function MetricStat({ icon: Icon, label, value, sub, color }) {
  return (
    <GlassCard hover={false} className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-display font-bold ${color}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </GlassCard>
  );
}

export default function ArticleMetricsPanel({ scope = 'mine' }) {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState('views');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const queryKey = scope === 'mine'
    ? ['article-metrics', user?.id]
    : ['article-metrics-all'];

  const { data: articles = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.EditorialArticle.filter(
      { status: 'published' },
      '-published_date',
      200
    ),
    enabled: scope === 'all' || !!user,
  });

  const scopedArticles = useMemo(() => {
    if (scope === 'mine' && user) {
      return articles.filter(a => a.author_user_id === user.id);
    }
    return articles;
  }, [articles, user, scope]);

  const filtered = useMemo(() => {
    let list = scopedArticles;
    if (categoryFilter !== 'all') {
      list = list.filter(a => a.category === categoryFilter);
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'views') return (b.view_count || 0) - (a.view_count || 0);
      if (sortBy === 'shares') return (b.share_count || 0) - (a.share_count || 0);
      if (sortBy === 'likes') return (b.like_count || 0) - (a.like_count || 0);
      return 0;
    });
  }, [scopedArticles, sortBy, categoryFilter]);

  const totals = useMemo(() => {
    const views = scopedArticles.reduce((s, a) => s + (a.view_count || 0), 0);
    const shares = scopedArticles.reduce((s, a) => s + (a.share_count || 0), 0);
    const likes = scopedArticles.reduce((s, a) => s + (a.like_count || 0), 0);
    const avgViews = scopedArticles.length > 0 ? Math.round(views / scopedArticles.length) : 0;
    return { views, shares, likes, avgViews, count: scopedArticles.length };
  }, [scopedArticles]);

  // Top performing article
  const topArticle = useMemo(() => {
    if (filtered.length === 0) return null;
    return [...scopedArticles].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0];
  }, [scopedArticles, filtered.length]);

  const categories = useMemo(() => {
    const set = new Set(scopedArticles.map(a => a.category).filter(Boolean));
    return Array.from(set);
  }, [scopedArticles]);

  const maxViews = useMemo(() => {
    return Math.max(1, ...filtered.map(a => a.view_count || 0));
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (scopedArticles.length === 0) {
    return (
      <GlassCard hover={false} className="p-12 text-center">
        <Newspaper className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No published articles to measure yet</p>
        <p className="text-xs text-muted-foreground mt-1">Metrics appear once articles are published.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricStat icon={Eye} label="Total Views" value={totals.views}
          sub={`${totals.count} article${totals.count !== 1 ? 's' : ''}`} color="text-neon-cyan" />
        <MetricStat icon={Share2} label="Total Shares" value={totals.shares}
          sub={`${totals.shares > 0 ? (totals.shares / totals.views * 100).toFixed(1) : 0}% share rate`} color="text-neon-magenta" />
        <MetricStat icon={TrendingUp} label="Avg Views / Article" value={totals.avgViews}
          sub="engagement baseline" color="text-neon-purple" />
        <MetricStat icon={Award} label="Top Article Views" value={topArticle?.view_count || 0}
          sub={topArticle ? topArticle.title?.slice(0, 30) + (topArticle.title?.length > 30 ? '…' : '') : '—'} color="text-neon-turquoise" />
      </div>

      {/* Top Performer Highlight */}
      {topArticle && (
        <GlassCard hover={false} className="p-4 bg-gradient-card">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-neon-turquoise/15 flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 text-neon-turquoise" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Top Performing Feature</p>
              <h4 className="text-sm font-display font-semibold truncate">{topArticle.title}</h4>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-neon-cyan"><Eye className="w-3 h-3" /> {topArticle.view_count || 0}</span>
                <span className="flex items-center gap-1 text-xs text-neon-magenta"><Share2 className="w-3 h-3" /> {topArticle.share_count || 0}</span>
                <span className="flex items-center gap-1 text-xs text-neon-purple"><TrendingUp className="w-3 h-3" /> {topArticle.like_count || 0} likes</span>
                {scope === 'all' && topArticle.author_name && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" /> {topArticle.author_name}</span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Per-Article Performance</span>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="views">Sort by Views</SelectItem>
              <SelectItem value="shares">Sort by Shares</SelectItem>
              <SelectItem value="likes">Sort by Likes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Article Metrics List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">No articles match this filter.</div>
        ) : (
          filtered.map((article, idx) => {
            const views = article.view_count || 0;
            const shares = article.share_count || 0;
            const likes = article.like_count || 0;
            const barWidth = (views / maxViews) * 100;
            return (
              <GlassCard key={article.id} hover={false} className="p-3">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    idx === 0 ? 'bg-neon-turquoise/15 text-neon-turquoise' :
                    idx === 1 ? 'bg-neon-purple/15 text-neon-purple' :
                    idx === 2 ? 'bg-neon-magenta/15 text-neon-magenta' :
                    'bg-secondary/40 text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Title + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">{article.title}</h4>
                      <NeonBadge color="blue" className="text-[10px] flex-shrink-0">
                        {CATEGORY_LABELS[article.category] || article.category}
                      </NeonBadge>
                    </div>
                    {/* Views bar */}
                    <div className="w-full h-1.5 bg-secondary/40 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-neon-cyan/60 to-neon-cyan rounded-full transition-all"
                        style={{ width: `${barWidth}%` }} />
                    </div>
                    {scope === 'all' && article.author_name && (
                      <p className="text-[10px] text-muted-foreground mt-1">by {article.author_name}</p>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center min-w-[3rem]">
                      <p className="text-sm font-bold text-neon-cyan">{views.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Views</p>
                    </div>
                    <div className="text-center min-w-[3rem]">
                      <p className="text-sm font-bold text-neon-magenta">{shares.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Shares</p>
                    </div>
                    <div className="text-center min-w-[3rem] hidden sm:block">
                      <p className="text-sm font-bold text-neon-purple">{likes.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Likes</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}