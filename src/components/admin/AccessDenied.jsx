import React from 'react';
import { Shield, Lock } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

export default function AccessDenied({ message, icon: Icon = Lock }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <GlassCard hover={false} className="p-8 md:p-12 max-w-md text-center border-destructive/20">
        <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg font-display font-bold mb-2">Access Restricted</h2>
        <p className="text-sm text-muted-foreground">
          {message || 'You do not have permission to access this area. Contact the Master Admin if you believe this is an error.'}
        </p>
      </GlassCard>
    </div>
  );
}