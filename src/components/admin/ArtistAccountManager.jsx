import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  UserPlus, Loader2, Search, CheckCircle2, XCircle, Clock,
  AlertCircle, Music, Mail, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  unverified: {
    label: 'Unverified',
    icon: AlertCircle,
    className: 'bg-muted text-muted-foreground border-border',
  },
  pending_review: {
    label: 'Pending Review',
    icon: Clock,
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  verified: {
    label: 'Verified',
    icon: CheckCircle2,
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

export default function ArtistAccountManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ artist_name: '', email: '' });
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch all artist profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-artist-profiles'],
    queryFn: () => base44.entities.ArtistProfile.list('-created_date', 200),
  });

  const filtered = profiles.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.artist_name || '').toLowerCase().includes(q) || (p.user_id || '').toLowerCase().includes(q);
  });

  // Create artist account
  const createAccount = useMutation({
    mutationFn: async ({ artist_name, email }) => {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Check if a profile already exists for this email
      const existing = await base44.entities.ArtistProfile.filter({ artist_email: cleanEmail });
      if (existing && existing.length > 0) {
        throw new Error('An artist profile already exists for this email address.');
      }

      // 2. Invite the user — platform sends email with secure link to set password.
      //    The user is created when they accept the invitation. The ArtistProfile
      //    stores artist_email and auto-links to the user on first login.
      await base44.users.inviteUser(cleanEmail, 'user');

      // 3. Create the ArtistProfile with artist_email (user_id linked on first login)
      const profile = await base44.entities.ArtistProfile.create({
        artist_name: artist_name.trim(),
        artist_email: cleanEmail,
        admin_verification_status: 'unverified',
      });

      // 4. Audit log
      const me = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_id: me.id,
        user_name: me.full_name,
        user_email: me.email,
        user_role: me.role,
        action: 'create_artist_account',
        action_category: 'admin',
        entity_type: 'ArtistProfile',
        entity_id: profile.id,
        details: `Admin created artist account "${artist_name}" for ${cleanEmail}`,
        is_security_event: false,
        is_master_admin_action: me.role === 'master_admin',
        severity: 'info',
      });

      return profile;
    },
    onSuccess: (profile) => {
      toast.success(`Artist account created — invitation email sent to ${form.email}`);
      setForm({ artist_name: '', email: '' });
      qc.invalidateQueries({ queryKey: ['admin-artist-profiles'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create artist account');
    },
  });

  // Update verification status
  const updateStatus = useMutation({
    mutationFn: async ({ profileId, status, notes }) => {
      const me = await base44.auth.me();
      const updates = {
        admin_verification_status: status,
        is_verified: status === 'verified',
        admin_verified_by_id: me.id,
        admin_verified_by_name: me.full_name,
        admin_verified_date: new Date().toISOString(),
      };
      if (notes !== undefined) updates.admin_verification_notes = notes;
      return base44.entities.ArtistProfile.update(profileId, updates);
    },
    onSuccess: () => {
      toast.success('Verification status updated');
      setReviewingId(null);
      setReviewNotes('');
      qc.invalidateQueries({ queryKey: ['admin-artist-profiles'] });
    },
    onError: (err) => toast.error(err.message || 'Failed to update status'),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.artist_name.trim() || !form.email.trim()) {
      toast.error('Artist name and email are required');
      return;
    }
    createAccount.mutate({ artist_name: form.artist_name, email: form.email });
  };

  return (
    <div className="space-y-6">
      {/* Create Artist Account */}
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Create Artist Account</h3>
            <p className="text-xs text-muted-foreground">
              Enter the artist's name and email. They'll receive a secure link to set their password and log in.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="artist_name">Artist / Band Name</Label>
            <Input
              id="artist_name"
              placeholder="Stage name or band name"
              value={form.artist_name}
              onChange={(e) => setForm((f) => ({ ...f, artist_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="artist_email">Artist Email</Label>
            <Input
              id="artist_email"
              type="email"
              placeholder="artist@email.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full sm:w-auto" disabled={createAccount.isPending}>
              {createAccount.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account & sending invitation...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Artist Account
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Artist Verification List */}
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Artist Verification</h3>
          <Badge variant="outline" className="text-xs">{profiles.length} total</Badge>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search artists by name..."
            className="pl-9 h-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[50vh] pr-2">
            <div className="space-y-2">
              {filtered.map((profile) => {
                const status = STATUS_CONFIG[profile.admin_verification_status || 'unverified'] || STATUS_CONFIG.unverified;
                const StatusIcon = status.icon;
                const isReviewing = reviewingId === profile.id;

                return (
                  <div
                    key={profile.id}
                    className={`rounded-xl border p-4 transition-all ${isReviewing ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          {profile.profile_image ? (
                            <img src={profile.profile_image} alt="" className="w-full h-full rounded-lg object-cover" />
                          ) : (
                            <Music className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{profile.artist_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            {profile.genre && <span>{profile.genre}</span>}
                            {profile.location && <span>· {profile.location}</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                              <StatusIcon className="w-2.5 h-2.5 mr-1" />
                              {status.label}
                            </Badge>
                            {profile.admin_verified_by_name && (
                              <span className="text-[10px] text-muted-foreground">
                                by {profile.admin_verified_by_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review panel */}
                    {isReviewing ? (
                      <div className="mt-3 space-y-2 rounded-lg bg-background/50 p-3">
                        <Textarea
                          placeholder="Admin review notes (optional)..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="h-16 text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ profileId: profile.id, status: 'verified', notes: reviewNotes })}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ profileId: profile.id, status: 'rejected', notes: reviewNotes })}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setReviewingId(null); setReviewNotes(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => { setReviewingId(profile.id); setReviewNotes(profile.admin_verification_notes || ''); }}>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Review
                        </Button>
                        {profile.bio && (
                          <span className="text-[10px] text-muted-foreground self-center ml-1">
                            Profile has bio ({profile.bio.length} chars)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {search ? 'No artists found.' : 'No artist profiles yet. Create one above.'}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}