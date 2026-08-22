import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MILESTONES = [
  // --- Artist count milestones ---
  { type: 'first_support', threshold: 1, category: 'artists',
    title: '🎵 Your journey begins!',
    body: 'You just supported your first artist. Every great movement starts with a single note.' },
  { type: 'artists_3', threshold: 3, category: 'artists',
    title: '🎶 Harmony unlocked!',
    body: 'You\'re now supporting 3 artists — you\'re building a real connection with the music community.' },
  { type: 'artists_5', threshold: 5, category: 'artists',
    title: '🎧 Top Listener status!',
    body: '5 artists supported! Your diverse taste is helping independent music thrive.' },
  { type: 'artists_10', threshold: 10, category: 'artists',
    title: '🌟 Dedicated Fan!',
    body: '10 artists! You\'re a true champion of independent music discovery.' },

  // --- Total support amount milestones ---
  { type: 'total_10', threshold: 10, category: 'total',
    title: '💜 $10 in lifetime support!',
    body: 'You\'ve contributed $10 to artists. That\'s real, tangible impact.' },
  { type: 'total_50', threshold: 50, category: 'total',
    title: '⚡ $50 milestone reached!',
    body: 'You\'ve now supported artists with $50 total. You\'re making a difference!' },
  { type: 'total_100', threshold: 100, category: 'total',
    title: '🏆 $100 Super Supporter!',
    body: 'Incredible! You\'ve reached $100 in lifetime support. Artists are lucky to have you.' },
  { type: 'total_250', threshold: 250, category: 'total',
    title: '💎 $250 Patron milestone!',
    body: 'You\'ve reached $250 in lifetime support — you\'re a true Patron of the Arts.' },
  { type: 'total_500', threshold: 500, category: 'total',
    title: '👑 $500 Legendary status!',
    body: 'Legendary! $500 in lifetime support places you among the most dedicated fans on the platform.' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Triggered by entity automation on SupportAllocation create
    const allocation = payload.data;
    if (!allocation || !allocation.fan_user_id) {
      return Response.json({ skipped: 'no allocation data' });
    }

    const fanId = allocation.fan_user_id;

    // Fetch all active allocations for this fan to compute stats
    const allAllocations = await base44.asServiceRole.entities.SupportAllocation.filter({
      fan_user_id: fanId,
      is_active: true,
    });

    const artistSet = new Set();
    let totalSupport = 0;
    allAllocations.forEach(a => {
      artistSet.add(a.artist_profile_id);
      totalSupport += a.amount || 0;
    });

    const artistCount = artistSet.size;

    // Check which milestone notifications already exist for this fan
    const existingNotifs = await base44.asServiceRole.entities.FanNotification.filter({
      fan_user_id: fanId,
      type: 'fan_milestone',
    });
    const existingMilestoneTypes = new Set(existingNotifs.map(n => n.milestone_type));

    // Determine which milestones were just crossed
    const newMilestones = MILESTONES.filter(m => {
      const value = m.category === 'artists' ? artistCount : totalSupport;
      return value >= m.threshold && !existingMilestoneTypes.has(m.type);
    });

    if (newMilestones.length === 0) {
      return Response.json({ success: true, milestones: 0, message: 'No new milestones' });
    }

    // Create a notification for each newly-crossed milestone
    const created = await Promise.all(
      newMilestones.map(m =>
        base44.asServiceRole.entities.FanNotification.create({
          fan_user_id: fanId,
          type: 'fan_milestone',
          title: m.title,
          body: m.body,
          milestone_type: m.type,
          is_read: false,
        })
      )
    );

    return Response.json({
      success: true,
      milestones: created.length,
      fanId,
      artistCount,
      totalSupport,
      triggered: newMilestones.map(m => m.type),
    });
  } catch (error) {
    console.error('Error checking fan milestones:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});