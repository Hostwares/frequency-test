import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function SongUploader({ artistId, artistName }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [audio, setAudio] = useState(null);
  const [cover, setCover] = useState(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !audio) throw new Error('Title and audio file are required');
      const { file_url: audioUrl } = await base44.integrations.Core.UploadFile({ file: audio });
      let coverArt = '';
      if (cover) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: cover });
        coverArt = file_url;
      }
      return base44.entities.Song.create({
        title: title.trim(),
        artist_profile_id: artistId,
        artist_name: artistName || '',
        audio_url: audioUrl,
        cover_art: coverArt,
        ai_disclosure: 'human_created',
        verification_type: 'human_created',
      });
    },
    onSuccess: () => {
      setTitle('');
      setAudio(null);
      setCover(null);
      qc.invalidateQueries({ queryKey: ['default-artist-songs', artistId] });
      toast.success('Song uploaded');
    },
    onError: (e) => toast.error(e.message || 'Upload failed'),
  });

  return (
    <div className="space-y-2 p-3 bg-secondary/10 rounded-lg">
      <p className="text-xs font-medium text-muted-foreground">Upload a new song</p>
      <Input placeholder="Song title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-primary cursor-pointer">
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => setAudio(e.target.files?.[0] || null)} />
          {audio ? audio.name : 'Choose audio file…'}
        </label>
        <label className="text-xs text-muted-foreground cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] || null)} />
          {cover ? cover.name : 'Cover art (optional)…'}
        </label>
      </div>
      <Button size="sm" onClick={() => upload.mutate()} disabled={upload.isPending || !title.trim() || !audio}>
        {upload.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        Upload Song
      </Button>
    </div>
  );
}