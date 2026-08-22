import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Music } from 'lucide-react';
import { toast } from 'sonner';
import {
  validateAudioFile, validateDuration, readAudioDuration, verifyPlayback,
  ACCEPT_ATTR,
} from '@/lib/audioValidation';

export default function ReplaceAudioModal({ song, isOpen, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [newUrl, setNewUrl] = useState(null);
  const queryClient = useQueryClient();

  const replaceMutation = useMutation({
    mutationFn: (audioUrl) => base44.entities.Song.update(song.id, { audio_url: audioUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-songs'] });
      toast.success('Audio replaced');
      onClose();
      setNewUrl(null);
    },
  });

  const handleUpload = async (file) => {
    if (!file) return;

    const fileCheck = validateAudioFile(file);
    if (!fileCheck.valid) { toast.error(fileCheck.error); return; }

    setUploading(true);
    setProgress('Checking audio metadata...');
    try {
      let duration;
      try {
        duration = await readAudioDuration(file);
      } catch (e) {
        toast.error(e.message || 'Could not read audio metadata.');
        return;
      }

      const durCheck = validateDuration(duration);
      if (!durCheck.valid) { toast.error(durCheck.error); return; }

      setProgress('Uploading audio file...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setProgress('Verifying playback...');
      const playback = await verifyPlayback(file_url);
      if (!playback.playable) {
        toast.error(playback.error || 'Uploaded audio could not be played back.');
        return;
      }

      setNewUrl(file_url);
      toast.success('New audio verified — click Save to apply');
    } catch (e) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" /> Replace Audio
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{song?.title}</p>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-3">
          {song?.audio_url && !newUrl && (
            <div className="p-3 bg-secondary/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Current audio:</p>
              <audio src={song.audio_url} controls className="w-full" />
            </div>
          )}

          {newUrl ? (
            <div className="p-3 bg-neon-cyan/5 border border-neon-cyan/30 rounded-lg">
              <p className="text-xs text-neon-cyan mb-2">New audio ready:</p>
              <audio src={newUrl} controls className="w-full" />
            </div>
          ) : (
            <label className="block border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer">
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> {progress || 'Uploading...'}
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload new audio</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">MP3, WAV, M4A, OGG, FLAC, AAC · Max 50 MB</p>
                </>
              )}
              <input type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
            </label>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/30">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => replaceMutation.mutate(newUrl)} disabled={!newUrl || replaceMutation.isPending}>
            {replaceMutation.isPending ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</> : 'Replace Audio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}