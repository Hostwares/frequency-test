import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Crown, Loader2, Search, Users, ShieldCheck, X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { SCOPE_AREA_KEYS, CO_OWNER_SCOPE_AREAS, scopeAreasFromPermissions } from '@/lib/coOwnerScopes';

export default function CoOwnerManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [draftScopes, setDraftScopes] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignScopes, setAssignScopes] = useState([]);
  const [assignTargetId, setAssignTargetId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['co-owners'],
    queryFn: () => base44.functions.invoke('manageCoOwner', { action: 'list' }),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['staff-users'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
  });

  const coOwners = data?.co_owners || [];
  const currentCount = data?.current_count ?? 0;
  const maxCount = data?.max_count ?? 6;
  const scopeAreaDefs = data?.scope_areas || SCOPE_AREA_KEYS.map((k) => ({
    key: k,
    label: CO_OWNER_SCOPE_AREAS[k].label,
    description: CO_OWNER_SCOPE_AREAS[k].description,
    permission_keys: CO_OWNER_SCOPE_AREAS[k].permission_keys,
  }));

  const selected = coOwners.find((c) => c.id === selectedUserId);

  // Users that can be assigned (not already a co-owner, not a master_admin)
  const eligibleUsers = (allUsers || []).filter((u) => {
    const roles = u.admin_roles || [];
    return !roles.includes('co_owner') && u.role !== 'master_admin';
  });

  const filteredEligible = eligibleUsers.filter((u) => {
    if (!assignSearch) return true;
    const q = assignSearch.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const selectCoOwner = (c) => {
    setSelectedUserId(c.id);
    setDraftScopes([...(c.scope_areas || [])]);
    setDirty(false);
  };

  const toggleScope = (areaKey) => {
    setDirty(true);
    setDraftScopes((s) => s.includes(areaKey) ? s.filter((x) => x !== areaKey) : [...s, areaKey]);
  };

  const toggleAreaExpand = (areaKey) => {
    setExpandedAreas((e) => ({ ...e, [areaKey]: !e[areaKey] }));
  };

  const updateScope = useMutation({
    mutationFn: () =>
      base44.functions.invoke('manageCoOwner', {
        action: 'update_scope',
        target_user_id: selectedUserId,
        scope_areas: draftScopes,
      }),
    onSuccess: (res) => {
      toast({ title: 'Scope updated', description: res?.message || 'Co-owner scope updated.' });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['co-owners'] });
    },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const revoke = useMutation({
    mutationFn: () =>
      base44.functions.invoke('manageCoOwner', {
        action: 'revoke',
        target_user_id: selectedUserId,
      }),
    onSuccess: (res) => {
      toast({ title: 'Co-owner revoked', description: res?.message || 'Co-owner access removed.' });
      setSelectedUserId(null);
      qc.invalidateQueries({ queryKey: ['co-owners'] });
    },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const assignCoOwner = useMutation({
    mutationFn: () =>
      base44.functions.invoke('manageCoOwner', {
        action: 'assign',
        target_user_id: assignTargetId,
        scope_areas: assignScopes,
      }),
    onSuccess: (res) => {
      toast({ title: 'Co-owner assigned', description: res?.message || 'Co-owner role assigned.' });
      setShowAssignModal(false);
      setAssignTargetId(null);
      setAssignScopes([]);
      setAssignSearch('');
      qc.invalidateQueries({ queryKey: ['co-owners'] });
    },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const filteredCoOwners = coOwners.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const slotsRemaining = maxCount - currentCount;

  return (
    <div className="space-y-5">
      {/* Header with count */}
      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Platform Co-Owners</h3>
            <p className="text-xs text-muted-foreground">
              {currentCount} of {maxCount} accounts assigned · {slotsRemaining} slot{slotsRemaining !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={slotsRemaining <= 0}
          onClick={() => { setShowAssignModal(true); setAssignScopes([]); setAssignTargetId(null); }}
        >
          {slotsRemaining <= 0 ? 'Limit reached' : 'Assign Co-Owner'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-5">
        {/* Co-owner list */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search co-owners…" className="pl-9 h-9" />
          </div>
          <ScrollArea className="h-[50vh] pr-2">
            <div className="space-y-2">
              {filteredCoOwners.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCoOwner(c)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${selectedUserId === c.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground text-sm truncate">{c.full_name || 'Unnamed'}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{c.scope_areas?.length || 0}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.email}</p>
                </button>
              ))}
              {filteredCoOwners.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {coOwners.length === 0 ? 'No co-owners assigned yet.' : 'No matches.'}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Detail / scope editor */}
        <div>
          {!selected ? (
            <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
              {coOwners.length === 0 ? 'Assign a co-owner to get started.' : 'Select a co-owner to manage their scope.'}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4">
                <h4 className="font-medium text-foreground">{selected.full_name || 'Unnamed'}</h4>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
                {selected.permissions_updated_by_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated by {selected.permissions_updated_by_name}
                    {selected.permissions_updated_date && ` on ${new Date(selected.permissions_updated_date).toLocaleDateString()}`}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground text-sm">Permission Scope</h4>
                  <p className="text-xs text-muted-foreground">Each area is assigned independently</p>
                </div>
                <div className="space-y-2">
                  {SCOPE_AREA_KEYS.map((areaKey) => {
                    const area = CO_OWNER_SCOPE_AREAS[areaKey];
                    const active = draftScopes.includes(areaKey);
                    const expanded = expandedAreas[areaKey];
                    return (
                      <div key={areaKey} className={`rounded-lg border transition-all ${active ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                        <div className="flex items-start gap-2 p-3">
                          <button
                            onClick={() => toggleAreaExpand(areaKey)}
                            className="mt-0.5 text-muted-foreground hover:text-foreground shrink-0"
                          >
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => toggleScope(areaKey)}
                            className={`flex-1 text-left ${active ? '' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            <div className="flex items-center gap-2">
                              {active && <ShieldCheck className="w-4 h-4 text-primary shrink-0" />}
                              <span className={`text-sm font-medium ${active ? 'text-foreground' : ''}`}>{area.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{area.description}</p>
                          </button>
                          <button
                            onClick={() => toggleScope(areaKey)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${active ? 'border-primary bg-primary' : 'border-border'}`}
                          >
                            {active && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </button>
                        </div>
                        {expanded && (
                          <div className="px-3 pb-3 pl-10">
                            <div className="flex flex-wrap gap-1.5">
                              {area.permission_keys.map((p) => (
                                <Badge key={p} variant="outline" className="text-[10px] font-mono">
                                  {p.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  {dirty ? 'Unsaved changes' : 'All changes saved'} · {draftScopes.length} scope area(s)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate()}>
                    Revoke co-owner
                  </Button>
                  <Button size="sm" disabled={!dirty || updateScope.isPending} onClick={() => updateScope.mutate()}>
                    {updateScope.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Save scope
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">Assign Platform Co-Owner</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{slotsRemaining} of {maxCount} slots remaining</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Step 1: Select user */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">1. Select a user</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} placeholder="Search users…" className="pl-9 h-9" />
                </div>
                <ScrollArea className="h-40 border border-border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredEligible.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setAssignTargetId(u.id)}
                        className={`w-full text-left rounded-lg p-2 transition-all ${assignTargetId === u.id ? 'bg-primary/10 border border-primary/40' : 'hover:bg-secondary border border-transparent'}`}
                      >
                        <span className="text-sm font-medium text-foreground block">{u.full_name || 'Unnamed'}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </button>
                    ))}
                    {filteredEligible.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No eligible users found.</p>}
                  </div>
                </ScrollArea>
              </div>

              {/* Step 2: Select scope areas */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">2. Assign scope areas</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {SCOPE_AREA_KEYS.map((areaKey) => {
                    const area = CO_OWNER_SCOPE_AREAS[areaKey];
                    const active = assignScopes.includes(areaKey);
                    return (
                      <button
                        key={areaKey}
                        onClick={() => setAssignScopes((s) => s.includes(areaKey) ? s.filter((x) => x !== areaKey) : [...s, areaKey])}
                        className={`text-left rounded-lg border p-3 transition-all ${active ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'}`}
                      >
                        <div className="flex items-center gap-2">
                          {active && <ShieldCheck className="w-4 h-4 text-primary shrink-0" />}
                          <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{area.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">{area.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {assignTargetId ? 'User selected' : 'Select a user'} · {assignScopes.length} scope area(s)
              </p>
              <Button
                disabled={!assignTargetId || assignScopes.length === 0 || assignCoOwner.isPending}
                onClick={() => assignCoOwner.mutate()}
              >
                {assignCoOwner.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                Assign co-owner
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}