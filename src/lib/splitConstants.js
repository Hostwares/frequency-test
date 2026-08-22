// Shared constants for the Artist Revenue Split Manager™
// Used by both the artist dashboard UI and backend distribution engine

export const SPLIT_TYPES = [
  { value: 'artist_default', label: 'Artist Default Split', priority: 4, description: 'Automatically applies to all future releases unless overridden' },
  { value: 'album', label: 'Album Split', priority: 3, description: 'Applies to every song on a selected album. Overrides Artist Default.' },
  { value: 'single', label: 'Single Split', priority: 2, description: 'Applies only to one single release. Overrides Artist Default and Album Split.' },
  { value: 'song', label: 'Song Split', priority: 1, description: 'Applies to one individual song. Highest priority.' },
];

export const ASSIGNMENT_TYPES = [
  { value: 'entire_account', label: 'Entire Artist Account' },
  { value: 'album', label: 'Album' },
  { value: 'ep', label: 'EP' },
  { value: 'single', label: 'Single' },
  { value: 'song', label: 'Song' },
];

export const COLLABORATOR_ROLES = [
  { value: 'lead_vocal', label: 'Lead Vocal' },
  { value: 'guitar', label: 'Guitar' },
  { value: 'bass', label: 'Bass' },
  { value: 'drums', label: 'Drums' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'producer', label: 'Producer' },
  { value: 'songwriter', label: 'Songwriter' },
  { value: 'composer', label: 'Composer' },
  { value: 'mixer', label: 'Mixer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'mastering_engineer', label: 'Mastering Engineer' },
  { value: 'featured_artist', label: 'Featured Artist' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'manager', label: 'Manager' },
  { value: 'business_partner', label: 'Business Partner' },
  { value: 'marketing', label: 'Marketing Partner' },
  { value: 'other', label: 'Other' },
];

export const REVENUE_SOURCES = [
  { value: 'fan_support', label: 'Fan Support Allocation' },
  { value: 'direct_support', label: 'Direct Artist Support' },
  { value: 'playlist_revenue', label: 'Playlist Revenue' },
  { value: 'network_revenue', label: 'Artist Network Revenue' },
  { value: 'community_rewards', label: 'Frequency Community Rewards' },
  { value: 'discovery_partner_bonus', label: 'Discovery Partner Bonuses' },
  { value: 'merchandise', label: 'Merchandise Sales' },
  { value: 'ticket_sales', label: 'Ticket Sales' },
  { value: 'marketplace', label: 'Marketplace Revenue' },
  { value: 'fan_tips', label: 'Fan Tips' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'other', label: 'Other Platform Revenue' },
];

export const SPLIT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export const PAYMENT_METHODS = [
  { value: 'frequency_wallet', label: 'Frequency Wallet' },
  { value: 'stripe_connect', label: 'Stripe Connect' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'ach', label: 'ACH (Future)' },
  { value: 'bank_transfer', label: 'Bank Transfer (Future)' },
  { value: 'manual', label: 'Manual Payment' },
];

export const TRANSPARENCY_MODES = [
  { value: 'summary', label: 'Summary', description: 'Number of collaborators only' },
  { value: 'percentages', label: 'Percentages', description: 'Display percentages without names' },
  { value: 'full', label: 'Full Transparency', description: 'Collaborator names, roles, and percentages' },
];

export const MAX_COLLABORATORS = 10;
export const PLATFORM_FEE_PERCENT = 2.5;

export function getRoleLabel(value) {
  return COLLABORATOR_ROLES.find(r => r.value === value)?.label || value;
}

export function getSourceLabel(value) {
  return REVENUE_SOURCES.find(s => s.value === value)?.label || value;
}

export function getSplitTypeLabel(value) {
  return SPLIT_TYPES.find(t => t.value === value)?.label || value;
}

export function getPaymentMethodLabel(value) {
  return PAYMENT_METHODS.find(p => p.value === value)?.label || value;
}

export function calculateTotalPercentage(collaborators) {
  if (!Array.isArray(collaborators)) return 0;
  return collaborators.reduce((sum, c) => sum + (Number(c.revenue_percentage) || 0), 0);
}

export function getPercentageStatus(total) {
  if (total === 100) return 'green';
  if (total < 100) return 'yellow';
  return 'red';
}