import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, claim_id, split_id, song_id, resolution_notes, licensing_permission, territory_restrictions } = body;

    // ─── Claim Actions ──────────────────────────────────────────
    if (action === 'notify_co_owner' && claim_id) {
      const claim = await base44.asServiceRole.entities.RightsClaim.get(claim_id);
      if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

      await base44.asServiceRole.entities.RightsClaim.update(claim_id, {
        status: 'co_owner_notified',
        co_owner_approval_required: true,
      });

      // Notify the artist who owns the song
      if (claim.artist_profile_id) {
        const artist = await base44.asServiceRole.entities.ArtistProfile.get(claim.artist_profile_id);
        if (artist && artist.user_id) {
          await base44.asServiceRole.entities.DirectMessage.create({
            sender_user_id: user.id,
            sender_name: user.full_name || 'Rights System',
            sender_type: 'admin',
            recipient_user_id: artist.user_id,
            recipient_name: artist.artist_name,
            recipient_type: 'artist',
            artist_profile_id: claim.artist_profile_id,
            thread_id: [user.id, artist.user_id].sort().join('_'),
            body: `A rights claim has been filed against your song "${claim.song_title}".\n\nClaim type: ${claim.claim_type.replace(/_/g, ' ')}\nRights category: ${claim.rights_category.replace(/_/g, ' ')}\nDescription: ${claim.description}\n\nPlease review and respond to this claim.`,
          });
        }
      }

      return Response.json({ success: true, message: 'Co-owner notified' });
    }

    if (action === 'approve_claim' && claim_id) {
      const claim = await base44.asServiceRole.entities.RightsClaim.get(claim_id);
      if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

      await base44.asServiceRole.entities.RightsClaim.update(claim_id, {
        status: 'resolved_upheld',
        co_owner_approved: true,
        resolution_notes: resolution_notes || 'Claim upheld by co-owner approval',
        resolved_date: new Date().toISOString(),
        reviewed_by: user.id,
      });

      return Response.json({ success: true, message: 'Claim approved and upheld' });
    }

    if (action === 'dismiss_claim' && claim_id) {
      await base44.asServiceRole.entities.RightsClaim.update(claim_id, {
        status: 'resolved_dismissed',
        co_owner_approved: false,
        resolution_notes: resolution_notes || 'Claim dismissed',
        resolved_date: new Date().toISOString(),
        reviewed_by: user.id,
      });

      return Response.json({ success: true, message: 'Claim dismissed' });
    }

    if (action === 'escalate_claim' && claim_id) {
      await base44.asServiceRole.entities.RightsClaim.update(claim_id, {
        status: 'escalated',
        resolution_notes: resolution_notes || 'Claim escalated for legal review',
        reviewed_by: user.id,
      });

      return Response.json({ success: true, message: 'Claim escalated' });
    }

    if (action === 'issue_takedown' && claim_id) {
      const claim = await base44.asServiceRole.entities.RightsClaim.get(claim_id);
      if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

      await base44.asServiceRole.entities.RightsClaim.update(claim_id, {
        takedown_issued: true,
        takedown_date: new Date().toISOString(),
        status: 'resolved_upheld',
        resolution_notes: resolution_notes || 'Takedown issued - content removed',
        resolved_date: new Date().toISOString(),
        reviewed_by: user.id,
      });

      // Mark song as having open claims
      if (claim.song_id) {
        await base44.asServiceRole.entities.Song.update(claim.song_id, {
          has_open_claims: true,
        });
      }

      return Response.json({ success: true, message: 'Takedown issued' });
    }

    if (action === 'update_licensing' && claim_id) {
      await base44.asServiceRole.entities.RightsClaim.update(claim_id, {
        licensing_permission: licensing_permission,
        resolution_notes: resolution_notes || `Licensing ${licensing_permission}`,
        reviewed_by: user.id,
      });

      return Response.json({ success: true, message: `Licensing set to ${licensing_permission}` });
    }

    if (action === 'update_territory' && claim_id) {
      await base44.asServiceRole.entities.RightsClaim.update(claim_id, {
        territory_restrictions: territory_restrictions || [],
        reviewed_by: user.id,
      });

      return Response.json({ success: true, message: 'Territory restrictions updated' });
    }

    // ─── Split Sheet Actions ────────────────────────────────────
    if (action === 'verify_split' && split_id) {
      const split = await base44.asServiceRole.entities.SplitSheet.get(split_id);
      if (!split) return Response.json({ error: 'Split not found' }, { status: 404 });

      await base44.asServiceRole.entities.SplitSheet.update(split_id, {
        ownership_verified: true,
        is_approved: true,
        approved_date: new Date().toISOString(),
      });

      // Update song's split_sheet_count and rights_verified
      if (split.song_id) {
        const allSplits = await base44.asServiceRole.entities.SplitSheet.filter({ song_id: split.song_id });
        const allVerified = allSplits.every(s => s.ownership_verified);
        await base44.asServiceRole.entities.Song.update(split.song_id, {
          split_sheet_count: allSplits.length,
          rights_verified: allVerified,
        });
      }

      return Response.json({ success: true, message: 'Split verified' });
    }

    if (action === 'request_co_owner_approval' && split_id) {
      const split = await base44.asServiceRole.entities.SplitSheet.get(split_id);
      if (!split) return Response.json({ error: 'Split not found' }, { status: 404 });

      // If the owner has a user_id, send them a message
      if (split.owner_user_id) {
        await base44.asServiceRole.entities.DirectMessage.create({
          sender_user_id: user.id,
          sender_name: user.full_name || 'Rights System',
          sender_type: 'artist',
          recipient_user_id: split.owner_user_id,
          recipient_name: split.owner_name,
          recipient_type: 'artist',
          artist_profile_id: split.artist_profile_id,
          thread_id: [user.id, split.owner_user_id].sort().join('_'),
          body: `You have been listed on the split sheet for "${split.song_title}" with a ${split.split_percentage}% share as ${split.owner_role.replace(/_/g, ' ')} (${split.rights_type.replace(/_/g, ' ')}).\n\nPlease review and approve your split.`,
        });
      }

      return Response.json({ success: true, message: 'Co-owner approval request sent' });
    }

    // ─── Ownership Verification ─────────────────────────────────
    if (action === 'verify_ownership' && song_id) {
      const splits = await base44.asServiceRole.entities.SplitSheet.filter({ song_id, is_active: true });
      const allVerified = splits.length > 0 && splits.every(s => s.ownership_verified);
      const allApproved = splits.length > 0 && splits.every(s => s.is_approved);

      await base44.asServiceRole.entities.Song.update(song_id, {
        rights_verified: allVerified && allApproved,
        split_sheet_count: splits.length,
        has_open_claims: false,
      });

      return Response.json({
        success: true,
        verified: allVerified && allApproved,
        split_count: splits.length,
        message: allVerified && allApproved ? 'Ownership fully verified' : 'Ownership verification pending - not all splits verified'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Rights action error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});