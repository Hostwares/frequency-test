import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * manageStationSeats
 * Lets a verified radio station owner manage multi-programmer seat assignments.
 * Runs as service role (RadioProgrammer records are normally RLS-locked to their
 * owner), but every action first verifies the caller owns a verified station.
 *
 * Actions:
 *   list      -> { station, seats }  (auto-links the owner's own seat if missing)
 *   add       -> { identifier (email) } links that radio account holder to the station
 *   remove    -> { programmerId } unlinks a seat (cannot remove your own primary seat)
 */

const VERIFIED_STATUSES = ['verified', 'verified_with_restrictions'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // Resolve the caller's verified station.
    const stations = await base44.asServiceRole.entities.RadioStation.filter({
      applicant_user_id: caller.id,
    });
    const station = (stations || []).find((s) =>
      VERIFIED_STATUSES.includes(s.verification_status)
    );
    if (!station) {
      return Response.json(
        { error: 'No verified station found for this account.' },
        { status: 403 }
      );
    }

    // --- LIST ---
    if (!action || action === 'list') {
      // Ensure the owner's own programmer seat is linked to the station.
      let ownerSeat = null;
      const mine = await base44.asServiceRole.entities.RadioProgrammer.filter({
        user_id: caller.id,
      });
      if (mine && mine.length) {
        ownerSeat = mine[0];
        if (ownerSeat.station_id !== station.id) {
          ownerSeat = await base44.asServiceRole.entities.RadioProgrammer.update(
            ownerSeat.id,
            { station_id: station.id }
          );
        }
        if (!station.radio_programmer_id) {
          await base44.asServiceRole.entities.RadioStation.update(station.id, {
            radio_programmer_id: ownerSeat.id,
          });
        }
      }

      const seats = await base44.asServiceRole.entities.RadioProgrammer.filter({
        station_id: station.id,
      });

      // Enrich with user identity (name/email) for display.
      const enriched = [];
      for (const seat of seats || []) {
        let displayName = seat.station_name || 'Radio Account Holder';
        let email = '';
        if (seat.user_id) {
          try {
            const u = await base44.asServiceRole.entities.User.get(seat.user_id);
            if (u) {
              displayName = u.full_name || displayName;
              email = u.email || '';
            }
          } catch (e) {
            console.error('User lookup failed for seat', seat.id, e?.message || String(e));
          }
        }
        enriched.push({
          id: seat.id,
          user_id: seat.user_id,
          name: displayName,
          email,
          role: seat.role,
          station_name: seat.station_name,
          is_verified: seat.is_verified,
          verification_status: seat.verification_status,
          is_owner: seat.user_id === caller.id,
        });
      }

      return Response.json({
        station: {
          id: station.id,
          name: station.official_station_name,
          public_handle: station.public_handle,
        },
        seats: enriched,
      });
    }

    // --- ADD ---
    if (action === 'add') {
      const identifier = (body.identifier || '').trim().toLowerCase();
      if (!identifier) {
        return Response.json({ error: 'An email is required.' }, { status: 400 });
      }

      // Find the user by email (service role).
      const matches = await base44.asServiceRole.entities.User.filter({
        email: identifier,
      });
      const targetUser = (matches || [])[0];
      if (!targetUser) {
        return Response.json(
          { error: 'No Frequency account found with that email.' },
          { status: 404 }
        );
      }

      // Must already hold a radio account (RadioProgrammer profile).
      const progs = await base44.asServiceRole.entities.RadioProgrammer.filter({
        user_id: targetUser.id,
      });
      if (!progs || progs.length === 0) {
        return Response.json(
          { error: 'That user is not a radio account holder yet.' },
          { status: 400 }
        );
      }

      const seat = progs[0];
      if (seat.station_id === station.id) {
        return Response.json(
          { error: 'That account holder is already on your station team.' },
          { status: 409 }
        );
      }
      if (seat.station_id) {
        return Response.json(
          { error: 'That account holder is already assigned to another station.' },
          { status: 409 }
        );
      }

      await base44.asServiceRole.entities.RadioProgrammer.update(seat.id, {
        station_id: station.id,
      });

      return Response.json({
        success: true,
        message: `${targetUser.full_name || targetUser.email} added to ${station.official_station_name}.`,
      });
    }

    // --- REMOVE ---
    if (action === 'remove') {
      const programmerId = body.programmerId;
      if (!programmerId) {
        return Response.json({ error: 'programmerId is required.' }, { status: 400 });
      }
      const seat = await base44.asServiceRole.entities.RadioProgrammer.get(programmerId);
      if (!seat || seat.station_id !== station.id) {
        return Response.json(
          { error: 'That seat is not part of your station.' },
          { status: 403 }
        );
      }
      if (seat.user_id === caller.id) {
        return Response.json(
          { error: 'You cannot remove yourself from your own station.' },
          { status: 400 }
        );
      }

      await base44.asServiceRole.entities.RadioProgrammer.update(seat.id, {
        station_id: null,
      });

      return Response.json({
        success: true,
        message: 'Seat removed from your station.',
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('manageStationSeats error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});