import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, ...params } = body;

    // GET_MY_COUNCILS — fetch councils where user is member or invited
    if (action === 'get_my_councils') {
      const all = await base44.entities.FanCouncil.filter({ is_active: true }, '-created_date', 100);
      const relevant = all.filter(c =>
        c.member_fan_ids?.includes(user.id) || c.invited_fan_ids?.includes(user.id)
      );
      return Response.json({ councils: relevant });
    }

    // ACCEPT_INVITE — move user from invited to member
    if (action === 'accept_invite') {
      const { council_id } = params;
      const councils = await base44.entities.FanCouncil.filter({ id: council_id });
      const council = councils[0];
      if (!council) return Response.json({ error: 'Council not found' }, { status: 404 });

      if (!council.invited_fan_ids?.includes(user.id)) {
        return Response.json({ error: 'No pending invite' }, { status: 403 });
      }

      const updated = await base44.entities.FanCouncil.update(council_id, {
        invited_fan_ids: (council.invited_fan_ids || []).filter(id => id !== user.id),
        member_fan_ids: [...new Set([...(council.member_fan_ids || []), user.id])],
      });
      return Response.json({ council: updated });
    }

    // POST_FEEDBACK — fan posts to council thread (must be a member)
    if (action === 'post_feedback') {
      const { council_id, content, post_type = 'feedback' } = params;
      const councils = await base44.entities.FanCouncil.filter({ id: council_id });
      const council = councils[0];
      if (!council) return Response.json({ error: 'Council not found' }, { status: 404 });

      if (!council.member_fan_ids?.includes(user.id)) {
        return Response.json({ error: 'Not a council member' }, { status: 403 });
      }

      const post = await base44.entities.CouncilPost.create({
        council_id,
        author_user_id: user.id,
        author_name: user.full_name || 'Fan',
        author_role: 'fan',
        content,
        post_type,
      });
      return Response.json({ post });
    }

    // UPVOTE — fan upvotes a post (once per user)
    if (action === 'upvote') {
      const { post_id } = params;
      const posts = await base44.entities.CouncilPost.filter({ id: post_id });
      const post = posts[0];
      if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

      if (post.upvoted_by?.includes(user.id)) {
        return Response.json({ error: 'Already upvoted' }, { status: 409 });
      }

      const updated = await base44.entities.CouncilPost.update(post_id, {
        upvotes: (post.upvotes || 0) + 1,
        upvoted_by: [...(post.upvoted_by || []), user.id],
      });
      return Response.json({ post: updated });
    }

    // ARTIST: CREATE_COUNCIL
    if (action === 'create_council') {
      const { artist_profile_id, artist_name, name, description } = params;
      const council = await base44.entities.FanCouncil.create({
        artist_profile_id,
        artist_name,
        name,
        description,
        member_fan_ids: [],
        invited_fan_ids: [],
        is_active: true,
      });
      return Response.json({ council });
    }

    // ARTIST: INVITE_FAN
    if (action === 'invite_fan') {
      const { council_id, fan_id } = params;
      const councils = await base44.entities.FanCouncil.filter({ id: council_id });
      const council = councils[0];
      if (!council) return Response.json({ error: 'Council not found' }, { status: 404 });

      const alreadyInvited = (council.invited_fan_ids || []).includes(fan_id);
      const alreadyMember = (council.member_fan_ids || []).includes(fan_id);
      if (alreadyInvited || alreadyMember) {
        return Response.json({ error: 'Fan already invited or is a member' }, { status: 409 });
      }

      const updated = await base44.entities.FanCouncil.update(council_id, {
        invited_fan_ids: [...(council.invited_fan_ids || []), fan_id],
      });
      return Response.json({ council: updated });
    }

    // ARTIST: REMOVE_MEMBER
    if (action === 'remove_member') {
      const { council_id, fan_id } = params;
      const councils = await base44.entities.FanCouncil.filter({ id: council_id });
      const council = councils[0];
      if (!council) return Response.json({ error: 'Council not found' }, { status: 404 });

      const updated = await base44.entities.FanCouncil.update(council_id, {
        member_fan_ids: (council.member_fan_ids || []).filter(id => id !== fan_id),
      });
      return Response.json({ council: updated });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});