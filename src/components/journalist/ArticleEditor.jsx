import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { X, Save, Send, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactQuill from 'react-quill';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const CATEGORIES = [
  { value: 'artist_feature', label: 'Artist Feature' },
  { value: 'community_story', label: 'Community Story' },
  { value: 'interview', label: 'Interview' },
  { value: 'review', label: 'Review' },
  { value: 'opinion', label: 'Opinion / Editorial' },
  { value: 'news', label: 'News' },
  { value: 'behind_the_scenes', label: 'Behind the Scenes' },
  { value: 'milestone_celebration', label: 'Milestone Celebration' },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'link'],
    [{ align: [] }],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'blockquote', 'link', 'align',
];

function calculateReadingTime(html) {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export default function ArticleEditor({ article, onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEditing = !!article;

  const [title, setTitle] = useState(article?.title || '');
  const [subtitle, setSubtitle] = useState(article?.subtitle || '');
  const [body, setBody] = useState(article?.body || '');
  const [excerpt, setExcerpt] = useState(article?.excerpt || '');
  const [category, setCategory] = useState(article?.category || 'artist_feature');
  const [coverImage, setCoverImage] = useState(article?.cover_image || '');
  const [tags, setTags] = useState((article?.tags || []).join(', '));
  const [featuredArtistName, setFeaturedArtistName] = useState(article?.featured_artist_name || '');
  const [communityName, setCommunityName] = useState(article?.community_name || '');
  const [submitAfterSave, setSubmitAfterSave] = useState(false);
  const [featureDeadline, setFeatureDeadline] = useState(article?.feature_deadline || '');

  // Artist search for linking
  const [artistSearch, setArtistSearch] = useState('');
  const [selectedArtist, setSelectedArtist] = useState(
    article?.featured_artist_id
      ? { id: article.featured_artist_id, name: article.featured_artist_name }
      : null
  );

  const { data: artistResults = [] } = useQuery({
    queryKey: ['artist-search', artistSearch],
    queryFn: () => base44.entities.ArtistProfile.filter(
      { artist_name: { $regex: artistSearch, $options: 'i' } },
      '-resonance_score',
      5
    ),
    enabled: artistSearch.length >= 2,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEditing) {
        return base44.entities.EditorialArticle.update(article.id, payload);
      }
      return base44.entities.EditorialArticle.create(payload);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['journalist-articles'] });
      if (submitAfterSave && data.id) {
        submitMutation.mutate(data.id);
      } else {
        onClose();
      }
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id) => base44.entities.EditorialArticle.update(id, {
      status: 'submitted',
      submitted_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journalist-articles'] });
      onClose();
    },
  });

  const handleSave = (submit) => {
    setSubmitAfterSave(submit);
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title,
      subtitle,
      body,
      excerpt: excerpt || body.replace(/<[^>]*>/g, ' ').trim().slice(0, 200),
      category,
      cover_image: coverImage,
      tags: tagArray,
      featured_artist_id: selectedArtist?.id || null,
      featured_artist_name: selectedArtist?.name || featuredArtistName,
      community_name: communityName || null,
      author_user_id: user.id,
      author_name: user.full_name || user.email,
      slug: slugify(title),
      reading_time_minutes: calculateReadingTime(body),
      feature_deadline: featureDeadline || null,
    };
    saveMutation.mutate(payload);
  };

  const isPending = saveMutation.isPending || submitMutation.isPending;
  const canSave = title.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-display font-bold">
            {isEditing ? 'Edit Article' : 'New Article'}
          </h1>
          {article?.status && (
            <NeonBadge color="blue">{article.status.replace(/_/g, ' ')}</NeonBadge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Cover image preview */}
      {coverImage && (
        <div className="mb-4 rounded-xl overflow-hidden h-40 md:h-56 relative">
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
            onClick={() => setCoverImage('')}
          >
            <X className="w-4 h-4 text-white" />
          </Button>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Headline</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your headline..."
            className="text-lg font-display font-semibold h-12"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Subtitle / Deck</label>
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="A compelling subheading..."
          />
        </div>

        {/* Category + Cover image URL */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cover Image URL</label>
            <Input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
          </div>
        </div>

        {/* Excerpt */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Excerpt (optional)</label>
          <Textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short summary for cards and SEO. Auto-generated if left blank."
            rows={2}
            maxLength={500}
          />
        </div>

        {/* Feature deadline */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Feature Deadline (optional)</label>
          <Input
            type="date"
            value={featureDeadline ? featureDeadline.split('T')[0] : ''}
            onChange={(e) => setFeatureDeadline(e.target.value ? new Date(e.target.value).toISOString() : '')}
          />
        </div>

        {/* Rich text editor */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Article Body</label>
          <div className="rounded-lg overflow-hidden border border-border/50 bg-background">
            <ReactQuill
              theme="snow"
              value={body}
              onChange={setBody}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              placeholder="Start writing your story..."
              style={{ minHeight: '300px' }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Est. reading time: {calculateReadingTime(body)} min
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="indie, interview, rising artist"
          />
        </div>

        {/* Featured artist */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Featured Artist (optional)</label>
          {selectedArtist ? (
            <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
              <NeonBadge color="purple">{selectedArtist.name}</NeonBadge>
              <Button size="sm" variant="ghost" className="h-6 text-xs ml-auto"
                onClick={() => setSelectedArtist(null)}>
                Remove
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                value={artistSearch}
                onChange={(e) => setArtistSearch(e.target.value)}
                placeholder="Search for an artist to link..."
                className="bg-secondary/50"
              />
              {artistSearch.length >= 2 && artistResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {artistResults.map(a => (
                    <button
                      key={a.id}
                      className="w-full text-left px-3 py-2 hover:bg-secondary/50 text-sm flex items-center gap-2"
                      onClick={() => {
                        setSelectedArtist({ id: a.id, name: a.artist_name });
                        setArtistSearch('');
                        if (!featuredArtistName) setFeaturedArtistName(a.artist_name);
                      }}
                    >
                      {a.profile_image && (
                        <img src={a.profile_image} alt="" className="w-6 h-6 rounded-full object-cover" />
                      )}
                      <span>{a.artist_name}</span>
                      {a.artist_handle && (
                        <span className="text-xs text-muted-foreground">!{a.artist_handle}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Community name */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Related Community (optional)</label>
          <Input
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder="e.g. Southern Rock, Americana"
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 pt-4 border-t border-border/30 sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 md:-mx-8 md:px-8">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={!canSave || isPending}
          >
            {isPending && !submitAfterSave ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </Button>
          <Button
            className="bg-gradient-neon hover:opacity-90 text-white"
            onClick={() => handleSave(true)}
            disabled={!canSave || isPending}
          >
            {isPending && submitAfterSave ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Save & Submit
          </Button>
          <Button variant="ghost" onClick={onClose} className="ml-auto">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}