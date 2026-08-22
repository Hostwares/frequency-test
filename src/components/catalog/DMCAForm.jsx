import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function DMCAForm({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    complainant_name: '', complainant_email: '', complainant_company: '',
    infringing_song_title: '', infringing_artist_name: '',
    original_work_title: '', original_work_url: '', original_work_registration: '',
    description: '', signature: '',
    good_faith_statement: false, accuracy_statement: false,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DMCANotice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['dmca-notices']);
      toast.success('DMCA notice filed. We will review it promptly.');
      onClose();
      setForm({ complainant_name: '', complainant_email: '', complainant_company: '', infringing_song_title: '', infringing_artist_name: '', original_work_title: '', original_work_url: '', original_work_registration: '', description: '', signature: '', good_faith_statement: false, accuracy_statement: false });
    },
  });

  const handleSubmit = () => {
    if (!form.complainant_name.trim() || !form.complainant_email.trim()) { toast.error('Name and email required'); return; }
    if (!form.description.trim() || !form.original_work_title.trim()) { toast.error('Description and original work title required'); return; }
    if (!form.good_faith_statement || !form.accuracy_statement) { toast.error('Both statements must be acknowledged'); return; }
    if (!form.signature.trim()) { toast.error('Electronic signature required'); return; }
    createMutation.mutate(form);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" /> DMCA Takedown Notice
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            File a notice under the Digital Millennium Copyright Act (DMCA) for alleged copyright infringement.
          </p>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] px-6 pb-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Your Name *</Label>
                <Input value={form.complainant_name} onChange={(e) => setForm({ ...form, complainant_name: e.target.value })} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={form.complainant_email} onChange={(e) => setForm({ ...form, complainant_email: e.target.value })} className="text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Company / Organization</Label>
              <Input value={form.complainant_company} onChange={(e) => setForm({ ...form, complainant_company: e.target.value })} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Infringing Song Title *</Label>
                <Input value={form.infringing_song_title} onChange={(e) => setForm({ ...form, infringing_song_title: e.target.value })} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Infringing Artist</Label>
                <Input value={form.infringing_artist_name} onChange={(e) => setForm({ ...form, infringing_artist_name: e.target.value })} className="text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Original Work Title *</Label>
                <Input value={form.original_work_title} onChange={(e) => setForm({ ...form, original_work_title: e.target.value })} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Copyright Registration #</Label>
                <Input value={form.original_work_registration} onChange={(e) => setForm({ ...form, original_work_registration: e.target.value })} className="text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Original Work URL</Label>
              <Input value={form.original_work_url} onChange={(e) => setForm({ ...form, original_work_url: e.target.value })} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Description of Infringement *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="text-sm" placeholder="Describe how the content infringes your copyright..." />
            </div>
            <div className="space-y-2 p-3 bg-secondary/30 rounded-lg">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.good_faith_statement} onChange={(e) => setForm({ ...form, good_faith_statement: e.target.checked })} className="mt-0.5" />
                <span className="text-xs text-muted-foreground">I have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.accuracy_statement} onChange={(e) => setForm({ ...form, accuracy_statement: e.target.checked })} className="mt-0.5" />
                <span className="text-xs text-muted-foreground">I swear, under penalty of perjury, that the information in the notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner.</span>
              </label>
            </div>
            <div>
              <Label className="text-xs">Electronic Signature (type your full name) *</Label>
              <Input value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} className="text-sm" />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t border-border/30">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <><Loader2 className="w-3 h-3 animate-spin" /> Filing...</> : 'File DMCA Notice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}