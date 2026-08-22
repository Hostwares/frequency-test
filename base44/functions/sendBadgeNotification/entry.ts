import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get the badge data from the automation trigger
    const { event, data, old_data } = await req.json();

    if (!data || !data.fan_user_id || !data.badge_type) {
      return Response.json({ error: 'Invalid badge data' }, { status: 400 });
    }

    const fanUserId = data.fan_user_id;
    const badgeType = data.badge_type;
    const badgeTier = data.badge_tier;
    const criteriaMet = data.criteria_met || {};

    // Get fan user details
    const fanUser = await base44.entities.User.get(fanUserId);
    if (!fanUser) {
      return Response.json({ error: 'Fan not found' }, { status: 404 });
    }

    // Define badge display names and messages
    const BADGE_CONFIG = {
      early_supporter: {
        name: 'Early Supporter',
        icon: '🌟',
        title: (tier) => `🌟 You've unlocked ${tier} Early Supporter!`,
        message: (tier) => `Thank you for believing in independent artists from the start. Your support makes a difference!`,
      },
      super_fan: {
        name: 'Super Fan',
        icon: '⭐',
        title: (tier) => `⭐ ${tier} Super Fan Unlocked!`,
        message: (tier) => `Congratulations! Your amazing support has earned you Super Fan status. Artists like you are why we do this!`,
      },
      mega_fan: {
        name: 'Mega Fan',
        icon: '🌟',
        title: (tier) => `🌟 You're a ${tier} Mega Fan!`,
        message: (tier) => `Your ${tier} level support is making a real difference for artists. You're incredible!`,
      },
      ultra_fan: {
        name: 'Ultra Fan',
        icon: '✨',
        title: (tier) => `✨ ${tier} Ultra Fan Status!`,
        message: (tier) => `Ultra Fan status unlocked! Your ${tier} tier support is absolutely incredible!`,
      },
      legendary_fan: {
        name: 'Legendary Fan',
        icon: '👑',
        title: (tier) => `👑 LEGENDARY ${tier} Fan!`,
        message: (tier) => `LEGENDARY! You've reached the ${tier} Legendary Fan tier - artists owe their success to fans like you!`,
      },
      loyal_patron: {
        name: 'Loyal Patron',
        icon: '💎',
        title: (tier) => `💎 ${tier} Loyal Patron`,
        message: (tier) => `Your loyalty is unmatched! You've earned the ${tier} Loyal Patron badge for consistent support.`,
      },
      fan_scout: {
        name: 'Fan Scout',
        icon: '🔍',
        title: (tier) => `🔍 ${tier} Fan Scout Badge!`,
        message: (tier) => `Great scouting! You've brought new fans to artists and earned the ${tier} Fan Scout badge.`,
      },
      referral_master: {
        name: 'Referral Master',
        icon: '🎯',
        title: (tier) => `🎯 ${tier} Referral Master`,
        message: (tier) => `You're a Referral Master! Your ${tier} level referrals are growing the music community.`,
      },
      referral_legend: {
        name: 'Referral Legend',
        icon: '🏆',
        title: (tier) => `🏆 REFERRAL LEGEND!`,
        message: (tier) => `LEGENDARY! Your referrals have earned you the ${tier} Referral Legend badge - you're a community builder!`,
      },
      genre_explorer: {
        name: 'Genre Explorer',
        icon: '🗺️',
        title: (tier) => `🗺️ ${tier} Genre Explorer`,
        message: (tier) => `You're exploring new sounds! The ${tier} Genre Explorer badge is yours for supporting diverse artists.`,
      },
      community_builder: {
        name: 'Community Builder',
        icon: '🏗️',
        title: (tier) => `🏗️ ${tier} Community Builder`,
        message: (tier) => `You're building the community! Earned the ${tier} Community Builder badge.`,
      },
      playlist_curator: {
        name: 'Playlist Curator',
        icon: '🎵',
        title: (tier) => `🎵 ${tier} Playlist Curator`,
        message: (tier) => `Your playlists are fire! You've earned the ${tier} Playlist Curator badge.`,
      },
      event_attendee: {
        name: 'Event Attendee',
        icon: '🎤',
        title: (tier) => `🎤 ${tier} Event Attendee`,
        message: (tier) => `You were there! The ${tier} Event Attendee badge recognizes your live music support.`,
      },
      first_supporter: {
        name: 'First Supporter',
        icon: '🥇',
        title: (tier) => `🥇 ${tier} First Supporter`,
        message: (tier) => `You were the first! This ${tier} First Supporter badge is special - thank you for being there from day one.`,
      },
      monthly_champion: {
        name: 'Monthly Champion',
        icon: '🏅',
        title: (tier) => `🏅 ${tier} Monthly Champion`,
        message: (tier) => `Champion status! You've earned the ${tier} Monthly Champion badge for your consistent support.`,
      },
    };

    const badgeInfo = BADGE_CONFIG[badgeType] || {
      name: badgeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: '🎉',
      title: (tier) => `🎉 ${tier} ${badgeType.replace(/_/g, ' ')} Badge!`,
      message: (tier) => `Congratulations! You've unlocked the ${tier} ${badgeType.replace(/_/g, ' ')} badge!`,
    };

    // Create in-app notification
    await base44.entities.FanNotification.create({
      fan_user_id: fanUserId,
      type: 'badge_unlocked',
      title: badgeInfo.title(badgeTier),
      body: badgeInfo.message(badgeTier),
      is_read: false,
    });

    // Send email notification
    try {
      const emailSubject = badgeInfo.title(badgeTier).replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const emailBody = `
Hey ${fanUser.full_name || 'Fan'}!

${badgeInfo.message(badgeTier)}

🎉 Badge Details:
• Badge: ${badgeInfo.name}
• Tier: ${badgeTier.charAt(0).toUpperCase() + badgeTier.slice(1)}
${criteriaMet.total_supported ? `• Total Supported: $${criteriaMet.total_supported.toFixed(2)}` : ''}
${criteriaMet.artists_supported ? `• Artists Supported: ${criteriaMet.artists_supported}` : ''}
${criteriaMet.referrals_count ? `• Referrals Made: ${criteriaMet.referrals_count}` : ''}
${criteriaMet.months_active ? `• Months Active: ${criteriaMet.months_active}` : ''}

Keep up the amazing work! Your support makes a real difference in the lives of independent artists.

With gratitude,
The Frequency Team

---
P.S. Check out your badge collection on your profile page!
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: fanUser.email,
        subject: emailSubject,
        body: emailBody,
      });

      console.log(`Email notification sent to ${fanUser.email} for badge ${badgeType}`);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the whole function if email fails - in-app notification is enough
    }

    return Response.json({
      success: true,
      message: `Notification sent for ${badgeType} badge to fan ${fanUserId}`,
      fanUserId,
      badgeType,
      badgeTier,
    });
  } catch (error) {
    console.error('Error sending badge notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});