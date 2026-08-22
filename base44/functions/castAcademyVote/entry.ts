import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // Look up AcademyMember
    const members = await base44.asServiceRole.entities.AcademyMember.filter(
      { user_id: user.id }, '-applied_date', 1
    );
    const member = members[0];
    if (!member) return Response.json({ error: 'Academy membership not found' }, { status: 403 });
    if (member.application_status !== 'approved' || member.membership_status !== 'active') {
      return Response.json({ error: 'Membership not active' }, { status: 403 });
    }

    const currentYear = new Date().getFullYear();

    // ─── Cast a vote ───
    if (action === 'cast_vote') {
      const { category_id, nominee_id, vote_rank, voting_phase, conflict_disclosed } = body;

      if (!category_id || !nominee_id || !voting_phase) {
        return Response.json({ error: 'Missing required fields: category_id, nominee_id, voting_phase' }, { status: 400 });
      }

      // Get category
      const categories = await base44.asServiceRole.entities.AwardsCategory.filter(
        { id: category_id }, '-year', 1
      );
      const category = categories[0];
      if (!category) return Response.json({ error: 'Category not found' }, { status: 404 });

      // Phase must be open
      if (category.voting_phase !== 'nomination' && category.voting_phase !== 'final_voting') {
        return Response.json({ error: 'Voting is not open for this category' }, { status: 400 });
      }

      // Phase must match
      if (category.voting_phase !== voting_phase) {
        return Response.json({ error: `This category is in ${category.voting_phase} phase` }, { status: 400 });
      }

      // Final voting requires council membership
      if (voting_phase === 'final_voting' && !member.is_voting_council) {
        return Response.json({ error: 'Only Final Voting Council members can vote in final voting' }, { status: 403 });
      }

      // Nominee must exist in this category
      const nominees = await base44.asServiceRole.entities.AwardsNominee.filter(
        { id: nominee_id, category_id }, '-year', 1
      );
      const nominee = nominees[0];
      if (!nominee) return Response.json({ error: 'Nominee not found in this category' }, { status: 404 });

      // Check for existing votes
      // Nomination: one vote per category. Final voting: up to 3 ranked votes.
      const existingVotes = await base44.asServiceRole.entities.AwardsVote.filter(
        { voter_user_id: user.id, category_id, voting_phase, voting_cycle: currentYear },
        '-voted_date', 10
      );

      if (voting_phase === 'nomination' && existingVotes.length > 0) {
        return Response.json({ error: 'You have already voted in this category' }, { status: 409 });
      }

      if (voting_phase === 'final_voting') {
        if (existingVotes.length >= 3) {
          return Response.json({ error: 'You have already submitted all ranked votes for this category' }, { status: 409 });
        }
        const submittedRank = vote_rank || (existingVotes.length + 1);
        if (existingVotes.some(v => v.vote_rank === submittedRank)) {
          return Response.json({ error: `Rank ${submittedRank} already submitted for this category` }, { status: 409 });
        }
      }

      // Create the vote
      const vote = await base44.asServiceRole.entities.AwardsVote.create({
        voter_user_id: user.id,
        voter_name: member.applicant_name,
        category_id,
        category_name: category.name,
        nominee_id,
        nominee_name: nominee.nominee_name,
        vote_rank: voting_phase === 'final_voting' ? (vote_rank || (existingVotes.length + 1)) : 1,
        voting_phase,
        voting_cycle: currentYear,
        voted_date: new Date().toISOString(),
        conflict_disclosed: conflict_disclosed || false,
      });

      // Increment nominee vote count
      await base44.asServiceRole.entities.AwardsNominee.update(nominee_id, {
        votes_count: (nominee.votes_count || 0) + 1,
      });

      // Update member participation stats
      await base44.asServiceRole.entities.AcademyMember.update(member.id, {
        votes_cast: (member.votes_cast || 0) + 1,
        votes_current_cycle: (member.votes_current_cycle || 0) + 1,
        last_active_date: new Date().toISOString(),
      });

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_name: member.applicant_name,
        user_email: member.applicant_email,
        user_role: 'admin',
        action: 'academy_vote_cast',
        action_category: 'admin',
        entity_type: 'AwardsVote',
        entity_id: vote.id,
        details: `Voted in "${category.name}" (${voting_phase}) for ${nominee.nominee_name}`,
        is_security_event: true,
        severity: 'info',
      });

      return Response.json({ success: true, vote_id: vote.id });
    }

    // ─── Cast ranked votes (final voting phase — up to 3 picks) ───
    if (action === 'cast_ranked_votes') {
      const { category_id, selections, conflict_disclosed } = body;

      if (!category_id || !selections || !Array.isArray(selections)) {
        return Response.json({ error: 'Missing category_id or selections' }, { status: 400 });
      }

      const categories = await base44.asServiceRole.entities.AwardsCategory.filter(
        { id: category_id }, '-year', 1
      );
      const category = categories[0];
      if (!category) return Response.json({ error: 'Category not found' }, { status: 404 });

      if (category.voting_phase !== 'final_voting') {
        return Response.json({ error: 'Ranked voting is only available during final voting' }, { status: 400 });
      }

      if (!member.is_voting_council) {
        return Response.json({ error: 'Only Final Voting Council members can vote in final voting' }, { status: 403 });
      }

      const existingVotes = await base44.asServiceRole.entities.AwardsVote.filter(
        { voter_user_id: user.id, category_id, voting_phase: 'final_voting', voting_cycle: currentYear },
        '-voted_date', 10
      );
      if (existingVotes.length > 0) {
        return Response.json({ error: 'You have already voted in this category' }, { status: 409 });
      }

      const validSelections = selections.filter(s => s.nominee_id && s.vote_rank);
      if (validSelections.length === 0) {
        return Response.json({ error: 'No valid selections provided' }, { status: 400 });
      }
      if (validSelections.length > 3) {
        return Response.json({ error: 'Maximum 3 ranked selections allowed' }, { status: 400 });
      }

      const nomineeIds = validSelections.map(s => s.nominee_id);
      if (new Set(nomineeIds).size !== nomineeIds.length) {
        return Response.json({ error: 'Cannot select the same nominee for multiple ranks' }, { status: 400 });
      }

      const createdVotes = [];
      for (const sel of validSelections) {
        const nominees = await base44.asServiceRole.entities.AwardsNominee.filter(
          { id: sel.nominee_id, category_id }, '-year', 1
        );
        const nominee = nominees[0];
        if (!nominee) return Response.json({ error: 'Nominee not found in this category' }, { status: 404 });

        const vote = await base44.asServiceRole.entities.AwardsVote.create({
          voter_user_id: user.id,
          voter_name: member.applicant_name,
          category_id,
          category_name: category.name,
          nominee_id: sel.nominee_id,
          nominee_name: nominee.nominee_name,
          vote_rank: sel.vote_rank,
          voting_phase: 'final_voting',
          voting_cycle: currentYear,
          voted_date: new Date().toISOString(),
          conflict_disclosed: conflict_disclosed || false,
        });

        await base44.asServiceRole.entities.AwardsNominee.update(sel.nominee_id, {
          votes_count: (nominee.votes_count || 0) + 1,
        });
        createdVotes.push(vote);
      }

      await base44.asServiceRole.entities.AcademyMember.update(member.id, {
        votes_cast: (member.votes_cast || 0) + createdVotes.length,
        votes_current_cycle: (member.votes_current_cycle || 0) + createdVotes.length,
        last_active_date: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_name: member.applicant_name,
        user_email: member.applicant_email,
        user_role: 'admin',
        action: 'academy_ranked_vote_cast',
        action_category: 'admin',
        entity_type: 'AwardsVote',
        entity_id: createdVotes[0]?.id,
        details: `Cast ${createdVotes.length} ranked votes in "${category.name}" (final voting)`,
        is_security_event: true,
        severity: 'info',
      });

      return Response.json({ success: true, votes_created: createdVotes.length });
    }

    // ─── Create a nominee (admin-only, enforces max_nominees limit) ───
    if (action === 'create_nominee') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required to create nominees' }, { status: 403 });
      }

      const { category_id, nominee_name, nominee_type, nomination_reason, artist_profile_id, song_id, release_id, community_id, cover_image } = body;

      if (!category_id || !nominee_name || !nominee_type) {
        return Response.json({ error: 'Missing required fields: category_id, nominee_name, nominee_type' }, { status: 400 });
      }

      const categories = await base44.asServiceRole.entities.AwardsCategory.filter(
        { id: category_id }, '-year', 1
      );
      const category = categories[0];
      if (!category) return Response.json({ error: 'Category not found' }, { status: 404 });

      const maxNominees = category.max_nominees || 5;
      const existingNominees = await base44.asServiceRole.entities.AwardsNominee.filter(
        { category_id }, '-year', 100
      );
      if (existingNominees.length >= maxNominees) {
        return Response.json({ error: `This category already has the maximum of ${maxNominees} nominees` }, { status: 400 });
      }

      const nominee = await base44.asServiceRole.entities.AwardsNominee.create({
        category_id,
        category_name: category.name,
        nominee_name,
        nominee_type,
        artist_profile_id: artist_profile_id || null,
        song_id: song_id || null,
        release_id: release_id || null,
        community_id: community_id || null,
        nomination_reason: nomination_reason || '',
        status: 'nominated',
        year: category.year || currentYear,
        votes_count: 0,
        cover_image: cover_image || null,
      });

      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_name: member.applicant_name,
        user_email: member.applicant_email,
        user_role: 'admin',
        action: 'academy_nominee_created',
        action_category: 'admin',
        entity_type: 'AwardsNominee',
        entity_id: nominee.id,
        details: `Added nominee "${nominee_name}" to "${category.name}" (${existingNominees.length + 1}/${maxNominees})`,
        severity: 'info',
      });

      return Response.json({ success: true, nominee_id: nominee.id, current_count: existingNominees.length + 1, max_nominees: maxNominees });
    }

    // ─── Get my votes for this cycle ───
    if (action === 'get_my_votes') {
      const votes = await base44.asServiceRole.entities.AwardsVote.filter(
        { voter_user_id: user.id, voting_cycle: currentYear },
        '-voted_date', 200
      );
      return Response.json({ votes });
    }

    // ─── Get live tally for a category (admin-only) ───
    if (action === 'get_category_tally') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required for tallies' }, { status: 403 });
      }
      const { category_id } = body;
      if (!category_id) return Response.json({ error: 'category_id required' }, { status: 400 });

      const votes = await base44.asServiceRole.entities.AwardsVote.filter(
        { category_id, voting_cycle: currentYear },
        '-voted_date', 500
      );
      const tally = {};
      votes.forEach(v => {
        tally[v.nominee_id] = (tally[v.nominee_id] || 0) + 1;
      });
      return Response.json({ tally, total_votes: votes.length });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('castAcademyVote error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});