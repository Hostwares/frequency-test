import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, Clock, Eye, Heart, Share2, Newspaper, User,
  ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  milestone_celebration: 'Milestone Celebration',
};

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ['editorial-article', id],
    queryFn: () => base44.entities.EditorialArticle.get(id),
    enabled: !!id,
  });

  const [hasIncrementedView, setHasIncrementedView] = useState(false);

  const incrementView = useMutation({
    mutationFn: () => base44.entities.EditorialArticle.update(id, {
      view_count: (article?.view_count || 0) + 1,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['editorial-article', id] }),
  });

  useEffect(() => {
    if (article && article.status === 'published' && !hasIncrementedView) {
      setHasIncrementedView(true);
      incrementView.mutate();
    }
  }, [article, hasIncrementedView, incrementView]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Article not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>
    );
  }

  if (article.status !== 'published') {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          This article is not yet published.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>
    );
  }

  const publishedDate = article.published_date
    ? new Date(article.published_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  return (
    <div className="pb-24">
      {/* Hero / Cover */}
      {article.cover_image && (
        <div className="relative h-64 md:h-96 w-full overflow-hidden">
          <img
            src={article.cover_image}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 md:px-8 -mt-16 relative z-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{CATEGORY_LABELS[article.category] || 'Article'}</span>
        </div>

        {/* Category badge */}
        <NeonBadge color="purple" className="mb-3">
          {CATEGORY_LABELS[article.category] || article.category}
        </NeonBadge>

        {/* Title */}
        <h1 className="text-2xl md:text-4xl font-display font-bold text-foreground leading-tight mb-3">
          {article.title}
        </h1>

        {/* Subtitle */}
        {article.subtitle && (
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">
            {article.subtitle}
          </p>
        )}

        {/* Author + meta */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/30">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            {article.author_avatar ? (
              <img src={article.author_avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{article.author_name || 'Staff Writer'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {publishedDate}
              {article.reading_time_minutes > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {article.reading_time_minutes} min read
                  </span>
                </>
              )}
            </p>
          </div>
          {article.is_featured && (
            <NeonBadge color="magenta">Editor's Pick</NeonBadge>
          )}
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {article.tags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-secondary/40 rounded text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Body — rendered from HTML */}
        <article
          className="prose prose-invert prose-sm md:prose-base max-w-none
            [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground
            [&_p]:text-foreground/80 [&_a]:text-neon-cyan
            [&_blockquote]:border-l-primary [&_blockquote]:text-muted-foreground
            [&_strong]:text-foreground
            [&_ul]:text-foreground/80 [&_ol]:text-foreground/80"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />

        {/* Featured artist link */}
        {article.featured_artist_id && article.featured_artist_name && (
          <div className="mt-8 pt-6 border-t border-border/30">
            <GlassCard className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Featured in this story</p>
                <p className="font-display font-semibold">{article.featured_artist_name}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/artist/${article.featured_artist_id}`)}>
                View Profile
              </Button>
            </GlassCard>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-border/30 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {article.view_count || 0} views
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" /> {article.like_count || 0} likes
          </span>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>
      </div>
    </div>
  );
}