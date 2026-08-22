import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Image as ImageIcon, Plus, Heart, X, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';

export default function CommunityGallery({ community, currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const isManager = community.manager_user_id === currentUser?.id;

  const { data: photos = [] } = useQuery({
    queryKey: ['community-photos', community.id],
    queryFn: () => base44.entities.CommunityPhoto.filter(
      { community_id: community.id, is_approved: true },
      '-created_date', 100
    ),
  });

  const uploadPhoto = useMutation({
    mutationFn: (data) => base44.entities.CommunityPhoto.create(data),
    onSuccess: () => {
      setShowForm(false);
      setCaption(''); setImageUrl('');
      qc.invalidateQueries({ queryKey: ['community-photos', community.id] });
    },
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = () => {
    if (!imageUrl || !currentUser) return;
    uploadPhoto.mutate({
      community_id: community.id,
      uploader_user_id: currentUser.id,
      uploader_name: currentUser.full_name || currentUser.email,
      caption: caption.trim() || undefined,
      image_url: imageUrl,
    });
  };

  const toggleLike = useMutation({
    mutationFn: async (photo) => {
      const likedBy = photo.liked_by || [];
      const hasLiked = likedBy.includes(currentUser.id);
      const newLikedBy = hasLiked ? likedBy.filter(id => id !== currentUser.id) : [...likedBy, currentUser.id];
      return base44.entities.CommunityPhoto.update(photo.id, {
        liked_by: newLikedBy,
        likes_count: newLikedBy.length,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-photos', community.id] }),
  });

  const deletePhoto = useMutation({
    mutationFn: (id) => base44.entities.CommunityPhoto.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-photos', community.id] }),
  });

  return (
    <div className="space-y-3">
      {currentUser && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            {showForm ? <><X className="w-3.5 h-3.5" />Cancel</> : <><Plus className="w-3.5 h-3.5" />Add Photo</>}
          </Button>
        </div>
      )}

      {showForm && (
        <GlassCard hover={false} className="p-4 space-y-3 border-primary/20">
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-border/40 rounded-lg p-4 text-center hover:border-primary/30 transition-colors">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="max-h-32 mx-auto rounded" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground/50 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{uploading ? 'Uploading...' : 'Click to upload'}</p>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden"
                onChange={e => handleFileUpload(e.target.files?.[0])} disabled={uploading} />
            </label>
          </div>
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Or paste image URL" />
          <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption (optional)" />
          <Button size="sm" onClick={handleAdd} disabled={!imageUrl || uploadPhoto.isPending}>
            Add to Gallery
          </Button>
        </GlassCard>
      )}

      {photos.length === 0 && !showForm ? (
        <GlassCard hover={false} className="p-10 text-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No photos yet. Share moments from community events!</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map(photo => {
            const hasLiked = (photo.liked_by || []).includes(currentUser?.id);
            const canDelete = isManager || photo.uploader_user_id === currentUser?.id;
            return (
              <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden bg-secondary/20">
                <img src={photo.image_url} alt={photo.caption || ''} className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(photo)} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  {photo.caption && <p className="text-[10px] text-white line-clamp-2 mb-1">{photo.caption}</p>}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleLike.mutate(photo)}
                      className="flex items-center gap-1 text-xs text-white"
                    >
                      <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      {photo.likes_count || 0}
                    </button>
                    {canDelete && (
                      <button onClick={() => deletePhoto.mutate(photo.id)} className="text-white/70 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
          <img src={lightbox.image_url} alt={lightbox.caption || ''} className="max-w-full max-h-full rounded-lg" />
          {lightbox.caption && (
            <p className="absolute bottom-4 left-4 right-4 text-sm text-white/90 text-center">{lightbox.caption}</p>
          )}
        </div>
      )}
    </div>
  );
}