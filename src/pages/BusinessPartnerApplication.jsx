import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { toast } from '@/components/ui/use-toast';

const CATEGORIES = [
  'hotel', 'music_venue', 'recording_studio', 'rehearsal_space',
  'ticketing_company', 'merchandise_company', 'music_equipment_business',
  'video_production', 'photographer', 'entertainment_attorney',
  'marketing_company', 'tour_services', 'transportation_provider',
  'restaurant', 'event_sponsor', 'other'
];

const STEPS = ['business', 'contact', 'offers', 'review', 'submitting', 'done'];

export default function BusinessPartnerApplication() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const [form, setForm] = useState({
    business_name: '',
    public_handle: '',
    legal_name: '',
    partner_category: 'music_venue',
    description: '',
    services_offered: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    region: '',
    country: '',
    qr_promotions_enabled: false,
    referral_program_enabled: false,
    revenue_share_enabled: false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canAdvance = () => {
    if (step === 0) return form.business_name && form.partner_category;
    if (step === 1) return form.contact_email;
    return true;
  };

  const submit = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const handle = (form.public_handle || form.business_name).replace(/[^a-zA-Z0-9_]/g, '');
      const payload = {
        user_id: user.id,
        business_name: form.business_name,
        public_handle: handle,
        legal_name: form.legal_name,
        partner_category: form.partner_category,
        description: form.description,
        services_offered: form.services_offered ? form.services_offered.split(',').map((s) => s.trim()).filter(Boolean) : [],
        website: form.website,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        city: form.city,
        region: form.region,
        country: form.country,
        qr_promotions_enabled: form.qr_promotions_enabled,
        referral_program_enabled: form.referral_program_enabled,
        revenue_share_enabled: form.revenue_share_enabled,
        verification_status: 'pending',
        verification_type: 'none',
        application_submitted_date: new Date().toISOString(),
      };
      setStep(4);
      const created = await base44.entities.BusinessPartner.create(payload);
      setCreatedId(created.id);
      setStep(5);
    } catch (err) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
      setLoading(false);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = `Step ${Math.min(step + 1, 4)} of 4`;

  return (
    <AuthLayout
      icon={Briefcase}
      title="Business Partner Application"
      subtitle="Commercial & organizational partners — The Mainstream Frequency™"
      footer={
        <Link to="/register" className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to account types
        </Link>
      }
    >
      <div className="mb-5 p-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground leading-relaxed">
        Business Partners provide commercial services, products, opportunities, discounts, or experiences to artists
        and fans — hotels, venues, studios, ticketing, merch, equipment, production, legal, marketing, and more.
        A Business Partner is distinct from a Discovery Partner (who helps audiences discover artists). Your profile
        will be reviewed and verified by an administrator before going live.
      </div>

      {step < 4 && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{stepLabel}</span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} />
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Business / organization name" required value={form.business_name} onChange={(v) => set('business_name', v)} />
          <Field label="Public handle" hint="+partnername format — approved during verification. Defaults to your business name if left blank." value={form.public_handle} onChange={(v) => set('public_handle', v)} placeholder="partnername" prefix="+" />
          <Field label="Legal business name" value={form.legal_name} onChange={(v) => set('legal_name', v)} />
          <SelectField label="Partner category" required value={form.partner_category} onChange={(v) => set('partner_category', v)} options={CATEGORIES} />
          <TextareaField label="What do you offer?" value={form.description} onChange={(v) => set('description', v)} />
          <Field label="Services / products (comma separated)" value={form.services_offered} onChange={(v) => set('services_offered', v)} placeholder="Recording, mixing, rehearsal space" />
          <StepNav onBack={() => navigate('/register')} onNext={() => setStep(1)} nextDisabled={!canAdvance()} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Website" value={form.website} onChange={(v) => set('website', v)} placeholder="https://" />
          <Field label="Contact email" required value={form.contact_email} onChange={(v) => set('contact_email', v)} type="email" />
          <Field label="Contact phone" value={form.contact_phone} onChange={(v) => set('contact_phone', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" value={form.city} onChange={(v) => set('city', v)} />
            <Field label="State / Region" value={form.region} onChange={(v) => set('region', v)} />
          </div>
          <Field label="Country" value={form.country} onChange={(v) => set('country', v)} />
          <div className="space-y-2 pt-1">
            <Toggle label="Participate in QR membership promotions" checked={form.qr_promotions_enabled} onChange={(v) => set('qr_promotions_enabled', v)} />
            <Toggle label="Join approved referral programs" checked={form.referral_program_enabled} onChange={(v) => set('referral_program_enabled', v)} />
            <Toggle label="Join approved revenue-sharing programs" checked={form.revenue_share_enabled} onChange={(v) => set('revenue_share_enabled', v)} />
          </div>
          <StepNav onBack={() => setStep(0)} onNext={() => setStep(2)} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Programs & offers</h3>
          <p className="text-sm text-muted-foreground">
            You can add approved discounts and benefits after verification. Sponsor events and connect your services
            to artists and fans once your profile is live.
          </p>
          <ReviewBlock title="Summary" data={{
            'Business': form.business_name,
            'Category': form.partner_category?.replace(/_/g, ' '),
            'Website': form.website,
            'Email': form.contact_email,
            'QR promotions': form.qr_promotions_enabled ? 'Yes' : 'No',
            'Referral program': form.referral_program_enabled ? 'Yes' : 'No',
            'Revenue share': form.revenue_share_enabled ? 'Yes' : 'No',
          }} />
          <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Review & submit</h3>
          <p className="text-sm text-muted-foreground">
            Confirm your details. After submission, an administrator will review your business partner profile and
            verify it before it appears publicly with your +handle.
          </p>
          <ReviewBlock title="Business" data={{
            'Name': form.business_name,
            'Category': form.partner_category?.replace(/_/g, ' '),
            'Handle': form.public_handle ? `+${form.public_handle}` : `+${form.business_name.replace(/[^a-zA-Z0-9_]/g, '')}`,
          }} />
          <ReviewBlock title="Contact" data={{
            'Email': form.contact_email,
            'Phone': form.contact_phone,
            'Location': [form.city, form.region, form.country].filter(Boolean).join(', '),
            'Website': form.website,
          }} />
          <StepNav onBack={() => setStep(2)} onNext={submit} nextLabel="Submit for verification" nextDisabled={loading} />
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="font-medium">Creating your business partner profile…</p>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-lg font-medium text-foreground">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Profile submitted
          </div>
          <div className="rounded-lg bg-secondary/50 border border-border p-4 text-sm">
            <div className="font-medium text-foreground mb-1">Status: pending verification</div>
            <p className="text-muted-foreground">
              An administrator will review your business partner profile and verify it. You'll be notified when your
              profile is approved, rejected, or if more information is needed. Your public +handle will be active once verified.
            </p>
          </div>
          <Button className="w-full h-12" onClick={() => navigate('/business-partner-dashboard')}>
            Go to your business dashboard
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}

function Field({ label, value, onChange, required, hint, placeholder, type = 'text', prefix }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{prefix}</span>}
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`h-11 ${prefix ? 'pl-7' : ''}`} />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, ' ')}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function TextareaField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between w-full rounded-lg border border-border p-3 hover:border-primary/30">
      <span className="text-sm text-foreground">{label}</span>
      <span className={`w-10 h-6 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-secondary'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

function StepNav({ onBack, onNext, nextLabel = 'Continue', nextDisabled }) {
  return (
    <div className="flex gap-3 pt-2">
      <Button variant="outline" className="h-12 flex-1" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <Button className="h-12 flex-1" onClick={onNext} disabled={nextDisabled}>
        {nextLabel} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ReviewBlock({ title, data }) {
  const entries = Object.entries(data).filter(([, v]) => v);
  if (!entries.length) return null;
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-sm font-medium text-foreground mb-2">{title}</div>
      <dl className="space-y-1 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-foreground text-right truncate">{String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}