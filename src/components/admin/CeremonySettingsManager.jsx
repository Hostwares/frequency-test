import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Trophy, Calendar, MapPin, Save, Loader2, CheckCircle2, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function CeremonySettingsManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dateInput, setDateInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => base44.entities.PlatformSetting.filter({}),
  });

  const dateSetting = settings.find(s => s.setting_key === 'awards_ceremony_date');
  const locationSetting = settings.find(s => s.setting_key === 'awards_ceremony_location');

  const ceremonyDate = dateSetting?.setting_value || 'July 2028';
  const ceremonyLocation = locationSetting?.setting_value || 'Sioux City, Iowa, USA';

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [];
      if (dateInput.trim()) {
        if (dateSetting) {
          updates.push(base44.entities.PlatformSetting.update(dateSetting.id, {
            setting_value: dateInput.trim(),
            updated_by_user_id: user.id,
            updated_by_name: user.full_name || user.email,
          }));
        } else {
          updates.push(base44.entities.PlatformSetting.create({
            setting_key: 'awards_ceremony_date',
            setting_value: dateInput.trim(),
            setting_type: 'string',
            description: 'My Life Awards ceremony date (e.g. "July 2028")',
            default_value: 'July 2028',
            updated_by_user_id: user.id,
            updated_by_name: user.full_name || user.email,
          }));
        }
      }
      if (locationInput.trim()) {
        if (locationSetting) {
          updates.push(base44.entities.PlatformSetting.update(locationSetting.id, {
            setting_value: locationInput.trim(),
            updated_by_user_id: user.id,
            updated_by_name: user.full_name || user.email,
          }));
        } else {
          updates.push(base44.entities.PlatformSetting.create({
            setting_key: 'awards_ceremony_location',
            setting_value: locationInput.trim(),
            setting_type: 'string',
            description: 'My Life Awards ceremony location (e.g. "Sioux City, Iowa, USA")',
            default_value: 'Sioux City, Iowa, USA',
            updated_by_user_id: user.id,
            updated_by_name: user.full_name || user.email,
          }));
        }
      }
      await Promise.all(updates);

      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: 'update_ceremony_settings',
        action_category: 'admin',
        entity_type: 'PlatformSetting',
        details: `Updated ceremony details — Date: ${dateInput || ceremonyDate}, Location: ${locationInput || ceremonyLocation}`,
        severity: 'info',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings'] });
      qc.invalidateQueries({ queryKey: ['ceremony-details'] });
      setDateInput('');
      setLocationInput('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <GlassCard hover={false} className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-display font-semibold">Awards Ceremony Settings</h3>
      </div>

      {/* Current values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 bg-secondary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3.5 h-3.5 text-neon-cyan" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Current Ceremony Date</p>
          </div>
          <p className="text-sm font-display font-semibold">{ceremonyDate}</p>
        </div>
        <div className="p-3 bg-secondary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-neon-magenta" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Current Location</p>
          </div>
          <p className="text-sm font-display font-semibold">{ceremonyLocation}</p>
        </div>
      </div>

      {/* Edit form */}
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">New Ceremony Date</label>
          <Input
            placeholder={ceremonyDate}
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">e.g. "July 2028", "July 15, 2028"</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">New Ceremony Location</label>
          <Input
            placeholder={ceremonyLocation}
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">e.g. "Sioux City, Iowa, USA"</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={saveMutation.isPending || (!dateInput.trim() && !locationInput.trim())}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Save Changes</>
            )}
          </Button>
          {saved && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-neon-turquoise" />
              <span className="text-xs text-neon-turquoise">Ceremony details updated</span>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}