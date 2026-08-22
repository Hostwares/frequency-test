// Public-facing role labels and per-role verification flag lookups.
// Each public role is independently assignable and independently verifiable;
// this module centralises the display label and the verification_status
// flag name used to render the account's current role + verification state.

export const ROLE_LABELS = {
  fan: 'Fan',
  artist: 'Artist',
  frequency_community: 'Frequency Community',
  discovery_partner: 'Discovery Partner',
  radio_programmer: 'Radio Programmer',
  business_partner: 'Business Partner',
  professional_consultant: 'Professional Consultant',
  community_manager: 'Community Manager',
  admin: 'Admin',
  master_admin: 'Master Admin',
  admin_partner: 'Admin Partner',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || 'Fan';
}

// Maps each public role to its boolean flag inside User.verification_status.
export const ROLE_VERIFICATION_FLAG = {
  fan: 'fan_verified',
  artist: 'artist_verified',
  frequency_community: 'frequency_community_verified',
  discovery_partner: 'discovery_partner_verified',
  radio_programmer: 'radio_verified',
  business_partner: 'business_verified',
  professional_consultant: 'professional_consultant_verified',
};

export function isRoleVerified(user, role) {
  const flag = ROLE_VERIFICATION_FLAG[role];
  if (!flag) return false;
  return !!(user?.verification_status && user.verification_status[flag]);
}