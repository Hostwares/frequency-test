/**
 * Master Administrator enforcement — ensures only ONE primary master_admin
 * account exists initially, and provides the count check used by backend
 * functions and the admin UI when assigning the master_admin role.
 *
 * The limit is stored as a PlatformSetting record (key: master_admin_max_accounts)
 * so it can be raised later without a code change. Until such a setting exists,
 * the default of 1 is used.
 */

import { createClient } from "https://esm.sh/@base44/sdk@0.8.40";

const MASTER_ADMIN_MAX_SETTING_KEY = "master_admin_max_accounts";
const DEFAULT_MASTER_ADMIN_MAX = 1;

export async function getMasterAdminMax(): Promise<number> {
  const base44 = createClient();
  const settings = await base44.asServiceRole.entities.PlatformSetting.filter({
    key: MASTER_ADMIN_MAX_SETTING_KEY,
  });
  const val = settings?.[0]?.value;
  if (val !== undefined && val !== null) {
    const parsed = parseInt(String(val), 10);
    if (!isNaN(parsed) && parsed >= 1) return parsed;
  }
  return DEFAULT_MASTER_ADMIN_MAX;
}

/**
 * Count how many users currently hold the master_admin role.
 */
export async function countMasterAdmins(): Promise<number> {
  const base44 = createClient();
  const masterAdmins = await base44.asServiceRole.entities.User.filter({
    role: "master_admin",
  });
  return masterAdmins.length;
}

/**
 * Throws if assigning master_admin would exceed the one-account limit.
 * Pass the userId being assigned so we don't count them if they already
 * hold the role.
 */
export async function assertCanAssignMasterAdmin(userId: string): Promise<void> {
  const max = await getMasterAdminMax();
  const existing = await countMasterAdmins();

  // Check if this user is already a master_admin (don't double-count)
  const base44 = createClient();
  const target = await base44.asServiceRole.entities.User.filter({ id: userId });
  const isAlreadyMaster = target?.[0]?.role === "master_admin" ||
    (Array.isArray(target?.[0]?.admin_roles) && target[0].admin_roles.includes("master_admin"));

  const effectiveCount = isAlreadyMaster ? existing - 1 : existing;
  if (effectiveCount + 1 > max) {
    throw new Error(
      `Cannot assign master_admin: limit of ${max} primary master admin account(s) reached. ` +
      `Current count: ${existing}. Raise the limit via PlatformSetting "${MASTER_ADMIN_MAX_SETTING_KEY}" if additional master admins are needed.`
    );
  }
}