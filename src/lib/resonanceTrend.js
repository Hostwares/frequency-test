// Builds a monthly Resonance Score trajectory from community engagement signals
// (supporters gained, song ratings received). The most recent month is anchored
// to the artist's actual stored resonance_score so charts match the dashboard stat;
// earlier months are scaled proportionally to that month's engagement volume.

export const DEFAULT_MONTHS_BACK = 6;

export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export function buildResonanceTrajectory({
  supporters = [],
  ratings = [],
  currentResonanceScore = 0,
  monthsBack = DEFAULT_MONTHS_BACK,
}) {
  const now = new Date();
  const months = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: monthLabel(d), date: d });
  }

  // Count supporters active up to the end of each month
  const supportersByMonth = months.map((m) => {
    const endOfMonth = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0, 23, 59, 59);
    return supporters.filter((s) => {
      const created = new Date(s.created_date);
      return created <= endOfMonth && (s.is_active || s.is_recurring);
    }).length;
  });

  // Count ratings received within each month
  const ratingsByMonth = months.map((m) => {
    const start = new Date(m.date.getFullYear(), m.date.getMonth(), 1);
    const end = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 1);
    return ratings.filter((r) => {
      const created = new Date(r.created_date);
      return created >= start && created < end;
    }).length;
  });

  // Cumulative ratings as the secondary engagement signal
  let running = 0;
  const cumulativeRatings = ratingsByMonth.map((c) => (running += c));

  // Engagement index per month: weighted blend of active supporters and cumulative ratings
  const engagement = months.map((_, idx) => {
    const s = supportersByMonth[idx] || 0;
    const r = cumulativeRatings[idx] || 0;
    return s * 3 + r * 2;
  });

  const latestEngagement = engagement[engagement.length - 1] || 0;

  // Anchor latest month to the actual stored resonance score; scale others proportionally.
  // If no engagement yet, show a flat line at the current score.
  const anchored =
    latestEngagement > 0 && currentResonanceScore > 0
      ? engagement.map((e) => Math.round((e / latestEngagement) * currentResonanceScore))
      : months.map(() => currentResonanceScore || 0);

  return months.map((m, idx) => ({
    month: m.label,
    month_key: m.key,
    resonance_score: anchored[idx],
    active_supporters: supportersByMonth[idx],
    new_ratings: ratingsByMonth[idx],
  }));
}