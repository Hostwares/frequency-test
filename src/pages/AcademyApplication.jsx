import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Trophy, ArrowLeft, Loader2, CheckCircle2, Lock, Shield,
  FileText, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const APPLICANT_TYPES = [
  { value: 'verified_artist', label: 'Verified Artist' },
  { value: 'discovery_partner', label: 'Discovery Partner' },
  { value: 'radio_programmer', label: 'Radio Programmer' },
  { value: 'music_journalist', label: 'Music Journalist' },
  { value: 'community_manager', label: 'Community Manager' },
  { value: 'music_educator', label: 'Music Educator' },
  { value: 'producer', label: 'Producer' },
  { value: 'songwriter', label: 'Songwriter' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'entertainment_attorney', label: 'Entertainment Attorney' },
  { value: 'venue_owner', label: 'Venue Owner' },
  { value: 'festival_organizer', label: 'Festival Organizer' },
  { value: 'industry_professional', label: 'Industry Professional' },
  { value: 'community_contributor', label: 'Community Contributor' },
  { value: 'fan_representative', label: 'Fan Representative' },
];

export default function AcademyApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Check if already applied
  const { data: existing = [] } = useQuery({
    queryKey: ['academy-member', user?.id],
    queryFn: () => base44.entities.AcademyMember.filter({ user_id: user.id }, '-applied_date', 1),
    enabled: !!user,
  });

  const alreadyApplied = existing.length > 0;

  const [form, setForm] = useState({
    applicant_name: user?.full_name || '',
    applicant_email: user?.email || '',
    applicant_type: '',
    professional_background: '',
    music_industry_experience: '',
    areas_of_expertise: '',
    familiar_genres: '',
    community_involvement: '',
    artist_support_experience: '',
    why_fair_voter: '',
    bio: '',
    resume_url: '',
    website: '',
    portfolio_url: '',
    publication_links: '',
    industry_references: '',
    conflict_of_interest_disclosures: '',
  });
  const [confidentialityAgreed, setConfidentialityAgreed] = useState(false);
  const [codeOfEthicsAgreed, setCodeOfEthicsAgreed] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      return base44.entities.AcademyMember.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy-member'] });
      navigate('/academy-dashboard');
    },
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      user_id: user.id,
      familiar_genres: form.familiar_genres.split(',').map(g => g.trim()).filter(Boolean),
      publication_links: form.publication_links.split('\n').map(l => l.trim()).filter(Boolean),
      industry_references: form.industry_references.split('\n').map(l => l.trim()).filter(Boolean),
      confidentiality_agreed: confidentialityAgreed,
      code_of_ethics_agreed: codeOfEthicsAgreed,
      application_status: 'pending',
      applied_date: new Date().toISOString(),
    };
    submitMutation.mutate(payload);
  };

  if (alreadyApplied) {
    const app = existing[0];
    return (
      <div className="p-4 md:p-8 pb-24 max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/my-life-awards')}>
          <ArrowLeft className="w-4 h-4" /> Back to My Life Awards
        </Button>
        <GlassCard hover={false} className="p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-neon-turquoise mx-auto mb-3" />
          <h2 className="text-xl font-display font-bold mb-2">Application Submitted</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your Academy membership application has been received and is currently{' '}
            <span className="text-foreground font-semibold capitalize">{app.application_status.replace(/_/g, ' ')}</span>.
          </p>
          <Button className="bg-gradient-neon hover:opacity-90 text-white" onClick={() => navigate('/academy-dashboard')}>
            Go to Academy Dashboard
          </Button>
        </GlassCard>
      </div>
    );
  }

  const canSubmit = form.applicant_type && form.professional_background.trim() &&
    form.music_industry_experience.trim() && form.why_fair_voter.trim() &&
    confidentialityAgreed && codeOfEthicsAgreed;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-3xl mx-auto">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/my-life-awards')}>
        <ArrowLeft className="w-4 h-4" /> Back to My Life Awards
      </Button>

      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">Academy Membership Application</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Tell us about yourself and why you'd make a fair, committed voting member of the My Life Awards™ Academy.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <GlassCard hover={false} className="p-6 space-y-4">
          <h3 className="text-sm font-display font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Applicant Information
          </h3>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
              <Input
                value={form.applicant_name}
                onChange={(e) => handleChange('applicant_name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <Input
                value={form.applicant_email}
                onChange={(e) => handleChange('applicant_email', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Eligibility Category</label>
            <Select value={form.applicant_type} onValueChange={(v) => handleChange('applicant_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select your category..." /></SelectTrigger>
              <SelectContent>
                {APPLICANT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </GlassCard>

        {/* Professional Background */}
        <GlassCard hover={false} className="p-6 space-y-4">
          <h3 className="text-sm font-display font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-neon-cyan" /> Professional Experience
          </h3>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Professional Background *</label>
            <Textarea
              value={form.professional_background}
              onChange={(e) => handleChange('professional_background', e.target.value)}
              placeholder="Describe your professional background..."
              rows={3}
              required
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Music Industry Experience *</label>
            <Textarea
              value={form.music_industry_experience}
              onChange={(e) => handleChange('music_industry_experience', e.target.value)}
              placeholder="Years and nature of your music industry experience..."
              rows={3}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Areas of Expertise</label>
              <Input
                value={form.areas_of_expertise}
                onChange={(e) => handleChange('areas_of_expertise', e.target.value)}
                placeholder="e.g. A&R, production, journalism..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Familiar Genres (comma-separated)</label>
              <Input
                value={form.familiar_genres}
                onChange={(e) => handleChange('familiar_genres', e.target.value)}
                placeholder="e.g. Rock, Hip-Hop, Americana..."
              />
            </div>
          </div>
        </GlassCard>

        {/* Community & Support */}
        <GlassCard hover={false} className="p-6 space-y-4">
          <h3 className="text-sm font-display font-semibold flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-neon-magenta" /> Community & Artist Support
          </h3>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Community Involvement</label>
            <Textarea
              value={form.community_involvement}
              onChange={(e) => handleChange('community_involvement', e.target.value)}
              placeholder="Describe your involvement in the Frequency community..."
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Experience Supporting Artists</label>
            <Textarea
              value={form.artist_support_experience}
              onChange={(e) => handleChange('artist_support_experience', e.target.value)}
              placeholder="How have you supported artists?"
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Why You Would Make a Fair Voting Member *</label>
            <Textarea
              value={form.why_fair_voter}
              onChange={(e) => handleChange('why_fair_voter', e.target.value)}
              placeholder="Explain why you would be a fair and committed voting member..."
              rows={3}
              required
            />
          </div>
        </GlassCard>

        {/* Supporting Documents */}
        <GlassCard hover={false} className="p-6 space-y-4">
          <h3 className="text-sm font-display font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-neon-blue" /> Supporting Documents (Optional)
          </h3>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Biography</label>
            <Textarea
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Short biography..."
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Resume / CV URL</label>
              <Input
                value={form.resume_url}
                onChange={(e) => handleChange('resume_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Professional Website</label>
              <Input
                value={form.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Portfolio URL</label>
            <Input
              value={form.portfolio_url}
              onChange={(e) => handleChange('portfolio_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Publication / Media Links (one per line)</label>
            <Textarea
              value={form.publication_links}
              onChange={(e) => handleChange('publication_links', e.target.value)}
              placeholder="https://..."
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Industry References (one per line)</label>
            <Textarea
              value={form.industry_references}
              onChange={(e) => handleChange('industry_references', e.target.value)}
              placeholder="Name, relationship, contact..."
              rows={2}
            />
          </div>
        </GlassCard>

        {/* Conflict of Interest */}
        <GlassCard hover={false} className="p-6 space-y-3">
          <h3 className="text-sm font-display font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-neon-magenta" /> Conflict of Interest Disclosure
          </h3>
          <Textarea
            value={form.conflict_of_interest_disclosures}
            onChange={(e) => handleChange('conflict_of_interest_disclosures', e.target.value)}
            placeholder="Disclose any conflicts of interest (personal, financial, or professional relationships with potential nominees). Enter 'None' if none..."
            rows={2}
          />
        </GlassCard>

        {/* Agreements */}
        <GlassCard hover={false} className="p-6 space-y-4">
          <h3 className="text-sm font-display font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-neon-turquoise" /> Confidentiality & Code of Ethics
          </h3>

          <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
            <Checkbox
              checked={confidentialityAgreed}
              onCheckedChange={setConfidentialityAgreed}
              className="mt-0.5"
            />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Confidentiality Agreement</p>
              I agree to keep voting confidential, avoid discussing internal deliberations, report conflicts of interest,
              maintain fairness and impartiality, and follow the Academy Code of Ethics. I understand that violations
              may result in suspension or permanent removal.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
            <Checkbox
              checked={codeOfEthicsAgreed}
              onCheckedChange={setCodeOfEthicsAgreed}
              className="mt-0.5"
            />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Code of Ethics</p>
              I commit to maintaining confidentiality, voting integrity, and fairness throughout my tenure as an
              Academy member. I understand that membership on the Final Voting Council remains confidential until
              voting has concluded.
            </div>
          </div>
        </GlassCard>

        {/* Submit */}
        <div className="flex items-center gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 md:-mx-8 md:px-8 border-t border-border/30">
          <Button
            type="submit"
            className="bg-gradient-neon hover:opacity-90 text-white"
            disabled={!canSubmit || submitMutation.isPending}
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            Submit Application
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/my-life-awards')}>
            Cancel
          </Button>
          {!canSubmit && (
            <p className="text-xs text-muted-foreground ml-auto hidden md:block">
              Complete required fields and accept agreements to submit.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}