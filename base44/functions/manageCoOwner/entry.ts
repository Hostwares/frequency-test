import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  getCoOwnerMax,
  countCoOwners,
  assertCanAssignCoOwner,
  validateCoOwnerScope,
  permissionsForScopeAreas,
  scopeAreasFromPermissions,
  CO_OWNER_SCOPE_AREAS,
  ALL_SCOPE_AREA_KEYS,
} from "../../shared/coOwnerEnforcement.ts";

/**
 * Platform Co-Owner management — a backend function that enforces the 6-account
 * limit and ensures each co-owner's permission scope is individually assigned.
 *
 * Actions:
 *   list           — Return all co-owner accounts with their current scope.
 *   assign         — Assign the co_owner role + a custom scope to a user.
 *                    Master Administrator only. Enforces the account limit.
 *   update_scope   — Update an existing co-owner's permission scope.
 *                    Master Administrator only.
 *   revoke         — Remove the co_owner role (and co-owner-scoped permissions)
 *                    from a user. Master Administrator only.
 */

function getClientInfo(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}

async function logAudit(
  base44: any,
  actor: any,
  action: string,
  targetUserId: string,
  targetName: string,
  details: string,
  clientInfo: { ip: string; userAgent: string },
  metadata?: Record<string, unknown>
) {
  await base44.asServiceRole.entities.AuditLog.create({
    user_id: actor.id,
    user_name: actor.full_name || actor.email,
    user_email: actor.email,
    user_role: "master_admin",
    action,
    action_category: "security",
    entity_type: "User",
    entity_id: targetUserId,
    details: `Co-owner ${action} — ${targetName}: ${details}`,
    ip_address: clientInfo.ip,
    user_agent: clientInfo.userAgent,
    is_security_event: true,
    is_master_admin_action: true,
    severity: "critical",
    metadata: metadata || {},
  });
}

