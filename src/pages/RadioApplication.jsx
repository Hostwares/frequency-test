import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Radio, ArrowLeft, ArrowRight, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { toast } from '@/components/ui/use-toast';

const STATION_TYPES = [
  { value: 'terrestrial_radio', label: 'Terrestrial Radio Station', hint: 'AM, FM, shortwave, college, public, commercial, community' },
  { value: 'internet_radio', label: 'Internet Radio Station', hint: 'Independent online, web-only, digital music channel' },
  { value: 'satellite_digital_network', label: 'Satellite / Digital Radio Network', hint: 'Satellite, digital audio network, subscription radio' },
  { value: 'syndicated_program', label: 'Syndicated Radio Program', hint: 'A show operating across one or more stations' },
  { value: 'independent_programmer', label: 'Independent Radio Programmer', hint: 'Verified person who programs music for a station/network' },
];

const TERRESTRIAL_SUBTYPES = ['am', 'fm', 'shortwave', 'college', 'public', 'commercial', 'community'];
const BANDS = ['AM', 'FM', 'digital', 'satellite', 'internet', 'shortwave'];
const ROLES = [
  'program_director', 'music_director', 'assistant_music_director',
  'specialty_show_host', 'digital_programmer', 'playlist_director',
  'station_manager', 'content_director', 'on_air_personality', 'independent_curator'
];

const STEPS = ['type', 'station', 'applicant', 'organization', 'review', 'submitting', 'done'];

