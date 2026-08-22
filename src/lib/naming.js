/**
 * Ensures a subscriber-chosen playlist/network name always ends with "Frequency".
 * Strips any existing trailing "frequency" (any casing) and appends a single " Frequency",
 * so the final name ends in "Frequency" regardless of what the subscriber types.
 */
export function ensureFrequencySuffix(rawName) {
  const trimmed = (rawName || '').trim();
  if (!trimmed) return '';
  const suffix = 'Frequency';
  const base = trimmed.replace(/\s*frequency\s*$/i, '').trim();
  return base ? `${base} ${suffix}` : suffix;
}