export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { action } = body;
    const base44 = createClientFromRequest(req);
    const clientInfo = getClientInfo(req);

    // ── LIST: Return all co-owner accounts ────────────────────────────────
    if (action === "list") {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

      const allUsers = await base44.asServiceRole.entities.User.filter({ admin_roles: "co_owner" });
      const max = await getCoOwnerMax(base44);
      const current = allUsers.length;

      const coOwners = allUsers.map((u: any) => {
        const perms = u.admin_permissions || [];
        const activeAreas = scopeAreasFromPermissions(perms);
        return {
          id: u.id,
          full_name: u.full_name || "",
          email: u.email,
          admin_permissions: perms,
          scope_areas: activeAreas,
          permissions_updated_by_name: u.admin_permissions_updated_by_name || "",
          permissions_updated_date: u.admin_permissions_updated_date || "",
        };
      });

      return Response.json({
        co_owners: coOwners,
        current_count: current,
        max_count: max,
        scope_areas: ALL_SCOPE_AREA_KEYS.map((k) => ({
          key: k,
          label: CO_OWNER_SCOPE_AREAS[k].label,
          description: CO_OWNER_SCOPE_AREAS[k].description,
          permission_keys: CO_OWNER_SCOPE_AREAS[k].permission_keys,
        })),
      });
    }

    // ── ASSIGN: Assign co_owner role + custom scope to a user ─────────────
    if (action === "assign") {
      const actor = await base44.auth.me();
      if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
      if (actor.role !== "master_admin") {
        return Response.json({ error: "Only the Master Administrator can assign co-owner accounts." }, { status: 403 });
      }

      const { target_user_id, scope_areas } = body;
      if (!target_user_id) {
        return Response.json({ error: "target_user_id is required." }, { status: 400 });
      }
      if (!Array.isArray(scope_areas) || scope_areas.length === 0) {
        return Response.json({ error: "At least one scope area must be assigned." }, { status: 400 });
      }

      // Enforce the 6-account limit
      await assertCanAssignCoOwner(base44, target_user_id);

      // Compute permissions from scope areas
      const permissions = permissionsForScopeAreas(scope_areas);
      if (permissions.length === 0) {
        return Response.json({ error: "Selected scope areas yielded no permissions." }, { status: 400 });
      }

      // Fetch target user
      const targetUsers = await base44.asServiceRole.entities.User.filter({ id: target_user_id });
      const target = targetUsers?.[0];
      if (!target) {
        return Response.json({ error: "Target user not found." }, { status: 404 });
      }

      const prevRoles = target.admin_roles || [];
      const prevPerms = target.admin_permissions || [];

      // Add co_owner to admin_roles (without duplicates), replace permissions with scope
      const newRoles = Array.from(new Set([...prevRoles, "co_owner"]));

      await base44.asServiceRole.entities.User.update(target_user_id, {
        admin_roles: newRoles,
        admin_permissions: permissions,
        admin_permissions_updated_by_id: actor.id,
        admin_permissions_updated_by_name: actor.full_name || actor.email,
        admin_permissions_updated_date: new Date().toISOString(),
      });

      await logAudit(
        base44, actor, "assign_co_owner",
        target_user_id, target.full_name || target.email,
        `Scope areas: ${scope_areas.join(", ")}`,
        clientInfo,
        { previous_roles: prevRoles, new_roles: newRoles, previous_permissions: prevPerms, new_permissions: permissions, scope_areas }
      );

      return Response.json({
        message: `Co-owner role assigned to ${target.full_name || target.email}.`,
        scope_areas,
        permissions,
        current_count: (await countCoOwners(base44)),
        max_count: await getCoOwnerMax(base44),
      });
    }

    // ── UPDATE_SCOPE: Update an existing co-owner's permission scope ──────
    if (action === "update_scope") {
      const actor = await base44.auth.me();
      if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
      if (actor.role !== "master_admin") {
        return Response.json({ error: "Only the Master Administrator can update co-owner scopes." }, { status: 403 });
      }

      const { target_user_id, scope_areas } = body;
      if (!target_user_id) {
        return Response.json({ error: "target_user_id is required." }, { status: 400 });
      }
      if (!Array.isArray(scope_areas) || scope_areas.length === 0) {
        return Response.json({ error: "At least one scope area must be assigned." }, { status: 400 });
      }

      const permissions = permissionsForScopeAreas(scope_areas);
      if (permissions.length === 0) {
        return Response.json({ error: "Selected scope areas yielded no permissions." }, { status: 400 });
      }

      // Validate no unrestricted / master-only keys slipped in
      const validation = validateCoOwnerScope(permissions);
      if (!validation.valid) {
        return Response.json({ error: `Invalid permissions for co-owner: ${validation.invalid.join(", ")}` }, { status: 400 });
      }

      const targetUsers = await base44.asServiceRole.entities.User.filter({ id: target_user_id });
      const target = targetUsers?.[0];
      if (!target) {
        return Response.json({ error: "Target user not found." }, { status: 404 });
      }

      const targetRoles = target.admin_roles || [];
      if (!targetRoles.includes("co_owner")) {
        return Response.json({ error: "This user is not a co-owner. Use the assign action first." }, { status: 400 });
      }

      const prevPerms = target.admin_permissions || [];

      await base44.asServiceRole.entities.User.update(target_user_id, {
        admin_permissions: permissions,
        admin_permissions_updated_by_id: actor.id,
        admin_permissions_updated_by_name: actor.full_name || actor.email,
        admin_permissions_updated_date: new Date().toISOString(),
      });

      await logAudit(
        base44, actor, "update_co_owner_scope",
        target_user_id, target.full_name || target.email,
        `New scope areas: ${scope_areas.join(", ")}`,
        clientInfo,
        { previous_permissions: prevPerms, new_permissions: permissions, scope_areas }
      );

      return Response.json({
        message: `Scope updated for ${target.full_name || target.email}.`,
        scope_areas,
        permissions,
      });
    }

    // ── REVOKE: Remove co_owner role from a user ──────────────────────────
    if (action === "revoke") {
      const actor = await base44.auth.me();
      if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
      if (actor.role !== "master_admin") {
        return Response.json({ error: "Only the Master Administrator can revoke co-owner access." }, { status: 403 });
      }

      const { target_user_id } = body;
      if (!target_user_id) {
        return Response.json({ error: "target_user_id is required." }, { status: 400 });
      }

      const targetUsers = await base44.asServiceRole.entities.User.filter({ id: target_user_id });
      const target = targetUsers?.[0];
      if (!target) {
        return Response.json({ error: "Target user not found." }, { status: 404 });
      }

      const prevRoles = target.admin_roles || [];
      const prevPerms = target.admin_permissions || [];
      const newRoles = prevRoles.filter((r: string) => r !== "co_owner");

      // Remove all co-owner-scoped permissions, keep any that aren't in the co-owner catalog
      await base44.asServiceRole.entities.User.update(target_user_id, {
        admin_roles: newRoles,
        admin_permissions: [],
        admin_permissions_updated_by_id: actor.id,
        admin_permissions_updated_by_name: actor.full_name || actor.email,
        admin_permissions_updated_date: new Date().toISOString(),
      });

      await logAudit(
        base44, actor, "revoke_co_owner",
        target_user_id, target.full_name || target.email,
        `Removed co_owner role and ${prevPerms.length} permission(s)`,
        clientInfo,
        { previous_roles: prevRoles, new_roles: newRoles, previous_permissions: prevPerms }
      );

      return Response.json({
        message: `Co-owner access revoked from ${target.full_name || target.email}.`,
        current_count: (await countCoOwners(base44)),
        max_count: await getCoOwnerMax(base44),
      });
    }

    return Response.json({ error: "Unknown action. Use: list, assign, update_scope, or revoke." }, { status: 400 });
  } catch (error) {
    console.error("manageCoOwner error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}