import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  PenLine, FileText, Send, Clock, CheckCircle2, Plus, Newspaper,
  TrendingUp, Loader2, FileEdit, BarChart3, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import ArticleEditor from '@/components/journalist/ArticleEditor';
import DashboardArticleCard from '@/components/journalist/DashboardArticleCard';
import ArticleMetricsPanel from '@/components/journalist/ArticleMetricsPanel';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <GlassCard hover={false} className="p-3 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
      <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </GlassCard>
  );
}

function ColumnHeader({ icon: Icon, title, count, accent }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-4 h-4 ${accent}`} />
      <h3 className="text-sm font-display font-semibold">{title}</h3>
      <NeonBadge color="blue" className="ml-auto">{count}</NeonBadge>
    </div>
  );
}

export default function JournalistPortal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [view, setView] = useState('dashboard');

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['journalist-articles', user?.id],
    queryFn: () => base44.entities.EditorialArticle.filter(
      { author_user_id: user.id }, '-updated_date', 100
    ),
    enabled: !!user,
  });

  const { drafts, inReview, published } = useMemo(() => ({
    drafts: articles.filter(a => ['draft', 'rejected'].includes(a.status)),
    inReview: articles.filter(a => ['submitted', 'under_review', 'approved'].includes(a.status)),
    published: articles.filter(a => a.status === 'published'),
  }), [articles]);

  const stats = useMemo(() => ({
    total: articles.length,
    drafts: drafts.length,
    inReview: inReview.length,
    published: published.length,
    totalViews: published.reduce((sum, a) => sum + (a.view_count || 0), 0),
  }), [articles, drafts, inReview, published]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EditorialArticle.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalist-articles'] }),
  });

  const submitMutation = useMutation({
    mutationFn: (article) => base44.entities.EditorialArticle.update(article.id, {
      status: 'submitted', submitted_date: new Date().toISOString(),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalist-articles'] }),
  });

  const handleNewArticle = () => { setEditingArticle(null); setShowEditor(true); };
  const handleEdit = (article) => { setEditingArticle(article); setShowEditor(true); };
  const handleSubmit = (article) => submitMutation.mutate(article);
  const handleDelete = (article) => {
    if (confirm(`Delete "${article.title}"? This cannot be undone.`)) {
      deleteMutation.mutate(article.id);
    }
  };
  const handleEditorClose = () => { setShowEditor(false); setEditingArticle(null); };

  if (showEditor) {
    return <ArticleEditor article={editingArticle} onClose={handleEditorClose} />;
  }

  if (view === 'metrics') {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-display font-bold">Article Metrics</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Track views and shares across your published features to see what resonates most.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setView('dashboard')}>
              <LayoutDashboard className="w-4 h-4" /> Back to Dashboard
            </Button>
          </div>
        </div>
        <ArticleMetricsPanel scope="mine" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display font-bold">Editorial Portal</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Draft, submit, and publish stories about artists and the Frequency community.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.published > 0 && (
            <Button variant="outline" size="sm" onClick={() => setView('metrics')}>
              <BarChart3 className="w-4 h-4" /> Metrics
            </Button>
          )}
          <Button className="bg-gradient-neon hover:opacity-90 text-white" onClick={handleNewArticle}>
            <Plus className="w-4 h-4" /> New Article
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={FileText} label="Total" value={stats.total} color="text-neon-cyan" />
        <StatCard icon={PenLine} label="Drafts" value={stats.drafts} color="text-neon-blue" />
        <StatCard icon={Clock} label="In Review" value={stats.inReview} color="text-neon-purple" />
        <StatCard icon={CheckCircle2} label="Published" value={stats.published} color="text-neon-turquoise" />
        <StatCard icon={TrendingUp} label="Total Views" value={stats.totalViews} color="text-neon-magenta" />
      </div>

      {/* Dashboard Columns */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : articles.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <FileEdit className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No articles yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start writing your first story.</p>
          <Button className="mt-4 bg-gradient-neon hover:opacity-90 text-white" onClick={handleNewArticle}>
            <Plus className="w-4 h-4" /> Write Your First Article
          </Button>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Pending Drafts */}
          <div className="space-y-2">
            <ColumnHeader icon={PenLine} title="Pending Drafts" count={drafts.length} accent="text-neon-blue" />
            {drafts.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">No drafts in progress</div>
            ) : (
              drafts.map(article => (
                <DashboardArticleCard key={article.id} article={article} column="drafts"
                  onEdit={handleEdit} onSubmit={handleSubmit} onDelete={handleDelete} />
              ))
            )}
          </div>

          {/* In Review & Upcoming */}
          <div className="space-y-2">
            <ColumnHeader icon={Clock} title="In Review & Upcoming" count={inReview.length} accent="text-neon-purple" />
            {inReview.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">Nothing in review</div>
            ) : (
              inReview.map(article => (
                <DashboardArticleCard key={article.id} article={article} column="review"
                  onEdit={handleEdit} onSubmit={handleSubmit} onDelete={handleDelete} />
              ))
            )}
          </div>

          {/* Published */}
          <div className="space-y-2">
            <ColumnHeader icon={CheckCircle2} title="Published" count={published.length} accent="text-neon-turquoise" />
            {published.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">No published stories yet</div>
            ) : (
              published.map(article => (
                <DashboardArticleCard key={article.id} article={article} column="published"
                  onEdit={handleEdit} onSubmit={handleSubmit} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}