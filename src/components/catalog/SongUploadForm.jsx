import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Upload, Music, Loader2, ChevronRight } from 'lucide-react';
import GenreSelect from '@/components/shared/GenreSelect';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  validateAudioFile, validateDuration, readAudioDuration, verifyPlayback,
  ACCEPT_ATTR, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS,
} from '@/lib/audioValidation';

const MOODS = ['energetic', 'chill', 'emotional', 'uplifting', 'melancholic', 'romantic', 'angsty', 'peaceful', 'nostalgic', 'empowering', 'dark', 'party', 'workout', 'focus', 'other'];
const TEMPOS = ['very_slow', 'slow', 'medium', 'fast', 'very_fast'];
const VOCAL_TYPES = ['male', 'female', 'duet', 'group', 'instrumental', 'spoken_word', 'choir', 'other'];
const PROS = ['ascap', 'bmi', 'sesac', 'gmr', 'soundexchange', 'prs', 'gema', 'sacem', 'none', 'other'];
const AI_OPTIONS = [
  { value: 'human_created', label: 'Human Created' },
  { value: 'human_assisted', label: 'Human Assisted (AI tools)' },
  { value: 'ai_assisted', label: 'AI Assisted' },
  { value: 'ai_generated', label: 'AI Generated' },
];

const STEPS = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'audio', label: 'Audio & Art' },
  { key: 'musical', label: 'Musical' },
  { key: 'credits', label: 'Credits' },
  { key: 'rights', label: 'Rights & Legal' },
  { key: 'lyrics', label: 'Lyrics & Flags' },
];

