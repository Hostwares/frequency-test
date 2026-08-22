import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const post = payload.data;
    if (!post) return Response.json({ skipped: true });

    // Only notify for fan posts (not artist's own posts)
    if (post.author_role === 'artist') {
      return Response.json({ skipped: 'artist post' });
    }

    // Get the council to find the artist
    const councils = await base44.asServiceRole.entities.FanCouncil.filter({ id: post.council_id });
    const council = councils[0];
    if (!council) return Response.json({ error: 'Council not found' }, { status: 404 });

    // Get the artist's user account
    const artistProfiles = await base44.asServiceRole.entities.ArtistProfile.filter({ id: council.artist_profile_id });
    const artistProfile = artistProfiles[0];
    if (!artistProfile || !artistProfile.user_id) {
      return Response.json({ skipped: 'no artist user_id' });
    }

    // Create an ArtistMessage as an inbox notification to the artist
    const postTypeLabel = {
      feedback: 'Feedback',
      question: 'Question',
      announcement: 'Announcement',
      poll: 'Poll',
    }[post.post_type] || 'Message';

    await base44.asServiceRole.entities.ArtistMessage.create({
      artist_profile_id: council.artist_profile_id,
      artist_name: council.artist_name,
      subject: `New ${postTypeLabel} in "${council.name}" Fan Council`,
      body: `**${post.author_name}** posted in your Fan Council:\n\n> ${post.content}`,
      recipient_type: 'all_supporters',
      read_by_fan_ids: [],
    });

    // Also send an email notification
    const users = await base44.asServiceRole.entities.User.filter({ id: artistProfile.user_id });
    const artistUser = users[0];
    if (artistUser?.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: artistUser.email,
        subject: `[Frequency] New ${postTypeLabel} in your Fan Council: "${council.name}"`,
        body: `Hi ${artistUser.full_name || 'there'},\n\n${post.author_name} just left ${postTypeLabel.toLowerCase()} in your Fan Council "${council.name}":\n\n"${post.content}"\n\nLog in to Frequency to respond and keep the conversation going.\n\n— The Frequency Team`,
      });
    }

    return Response.json({ success: true, council: council.name, author: post.author_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});