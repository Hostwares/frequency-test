import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, ShieldCheck, Loader2, Search, Lock, Crown, Save, Users } from 'lucide-react';
import {
  ADMIN_ROLE_KEYS, ADMIN_ROLES, PERMISSION_CATALOG, MASTER_ONLY_PERMISSIONS,
  defaultPermissionsForRole, isMasterAdmin,
} from '@/lib/staffRoles';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import CoOwnerManager from '@/components/admin/CoOwnerManager';

export default function StaffManagement() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [draftRoles, setDraftRoles] = useState([]);
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [dirty, setDirty] = useState(false);

  const { data: currentUser, isLoading: loadingMe } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['staff-users'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
  });

  const filtered = (users || []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const selected = (users || []).find((u) => u.id === selectedId);

  const selectUser = (u) => {
    setSelectedId(u.id);
    setDraftRoles([...(u.admin_roles || [])]);
    setDraftPermissions([...(u.admin_permissions || [])]);
    setDirty(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      const me = currentUser;
      const prevRoles = selected.admin_roles || [];
      const prevPerms = selected.admin_permissions || [];
      await base44.entities.User.update(selectedId, {
        admin_roles: draftRoles,
        admin_permissions: draftPermissions,
        admin_permissions_updated_by_id: me.id,
        admin_permissions_updated_by_name: me.full_name,
        admin_permissions_updated_date: new Date().toISOString(),
      });
      // Record in audit log
      const isMaster = isMasterAdmin(me);
      await base44.entities.AuditLog.create({
        user_id: me.id,
        user_name: me.full_name,
        user_email: me.email,
        user_role: isMaster ? 'master_admin' : 'admin',
        action: 'update_staff_permissions',
        action_category: 'security',
        entity_type: 'User',
        entity_id: selectedId,
        details: `Assigned admin roles/permissions to ${selected.full_name || selected.email}`,
        is_security_event: true,
        is_master_admin_action: isMaster,
        severity: 'critical',
        metadata: {
          target_user_id: selectedId,
          target_user_name: selected.full_name,
          previous_roles: prevRoles,
          new_roles: draftRoles,
          previous_permissions: prevPerms,
          new_permissions: draftPermissions,
        },
      });
    },
    onSuccess: () => {
      toast({ title: 'Permissions updated', description: 'Changes recorded in the audit log.' });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['staff-users'] });
    },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const toggleRole = (roleKey) => {
    setDirty(true);
    setDraftRoles((rs) => rs.includes(roleKey) ? rs.filter((r) => r !== roleKey) : [...rs, roleKey]);
    // Prefill that role's default permissions when assigning (Master can trim).
    setDraftPermissions((ps) => {
      const defaults = defaultPermissionsForRole(roleKey);
      if (draftRoles.includes(roleKey)) return ps; // removing: leave perms for manual cleanup
      return Array.from(new Set([...ps, ...defaults]));
    });
  };

  const togglePermission = (key) => {
    setDirty(true);
    setDraftPermissions((ps) => ps.includes(key) ? ps.filter((p) => p !== key) : [...ps, key]);
  };

  const resetToRoleDefaults = () => {
    setDirty(true);
    const combined = draftRoles.flatMap((r) => defaultPermissionsForRole(r));
    setDraftPermissions(Array.from(new Set(combined)));
  };

  const clearAll = () => {
    setDirty(true);
    setDraftPermissions([]);
    setDraftRoles([]);
  };

  if (loadingMe || loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isMasterAdmin(currentUser)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <Lock className="w-10 h-10 text-destructive mb-3" />
        <h2 className="text-xl font-bold">Master Administrator only</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Assigning and removing administrative permissions is restricted to the Platform Owner / Master Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Staff & Permissions</h1>
          <p className="text-sm text-muted-foreground">Internal administrative roles — one account may hold multiple roles; permissions granted separately and audit-logged.</p>
        </div>
      </div>

      {/* Co-Owner Management Section */}
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Platform Co-Owner Management</h2>
          <Badge variant="outline" className="text-xs">Up to 6 accounts · individually scoped</Badge>
        </div>
        <CoOwnerManager />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <Shield className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">All Staff & Permissions</h2>
          <p className="text-sm text-muted-foreground">Granular role and permission assignment for all staff accounts.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…" className="pl-9 h-10" />
          </div>
          <ScrollArea className="h-[70vh] pr-2">
            <div className="space-y-2">
              {filtered.map((u) => {
                const adminRoleCount = (u.admin_roles || []).length;
                return (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${selectedId === u.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground truncate">{u.full_name || 'Unnamed'}</span>
                      {isMasterAdmin(u) && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                      {adminRoleCount > 0 && <Badge variant="outline" className="text-[10px]">{adminRoleCount} role{adminRoleCount > 1 ? 's' : ''}</Badge>}
                    </div>
                    <span className="text-[11px] text-muted-foreground capitalize">{u.role?.replace(/_/g, ' ')}</span>
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No users found.</p>}
            </div>
          </ScrollArea>
        </div>

        <div>
          {!selected ? (
            <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
              Select a staff member to manage roles & permissions
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selected.full_name || 'Unnamed'}</h2>
                    <p className="text-sm text-muted-foreground">{selected.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Primary public role: <span className="capitalize">{selected.role?.replace(/_/g, ' ')}</span></p>
                  </div>
                  {isMasterAdmin(selected) ? (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Master Administrator</Badge>
                  ) : (
                    <Badge variant="outline">{(draftRoles || []).length} admin role(s)</Badge>
                  )}
                </div>
                {(selected.additional_roles || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(selected.additional_roles || []).map((r) => (
                      <Badge key={r} variant="outline" className="text-xs capitalize">{r.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {isMasterAdmin(selected) ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Master Administrator — unrestricted</div>
                    <p className="text-sm text-muted-foreground">This account holds all administrative permissions implicitly. Roles and permissions cannot be edited here.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border p-5">
                    <h3 className="font-medium text-foreground mb-3">Administrative roles</h3>
                    <p className="text-xs text-muted-foreground mb-4">Assigning a role prefills its default permissions. You may grant or remove individual permissions below — changes are audit-logged.</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {ADMIN_ROLE_KEYS.filter((r) => r !== 'master_admin').map((roleKey) => {
                        const role = ADMIN_ROLES[roleKey];
                        const active = draftRoles.includes(roleKey);
                        return (
                          <button
                            key={roleKey}
                            type="button"
                            onClick={() => toggleRole(roleKey)}
                            className={`text-left rounded-lg border p-3 transition-all ${active ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border hover:border-primary/30'}`}
                          >
                            <div className="flex items-center gap-2">
                              {active ? <ShieldCheck className="w-4 h-4 text-primary" /> : <Shield className="w-4 h-4 text-muted-foreground" />}
                              <span className="font-medium text-foreground text-sm">{role.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-snug">{role.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-foreground">Permissions</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={resetToRoleDefaults}>Reset to role defaults</Button>
                        <Button variant="outline" size="sm" onClick={clearAll}>Clear all</Button>
                      </div>
                    </div>
                    <div className="space-y-5">
                      {Object.entries(PERMISSION_CATALOG).map(([groupKey, group]) => (
                        <div key={groupKey}>
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{group.label}</div>
                          <div className="flex flex-wrap gap-2">
                            {group.keys.map((key) => {
                              const masterOnly = MASTER_ONLY_PERMISSIONS.includes(key);
                              const active = draftPermissions.includes(key);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  disabled={masterOnly}
                                  onClick={() => togglePermission(key)}
                                  className={`text-xs rounded-full border px-3 py-1.5 transition-all ${masterOnly ? 'opacity-40 cursor-not-allowed border-border bg-secondary text-muted-foreground' : active ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                                >
                                  {masterOnly && <Lock className="w-3 h-3 inline mr-1" />}
                                  {key.replace(/_/g, ' ')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                      {dirty ? 'Unsaved changes' : 'All changes saved'} · {draftPermissions.length} permission(s) · {draftRoles.length} role(s)
                    </p>
                    <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
                      {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save & audit-log
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}