function TagInput({ label, value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) { onChange([...value, v]); setInput(''); }
  };
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder || 'Type and press Enter'}
          className="text-sm h-8"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-secondary rounded-md">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SongUploadForm({ isOpen, onClose, onSaved, artistProfile, editingSong, parentSongId }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadingArt, setUploadingArt] = useState(false);
  const [form, setForm] = useState(() => {
    const base = {
      title: '', subtitle: '', isrc: '', upc: '', album: '', release_id: '',
      disc_number: 1, track_number: '', genre: '', sub_genre: '', mood: '', tempo: '',
      bpm: '', key_signature: '', time_signature: '4/4', language: '', lyrics: '',
      writers: [], producers: [], publishers: [], copyright_owner: '', sound_recording_owner: '',
      release_date: '', cover_art: '', explicit_flag: false, ai_disclosure: 'human_created',
      vocal_type: '', is_instrumental: false, featured_artists: [], credits: '',
      performance_rights_organization: '', territory_restrictions: [], audio_url: '',
      duration_seconds: '', version_type: parentSongId ? 'acoustic' : 'original',
      parent_song_id: parentSongId || '', version_notes: '',
      is_purchasable: false, purchase_price: '',
    };
    if (editingSong) return { ...base, ...editingSong };
    return base;
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAudioUpload = async (file) => {
    if (!file) return;

    // 1. Format & size validation
    const fileCheck = validateAudioFile(file);
    if (!fileCheck.valid) { toast.error(fileCheck.error); return; }

    setUploadingAudio(true);
    setUploadProgress('Checking audio metadata...');

    try {
      // 2. Duration validation (from local file before uploading)
      let duration;
      try {
        duration = await readAudioDuration(file);
      } catch (e) {
        toast.error(e.message || 'Could not read audio metadata.');
        return;
      }

      const durCheck = validateDuration(duration);
      if (!durCheck.valid) { toast.error(durCheck.error); return; }

      // 3. Upload to storage
      setUploadProgress('Uploading audio file...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 4. Verify playback from the stored URL
      setUploadProgress('Verifying playback...');
      const playback = await verifyPlayback(file_url);
      if (!playback.playable) {
        toast.error(playback.error || 'Uploaded audio could not be played back.');
        return;
      }

      // 5. Store URL + duration (use verified duration as source of truth)
      set('audio_url', file_url);
      set('duration_seconds', Math.round(playback.duration || duration));
      toast.success(`Audio verified — ${Math.round(playback.duration || duration)}s, plays correctly.`);
    } catch (e) {
      toast.error(e.message || 'Audio upload failed');
    } finally {
      setUploadingAudio(false);
      setUploadProgress('');
    }
  };

  const handleArtUpload = async (file) => {
    if (!file) return;
    setUploadingArt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('cover_art', file_url);
      toast.success('Artwork uploaded');
    } catch { toast.error('Artwork upload failed'); }
    finally { setUploadingArt(false); }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); setStep(0); return; }
    if (!form.audio_url && !editingSong) { toast.error('Audio file is required'); setStep(1); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        artist_profile_id: artistProfile.id,
        artist_name: artistProfile.artist_name,
        bpm: form.bpm ? Number(form.bpm) : undefined,
        track_number: form.track_number ? Number(form.track_number) : undefined,
        disc_number: Number(form.disc_number) || 1,
        duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : undefined,
        is_purchasable: !!form.is_purchasable,
        purchase_price: form.is_purchasable && form.purchase_price ? Number(form.purchase_price) : 0,
      };
      if (editingSong) {
        await base44.entities.Song.update(editingSong.id, payload);
        toast.success('Song updated');
      } else {
        await base44.entities.Song.create(payload);
        toast.success('Song uploaded');
      }
      onSaved();
      onClose();
    } catch (e) { toast.error(e.message || 'Failed to save song'); }
    finally { setSaving(false); }
  };

  const canNext = () => {
    if (step === 0) return !!form.title.trim();
    if (step === 1) return !!form.audio_url || !!editingSong;
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Music className="w-5 h-5 text-primary" />
            {editingSong ? 'Edit Song' : parentSongId ? 'Add Version' : 'Upload Song'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 pb-3 overflow-x-auto">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <button
                onClick={() => i < step || canNext() ? setStep(i) : null}
                className={`text-xs px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                  i === step ? 'bg-primary text-primary-foreground' :
                  i < step ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground'
                }`}
              >
                {i + 1}. {s.label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        <ScrollArea className="max-h-[55vh] px-6 pb-4">
          <div className="space-y-4">
            {step === 0 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Title *</Label>
                    <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Song title" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Track #</Label>
                    <Input type="number" value={form.track_number} onChange={(e) => set('track_number', e.target.value)} placeholder="1" className="text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Subtitle</Label>
                  <Input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="feat. Artist Name" className="text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Album / Release</Label>
                    <Input value={form.album} onChange={(e) => set('album', e.target.value)} placeholder="Album name" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Disc Number</Label>
                    <Input type="number" value={form.disc_number} onChange={(e) => set('disc_number', e.target.value)} className="text-sm" />
                  </div>
                </div>
                {parentSongId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Version Type</Label>
                      <Select value={form.version_type} onValueChange={(v) => set('version_type', v)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['acoustic', 'radio_edit', 'instrumental', 'explicit', 'clean', 'alternate_mix', 'remix', 'live', 'demo', 'extended', 'other'].map(v => (
                            <SelectItem key={v} value={v} className="capitalize">{v.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Version Notes</Label>
                      <Input value={form.version_notes} onChange={(e) => set('version_notes', e.target.value)} placeholder="e.g. Profanity removed" className="text-sm" />
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <Label className="text-xs">Audio File *</Label>
                  <div className="mt-1 border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/40 transition-colors">
                    {uploadingAudio ? (
                      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress || 'Uploading...'}
                        </div>
                      </div>
                    ) : form.audio_url ? (
                      <div className="space-y-2">
                        <audio src={form.audio_url} controls className="w-full" />
                        <label className="cursor-pointer text-xs text-primary hover:underline">
                          <Upload className="w-3 h-3 inline mr-1" />Replace audio
                          <input type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => handleAudioUpload(e.target.files?.[0])} />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload audio</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          MP3, WAV, M4A, OGG, FLAC, AAC, WEBM · Max 50 MB · {MIN_DURATION_SECONDS}s–{MAX_DURATION_SECONDS / 60}min
                        </p>
                        <input type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => handleAudioUpload(e.target.files?.[0])} />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Cover Artwork</Label>
                  <div className="mt-1 flex items-center gap-4">
                    {form.cover_art ? (
                      <img src={form.cover_art} alt="cover" className="w-20 h-20 rounded-lg object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <Music className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild disabled={uploadingArt}>
                        <span>{uploadingArt ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</> : <><Upload className="w-3 h-3" /> Upload Art</>}</span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleArtUpload(e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Duration (seconds)</Label>
                  <Input type="number" value={form.duration_seconds} onChange={(e) => set('duration_seconds', e.target.value)} placeholder="Auto-detected" className="text-sm" />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Genre</Label>
                    <div className="mt-1"><GenreSelect value={form.genre} onChange={(v) => set('genre', v)} /></div>
                  </div>
                  <div>
                    <Label className="text-xs">Subgenre</Label>
                    <Input value={form.sub_genre} onChange={(e) => set('sub_genre', e.target.value)} placeholder="e.g. Dream Pop" className="text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Mood</Label>
                    <Select value={form.mood} onValueChange={(v) => set('mood', v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Select mood" /></SelectTrigger>
                      <SelectContent>{MOODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Tempo</Label>
                    <Select value={form.tempo} onValueChange={(v) => set('tempo', v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Select tempo" /></SelectTrigger>
                      <SelectContent>{TEMPOS.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">BPM</Label>
                    <Input type="number" value={form.bpm} onChange={(e) => set('bpm', e.target.value)} placeholder="120" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Key</Label>
                    <Input value={form.key_signature} onChange={(e) => set('key_signature', e.target.value)} placeholder="C Major" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Time Sig</Label>
                    <Input value={form.time_signature} onChange={(e) => set('time_signature', e.target.value)} placeholder="4/4" className="text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Language</Label>
                  <Input value={form.language} onChange={(e) => set('language', e.target.value)} placeholder="English" className="text-sm" />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <TagInput label="Writers" value={form.writers} onChange={(v) => set('writers', v)} placeholder="Writer name" />
                <TagInput label="Producers" value={form.producers} onChange={(v) => set('producers', v)} placeholder="Producer name" />
                <TagInput label="Publishers" value={form.publishers} onChange={(v) => set('publishers', v)} placeholder="Publisher name" />
                <TagInput label="Featured Artists" value={form.featured_artists} onChange={(v) => set('featured_artists', v)} placeholder="Featured artist" />
                <div>
                  <Label className="text-xs">Additional Credits</Label>
                  <Textarea value={form.credits} onChange={(e) => set('credits', e.target.value)} placeholder="Musicians, engineers, studios, etc." className="text-sm" rows={3} />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Copyright Owner</Label>
                    <Input value={form.copyright_owner} onChange={(e) => set('copyright_owner', e.target.value)} placeholder="Composition copyright owner" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Sound Recording Owner</Label>
                    <Input value={form.sound_recording_owner} onChange={(e) => set('sound_recording_owner', e.target.value)} placeholder="Master owner" className="text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">ISRC</Label>
                    <Input value={form.isrc} onChange={(e) => set('isrc', e.target.value)} placeholder="CC-XXX-YY-NNNNN" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">UPC</Label>
                    <Input value={form.upc} onChange={(e) => set('upc', e.target.value)} placeholder="Universal Product Code" className="text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Performance Rights Org (PRO)</Label>
                    <Select value={form.performance_rights_organization} onValueChange={(v) => set('performance_rights_organization', v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Select PRO" /></SelectTrigger>
                      <SelectContent>{PROS.map(p => <SelectItem key={p} value={p} className="uppercase">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Release Date</Label>
                    <Input type="date" value={form.release_date} onChange={(e) => set('release_date', e.target.value)} className="text-sm" />
                  </div>
                </div>
                <TagInput label="Territory Restrictions" value={form.territory_restrictions} onChange={(v) => set('territory_restrictions', v)} placeholder="ISO country code (e.g. US)" />
              </>
            )}

            {step === 5 && (
              <>
                <div>
                  <Label className="text-xs">Lyrics (plain text or LRC format with [mm:ss.xx] timestamps)</Label>
                  <Textarea value={form.lyrics} onChange={(e) => set('lyrics', e.target.value)} placeholder="[00:12.50] First line of lyrics..." className="text-sm font-mono" rows={6} />
                </div>
                <div className="space-y-3 p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Explicit Content</Label>
                    <Switch checked={form.explicit_flag} onCheckedChange={(v) => set('explicit_flag', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Instrumental (no vocals)</Label>
                    <Switch checked={form.is_instrumental} onCheckedChange={(v) => set('is_instrumental', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">AI Disclosure</Label>
                    <Select value={form.ai_disclosure} onValueChange={(v) => set('ai_disclosure', v)}>
                      <SelectTrigger className="text-sm mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{AI_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Vocal Type</Label>
                    <Select value={form.vocal_type} onValueChange={(v) => set('vocal_type', v)}>
                      <SelectTrigger className="text-sm mt-1"><SelectValue placeholder="Select vocal type" /></SelectTrigger>
                      <SelectContent>{VOCAL_TYPES.map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Direct Sale */}
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Available for Direct Purchase</Label>
                    <Switch checked={!!form.is_purchasable} onCheckedChange={(v) => set('is_purchasable', v)} />
                  </div>
                  {form.is_purchasable && (
                    <div>
                      <Label className="text-xs">Purchase Price (USD, min $0.50)</Label>
                      <Input type="number" min="0.50" step="0.01" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} placeholder="1.29" className="text-sm mt-1" />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border/30 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => step > 0 ? setStep(step - 1) : onClose()}>
            {step > 0 ? 'Back' : 'Cancel'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canNext()}>Next</Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</> : editingSong ? 'Save Changes' : 'Upload Song'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}