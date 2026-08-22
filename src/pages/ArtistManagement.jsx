import React from 'react';
import ArtistAccountManager from '@/components/admin/ArtistAccountManager';
import { Mic2 } from 'lucide-react';

export default function ArtistManagement() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Mic2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Artist Account Management</h1>
          <p className="text-sm text-muted-foreground">
            Create artist accounts and review completed profiles for verification. Fans and subscribers sign up on their own — no admin step needed.
          </p>
        </div>
      </div>
      <ArtistAccountManager />
    </div>
  );
}