export default function RadioApplication() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stationId, setStationId] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [form, setForm] = useState({
    station_type: 'terrestrial_radio',
    terrestrial_subtype: 'fm',
    official_station_name: '',
    official_station_identifier: '',
    band: 'FM',
    frequency: '',
    country: '',
    region: '',
    city: '',
    market: '',
    time_zone: '',
    language: '',
    genres_programmed: '',
    station_description: '',
    website: '',
    stream_url: '',
    schedule_url: '',
    applicant_full_name: '',
    applicant_title: '',
    applicant_station_role: 'music_director',
    applicant_work_email: '',
    applicant_work_phone: '',
    applicant_department: '',
    applicant_manager_name: '',
    applicant_linkedin: '',
    license_holder: '',
    parent_company: '',
    network_affiliation: '',
    ownership_type: '',
    government_license_number: '',
    regulator: '',
    license_expiration_date: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canAdvance = () => {
    if (step === 0) return !!form.station_type;
    if (step === 1) return form.official_station_name && form.station_type !== 'terrestrial_radio' || (form.official_station_name && form.terrestrial_subtype);
    if (step === 2) return form.applicant_full_name && form.applicant_work_email;
    if (step === 3) return true;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const payload = {
        applicant_user_id: user.id,
        official_station_name: form.official_station_name,
        official_station_identifier: form.official_station_identifier,
        station_type: form.station_type,
        terrestrial_subtype: form.station_type === 'terrestrial_radio' ? form.terrestrial_subtype : undefined,
        band: form.band,
        frequency: form.frequency,
        country: form.country,
        region: form.region,
        city: form.city,
        market: form.market,
        time_zone: form.time_zone,
        language: form.language,
        genres_programmed: form.genres_programmed ? form.genres_programmed.split(',').map((s) => s.trim()).filter(Boolean) : [],
        station_description: form.station_description,
        website: form.website,
        stream_url: form.stream_url,
        schedule_url: form.schedule_url,
        applicant_full_name: form.applicant_full_name,
        applicant_title: form.applicant_title,
        applicant_station_role: form.applicant_station_role,
        applicant_work_email: form.applicant_work_email,
        applicant_work_phone: form.applicant_work_phone,
        applicant_department: form.applicant_department,
        applicant_manager_name: form.applicant_manager_name,
        applicant_linkedin: form.applicant_linkedin,
        license_holder: form.license_holder,
        parent_company: form.parent_company,
        network_affiliation: form.network_affiliation,
        ownership_type: form.ownership_type,
        government_license_number: form.government_license_number,
        regulator: form.regulator,
        license_expiration_date: form.license_expiration_date || undefined,
        verification_status: 'application_submitted',
        verification_type: 'none',
        application_submitted_date: new Date().toISOString(),
      };

      const created = await base44.entities.RadioStation.create(payload);
      setStationId(created.id);

      // Run AI verification
      setStep(5);
      const result = await base44.functions.invoke('verifyRadioApplication', { station_id: created.id });
      setAiResult(result);

      // Reload station to reflect updated status
      const updated = await base44.entities.RadioStation.get(created.id);
      setForm((f) => ({ ...f, _verification_status: updated.verification_status }));
      setStep(6);
    } catch (err) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
      setLoading(false);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = `Step ${Math.min(step + 1, 5)} of 5`;

  return (
    <AuthLayout
      icon={Radio}
      title="Radio & Programmer Verification"
      subtitle="Professional radio access application — The Mainstream Frequency™"
      footer={
        <Link to="/register" className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to account types
        </Link>
      }
    >
      <div className="mb-5 p-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground leading-relaxed">
        Radio and digital programmer accounts require professional verification. Terrestrial stations may be verified
        through applicable broadcasting authorities and public station records. Internet stations must demonstrate an
        active public web identity, working broadcast presence, and independent supporting evidence. Platform AI may
        gather, compare, score, and flag verification evidence, but final approval remains subject to authorized human review.
      </div>

      {step < 5 && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{stepLabel}</span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / 5) * 100}%` }} />
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="space-y-3">
          <Label>Radio account type</Label>
          {STATION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set('station_type', t.value)}
              className={`w-full text-left rounded-xl border p-3 transition-all ${
                form.station_type === t.value
                  ? 'border-neon-blue/50 bg-neon-blue/10 ring-1 ring-primary/40'
                  : 'border-border bg-card/50 hover:border-primary/30'
              }`}
            >
              <div className="font-medium text-foreground">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.hint}</div>
            </button>
          ))}
          <Button className="w-full h-12 mt-2" disabled={!canAdvance()} onClick={() => setStep(1)}>
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Official station name" required value={form.official_station_name} onChange={(v) => set('official_station_name', v)} />
          <Field label="Official call sign or identifier" hint="Radio Call Sign — FCC/national call sign, licensed name, or official internet station name" value={form.official_station_identifier} onChange={(v) => set('official_station_identifier', v)} />
          {form.station_type === 'terrestrial_radio' && (
            <SelectField label="Terrestrial subtype" value={form.terrestrial_subtype} onChange={(v) => set('terrestrial_subtype', v)} options={TERRESTRIAL_SUBTYPES} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Band" value={form.band} onChange={(v) => set('band', v)} options={BANDS} />
            <Field label="Frequency (e.g. 101.5)" value={form.frequency} onChange={(v) => set('frequency', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country" value={form.country} onChange={(v) => set('country', v)} />
            <Field label="State / Province / Region" value={form.region} onChange={(v) => set('region', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City / Market" value={form.city} onChange={(v) => set('city', v)} />
            <Field label="Time zone" value={form.time_zone} onChange={(v) => set('time_zone', v)} />
          </div>
          <Field label="Language" value={form.language} onChange={(v) => set('language', v)} />
          <Field label="Genres programmed (comma separated)" value={form.genres_programmed} onChange={(v) => set('genres_programmed', v)} />
          <Field label="Official website" value={form.website} onChange={(v) => set('website', v)} placeholder="https://" />
          <Field label="Live-stream URL" value={form.stream_url} onChange={(v) => set('stream_url', v)} placeholder="https://" />
          <Field label="Public schedule URL" value={form.schedule_url} onChange={(v) => set('schedule_url', v)} placeholder="https://" />
          <TextareaField label="Station description" value={form.station_description} onChange={(v) => set('station_description', v)} />
          <StepNav onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!canAdvance()} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Full legal name" required value={form.applicant_full_name} onChange={(v) => set('applicant_full_name', v)} />
          <Field label="Professional title" value={form.applicant_title} onChange={(v) => set('applicant_title', v)} />
          <SelectField label="Station role" value={form.applicant_station_role} onChange={(v) => set('applicant_station_role', v)} options={ROLES} />
          <Field label="Work email" required hint="Official station-domain email preferred (e.g. you@station.com)" value={form.applicant_work_email} onChange={(v) => set('applicant_work_email', v)} type="email" />
          <Field label="Work phone" value={form.applicant_work_phone} onChange={(v) => set('applicant_work_phone', v)} />
          <Field label="Department" value={form.applicant_department} onChange={(v) => set('applicant_department', v)} />
          <Field label="Manager or supervisor name" value={form.applicant_manager_name} onChange={(v) => set('applicant_manager_name', v)} />
          <Field label="LinkedIn / professional page" value={form.applicant_linkedin} onChange={(v) => set('applicant_linkedin', v)} placeholder="https://" />
          <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!canAdvance()} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Field label="License holder / operator" value={form.license_holder} onChange={(v) => set('license_holder', v)} />
          <Field label="Parent company" value={form.parent_company} onChange={(v) => set('parent_company', v)} />
          <Field label="Network affiliation" value={form.network_affiliation} onChange={(v) => set('network_affiliation', v)} />
          <Field label="Ownership type" value={form.ownership_type} onChange={(v) => set('ownership_type', v)} />
          <Field label="Government license number" hint="When applicable" value={form.government_license_number} onChange={(v) => set('government_license_number', v)} />
          <Field label="Regulator" hint="e.g. FCC, CRTC, Ofcom, ACMA" value={form.regulator} onChange={(v) => set('regulator', v)} />
          <Field label="License expiration date" value={form.license_expiration_date} onChange={(v) => set('license_expiration_date', v)} type="date" />
          <StepNav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Review & submit</h3>
          <p className="text-sm text-muted-foreground">
            Confirm the details below. After submission, our AI verification will assess public records, your website,
            email domain, stream activity, and public listings, then route the application to a human reviewer for final approval.
          </p>
          <ReviewBlock title="Station" data={{
            'Name': form.official_station_name,
            'Identifier': form.official_station_identifier,
            'Type': form.station_type,
            'Band': form.band,
            'Frequency': form.frequency,
            'Location': [form.city, form.region, form.country].filter(Boolean).join(', '),
            'Website': form.website,
          }} />
          <ReviewBlock title="Applicant" data={{
            'Name': form.applicant_full_name,
            'Role': form.applicant_station_role,
            'Work email': form.applicant_work_email,
          }} />
          <ReviewBlock title="Organization" data={{
            'License holder': form.license_holder,
            'Regulator': form.regulator,
            'License #': form.government_license_number,
          }} />
          <StepNav onBack={() => setStep(3)} onNext={handleSubmit} nextLabel="Submit application" nextDisabled={loading} />
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col items-center py-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="font-medium">Submitting application…</p>
          <p className="text-sm text-muted-foreground mt-1">Running AI verification against public records</p>
        </div>
      )}

      {step === 6 && aiResult && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-lg font-medium text-foreground">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Application received
          </div>
          <ScoreCard score={aiResult.score} risk={aiResult.risk_level} />
          {aiResult.flags?.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                <AlertTriangle className="w-4 h-4" /> AI flags
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                {aiResult.flags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{aiResult.summary}</p>
          <div className="rounded-lg bg-secondary/50 border border-border p-4 text-sm">
            <div className="font-medium text-foreground mb-1">Status: {form._verification_status?.replace(/_/g, ' ')}</div>
            <p className="text-muted-foreground">
              A human reviewer will make the final verification decision. You'll be notified when your application is
              approved, rejected, or if more information is needed. Your public ^handle will be assigned upon approval.
            </p>
          </div>
          <Button className="w-full h-12" onClick={() => navigate('/radio-programmer-dashboard')}>
            Go to radio dashboard
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}

function Field({ label, value, onChange, required, hint, placeholder, type = 'text' }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11" />
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
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    </div>
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

function ScoreCard({ score, risk }) {
  const tier = score >= 85 ? 'Strong match' : score >= 70 ? 'Likely legitimate' : score >= 50 ? 'Insufficient evidence' : 'High risk';
  const color = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-destructive';
  return (
    <div className="rounded-lg border border-border p-4 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">AI confidence score</div>
      <div className={`text-4xl font-bold mt-1 ${color}`}>{score}<span className="text-lg text-muted-foreground">/100</span></div>
      <div className={`text-sm font-medium ${color}`}>{tier}</div>
      <div className="text-xs text-muted-foreground mt-1">Risk level: {risk}</div>
    </div>
  );
}