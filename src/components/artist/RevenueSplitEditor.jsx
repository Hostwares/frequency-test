import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, UserPlus, Mail, AlertCircle, Check, AlertTriangle } from 'lucide-react';
import {
  SPLIT_TYPES, ASSIGNMENT_TYPES, COLLABORATOR_ROLES, PAYMENT_METHODS,
  MAX_COLLABORATORS, calculateTotalPercentage, getPercentageStatus, getRoleLabel,
} from '@/lib/splitConstants';

const EMPTY_COLLABORATOR = {
  collaborator_type: 'external',
  collaborator_user_id: '',
  full_name: '',
  email: '',
  role: 'producer',
  revenue_percentage: 0,
  payment_method: 'frequency_wallet',
  notes: '',
};

export default function RevenueSplitEditor({
  open, onClose, onSave, artistProfile, releases = [], songs = [], split = null,
}) {
  const isEditing = !!split;
  const [form, setForm] = useState({
    split_name: '',
    description: '',
    split_type: 'artist_default',
    assignment_type: 'entire_account',
    release_id: '',
    song_id: '',
    status: 'draft',
    effective_date: '',
    start_date: '',
    end_date: '',
    notes: '',
    require_collaborator_approval: false,
    collaborators: [],
  });

  useEffect(() => {
    if (split) {
      setForm({
        split_name: split.split_name || '',
        description: split.description || '',
        split_type: split.split_type || 'artist_default',
        assignment_type: split.assignment_type || 'entire_account',
        release_id: split.release_id || '',
        song_id: split.song_id || '',
        status: split.status || 'draft',
        effective_date: split.effective_date || '',
        start_date: split.start_date || '',
        end_date: split.end_date || '',
        notes: split.notes || '',
        require_collaborator_approval: split.require_collaborator_approval || false,
        collaborators: (split.collaborators || []).map(c => ({ ...EMPTY_COLLABORATOR, ...c })),
      });
    } else {
      setForm({
        split_name: '', description: '', split_type: 'artist_default',
        assignment_type: 'entire_account', release_id: '', song_id: '',
        status: 'draft', effective_date: '', start_date: '', end_date: '',
        notes: '', require_collaborator_approval: false, collaborators: [],
      });
    }
  }, [split, open]);

  const total = calculateTotalPercentage(form.collaborators);
  const pctStatus = getPercentageStatus(total);
  const canActivate = total === 100 && form.collaborators.length > 0;
  const canSaveDraft = form.split_name.trim().length > 0;

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const addCollaborator = () => {
    if (form.collaborators.length >= MAX_COLLABORATORS) return;
    update('collaborators', [...form.collaborators, { ...EMPTY_COLLABORATOR, id: crypto.randomUUID() }]);
  };

  const updateCollaborator = (idx, field, value) => {
    setForm(f => ({
      ...f,
      collaborators: f.collaborators.map((c, i) =>
        i === idx ? { ...c, [field]: value } : c
      ),
    }));
  };

  const removeCollaborator = (idx) => {
    setForm(f => ({
      ...f,
      collaborators: f.collaborators.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = (activate = false) => {
    if (activate && !canActivate) return;
    const payload = {
      ...form,
      total_percentage: total,
      status: activate ? 'active' : form.status,
      collaborators: form.collaborators.map(c => ({
        ...c,
        revenue_percentage: Number(c.revenue_percentage) || 0,
      })),
    };
    onSave(payload, isEditing);
  };

  const needsRelease = ['album', 'ep', 'single'].includes(form.assignment_type);
  const needsSong = form.assignment_type === 'song';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Revenue Split' : 'Create Revenue Split'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Fields */}
          <div className="space-y-4">
            <div>
              <Label>Split Name *</Label>
              <Input
                value={form.split_name}
                onChange={(e) => update('split_name', e.target.value)}
                placeholder="e.g. Studio Album Default Split"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Describe how this split is used..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Split Type</Label>
                <Select value={form.split_type} onValueChange={(v) => update('split_type', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPLIT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assignment</Label>
                <Select value={form.assignment_type} onValueChange={(v) => update('assignment_type', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNMENT_TYPES.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {needsRelease && (
              <div>
                <Label>Select {form.assignment_type === 'ep' ? 'EP' : form.assignment_type === 'album' ? 'Album' : 'Single'} Release</Label>
                <Select value={form.release_id} onValueChange={(v) => update('release_id', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a release..." /></SelectTrigger>
                  <SelectContent>
                    {releases.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.title || r.release_name || 'Untitled'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsSong && (
              <div>
                <Label>Select Song</Label>
                <Select value={form.song_id} onValueChange={(v) => update('song_id', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a song..." /></SelectTrigger>
                  <SelectContent>
                    {songs.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Effective Date</Label>
                <Input type="date" value={form.effective_date} onChange={(e) => update('effective_date', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>End Date (Optional)</Label>
                <Input type="date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Internal notes about this split..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div>
                <Label className="cursor-pointer">Require Collaborator Approval</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Collaborators must approve their assigned percentage before activation</p>
              </div>
              <Switch checked={form.require_collaborator_approval} onCheckedChange={(v) => update('require_collaborator_approval', v)} />
            </div>
          </div>

          {/* Collaborators */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Collaborators ({form.collaborators.length}/{MAX_COLLABORATORS})</Label>
              <Button size="sm" variant="outline" onClick={addCollaborator} disabled={form.collaborators.length >= MAX_COLLABORATORS}>
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>

            {/* Percentage Meter */}
            <div className="p-3 rounded-lg border border-border/50 bg-secondary/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Running Total</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-lg font-bold ${
                    pctStatus === 'green' ? 'text-neon-turquoise' : pctStatus === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{total.toFixed(2)}%</span>
                  {pctStatus === 'green' && <Check className="w-4 h-4 text-neon-turquoise" />}
                  {pctStatus === 'yellow' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                  {pctStatus === 'red' && <AlertCircle className="w-4 h-4 text-red-400" />}
                </div>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    pctStatus === 'green' ? 'bg-neon-turquoise' : pctStatus === 'yellow' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(total, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {pctStatus === 'green' ? 'Total equals 100% — split can be activated.' :
                 pctStatus === 'yellow' ? 'Total is less than 100% — add collaborators or adjust percentages.' :
                 'Total exceeds 100% — reduce percentages to activate.'}
              </p>
            </div>

            {form.collaborators.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-lg">
                No collaborators yet. Add up to {MAX_COLLABORATORS} to distribute earnings.
              </div>
            )}

            {form.collaborators.map((collab, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-border/50 bg-secondary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Collaborator {idx + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeCollaborator(idx)} className="h-7 w-7">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">Full Name *</Label>
                    <Input
                      value={collab.full_name}
                      onChange={(e) => updateCollaborator(idx, 'full_name', e.target.value)}
                      placeholder="John Doe"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Email</Label>
                    <Input
                      value={collab.email}
                      onChange={(e) => updateCollaborator(idx, 'email', e.target.value)}
                      placeholder="john@example.com"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Role</Label>
                    <Select value={collab.role} onValueChange={(v) => updateCollaborator(idx, 'role', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLLABORATOR_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Percentage %</Label>
                    <Input
                      type="number"
                      min="0" max="100" step="0.01"
                      value={collab.revenue_percentage}
                      onChange={(e) => updateCollaborator(idx, 'revenue_percentage', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Payment Method</Label>
                    <Select value={collab.payment_method} onValueChange={(v) => updateCollaborator(idx, 'payment_method', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={collab.collaborator_type}
                    onValueChange={(v) => updateCollaborator(idx, 'collaborator_type', v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">External Collaborator</SelectItem>
                      <SelectItem value="platform_user">Platform User</SelectItem>
                    </SelectContent>
                  </Select>
                  {collab.collaborator_type === 'platform_user' && (
                    <Input
                      value={collab.collaborator_user_id}
                      onChange={(e) => updateCollaborator(idx, 'collaborator_user_id', e.target.value)}
                      placeholder="Platform User ID"
                      className="h-7 text-xs flex-1"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={() => handleSave(false)} disabled={!canSaveDraft}>
            {isEditing ? 'Save Changes' : 'Save as Draft'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={!canActivate} className="bg-gradient-neon text-white">
            <Check className="w-4 h-4 mr-1" /> {isEditing ? 'Save & Activate' : 'Create & Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}