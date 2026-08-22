import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_CONFIG = { beta_mode_enabled: false, beta_banners_enabled: true };

export function useBetaConfig() {
  const { data, isLoading } = useQuery({
    queryKey: ['beta-configuration'],
    queryFn: async () => {
      const records = await base44.entities.BetaConfiguration.list('-created_date', 1);
      return records?.[0] || null;
    },
    staleTime: 30000,
  });

  const config = data || DEFAULT_CONFIG;
  return { config, isLoading, hasConfig: !!data };
}