/**
 * Centralized support tier definitions.
 * Used by both the frontend (SupportArtistModal) and backend (createCheckout)
 * to prevent threshold drift.
 */
export const SUPPORT_TIERS = [
  { label: 'basic', min: 1, max: 2 },
  { label: 'supporter', min: 3, max: 7 },
  { label: 'champion', min: 8, max: 14 },
  { label: 'patron', min: 15, max: 999 },
];

export function getSupportTier(amount) {
  const num = Number(amount) || 0;
  return SUPPORT_TIERS.find(t => num >= t.min && num <= t.max)?.label || 'patron';
}