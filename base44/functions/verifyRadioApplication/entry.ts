import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { station_id } = await req.json();
    if (!station_id) return Response.json({ error: 'station_id is required' }, { status: 400 });

    const station = await base44.asServiceRole.entities.RadioStation.get(station_id);
    if (!station) return Response.json({ error: 'Station application not found' }, { status: 404 });

    // Mark AI review in progress
    await base44.asServiceRole.entities.RadioStation.update(station_id, {
      verification_status: 'ai_review_in_progress'
    });

    // Build evidence-gathering prompt for the LLM
    const evidencePrompt = buildEvidencePrompt(station);

    // Run AI assessment using web-enabled model for public-record checks
    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: evidencePrompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          regulator_match: {
            type: 'object',
            properties: {
              result: { type: 'string', enum: ['matched', 'partial', 'no_match', 'failed', 'not_checked'] },
              points: { type: 'number' },
              notes: { type: 'string' }
            }
          },
          official_website: {
            type: 'object',
            properties: {
              result: { type: 'string', enum: ['matched', 'partial', 'no_match', 'failed', 'not_checked'] },
              points: { type: 'number' },
              notes: { type: 'string' }
            }
          },
          email_domain_match: {
            type: 'object',
            properties: {
              result: { type: 'string', enum: ['matched', 'partial', 'no_match', 'failed', 'not_checked'] },
              points: { type: 'number' },
              notes: { type: 'string' }
            }
          },
          streaming_activity: {
            type: 'object',
            properties: {
              result: { type: 'string', enum: ['matched', 'partial', 'no_match', 'failed', 'not_checked'] },
              points: { type: 'number' },
              notes: { type: 'string' }
            }
          },
          public_listings: {
            type: 'object',
            properties: {
              result: { type: 'string', enum: ['matched', 'partial', 'no_match', 'failed', 'not_checked'] },
              points: { type: 'number' },
              notes: { type: 'string' }
            }
          },
          social_identity: {
            type: 'object',
            properties: {
              result: { type: 'string', enum: ['matched', 'partial', 'no_match', 'failed', 'not_checked'] },
              points: { type: 'number' },
              notes: { type: 'string' }
            }
          },
          total_score: { type: 'number' },
          risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          flags: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' }
        }
      }
    });

    const score = Math.min(100, Math.max(0, Math.round(aiResult.total_score || 0)));
    const risk = aiResult.risk_level || 'medium';
    const flags = Array.isArray(aiResult.flags) ? aiResult.flags : [];
    const summary = aiResult.summary || '';

    // Persist evidence items
    const evidenceItems = [
      { evidence_type: 'regulator_match', source: station.regulator || 'broadcasting regulator', data: aiResult.regulator_match },
      { evidence_type: 'official_website', source: station.website, public_url: station.website, data: aiResult.official_website },
      { evidence_type: 'email_domain_match', source: station.applicant_work_email, data: aiResult.email_domain_match },
      { evidence_type: 'streaming_activity', source: station.stream_url, public_url: station.stream_url, data: aiResult.streaming_activity },
      { evidence_type: 'public_listing', source: 'radio directories', data: aiResult.public_listings },
      { evidence_type: 'social_identity', source: 'social media', data: aiResult.social_identity }
    ];

    const createdEvidence = [];
    for (const item of evidenceItems) {
      if (!item.data) continue;
      const ev = await base44.asServiceRole.entities.RadioVerificationEvidence.create({
        station_id,
        evidence_type: item.evidence_type,
        source: item.source || '',
        public_url: item.public_url || '',
        match_result: item.data.result || 'not_checked',
        confidence_score: Math.round(item.data.points || 0),
        ai_notes: item.data.notes || '',
        verified_at: new Date().toISOString(),
        expiration_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      });
      createdEvidence.push(ev);
    }

    // Persist review record
    const review = await base44.asServiceRole.entities.RadioVerificationReview.create({
      station_id,
      application_id: station_id,
      ai_score: score,
      risk_level: risk,
      flags,
      ai_summary: summary,
      review_stage: 'ai_review',
      decision: 'pending'
    });

    // AI never independently grants full verification — always escalate to manual review.
    // Status outcome: manual_review_required for 70+, additional_information_requested for 50-69, manual_review_required (flagged) below 50.
    let nextStatus = 'manual_review_required';
    if (score < 50) {
      nextStatus = 'manual_review_required';
    } else if (score < 70) {
      nextStatus = 'additional_information_requested';
    }

    const update = {
      verification_score: score,
      risk_level: risk,
      verification_flags: flags,
      ai_notes: summary,
      verification_status: nextStatus,
      streaming_active: aiResult.streaming_activity?.result === 'matched'
    };

    // Set reverification schedule on first review
    if (!station.reverification_date) {
      update.reverification_date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      update.last_public_record_check = new Date().toISOString();
    }

    await base44.asServiceRole.entities.RadioStation.update(station_id, update);

    return Response.json({
      station_id,
      score,
      risk_level: risk,
      flags,
      summary,
      next_status: nextStatus,
      evidence_count: createdEvidence.length,
      review_id: review.id
    });
  } catch (error) {
    console.error('verifyRadioApplication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildEvidencePrompt(station) {
  const isInternet = station.station_type === 'internet_radio';
  const parts = [
    'You are verifying a radio station application on The Mainstream Frequency platform.',
    `Station name: ${station.official_station_name || 'not provided'}`,
    `Official station identifier / call sign: ${station.official_station_identifier || 'not provided'}`,
    `Station type: ${station.station_type}`,
    `Band: ${station.band || 'n/a'}`,
    `Frequency: ${station.frequency || 'n/a'}`,
    `Country: ${station.country || 'n/a'}, Region: ${station.region || 'n/a'}, City: ${station.city || 'n/a'}`,
    `Official website: ${station.website || 'not provided'}`,
    `Live stream URL: ${station.stream_url || 'not provided'}`,
    `Schedule URL: ${station.schedule_url || 'not provided'}`,
    `Regulator: ${station.regulator || 'not provided'}`,
    `License number: ${station.government_license_number || 'not provided'}`,
    `License holder: ${station.license_holder || 'not provided'}`,
    `Applicant work email: ${station.applicant_work_email || 'not provided'}`,
    `Applicant name: ${station.applicant_full_name || 'not provided'}`,
    `Applicant role: ${station.applicant_station_role || 'n/a'}`
  ];
  parts.push(
    '',
    'Score each evidence category 0 to its max and return the total (0-100):',
    '- regulator_match: up to 35 (exact call-sign match, correct frequency, country, ownership/license holder against public records)',
    '- official_website: up to 20 (active website, matching station name, location, contact info)',
    '- email_domain_match: up to 15 (applicant email uses official station domain matching the website)',
    '- streaming_activity: up to 10 (active live stream, recent programming, working player/schedule)',
    '- public_listings: up to 10 (listed in recognized radio directory like TuneIn/Radio Garden/Streema/MyTuner with matching details)',
    '- social_identity: up to 10 (active verified social accounts, recent posts, public program schedule)',
    '',
    isInternet
      ? 'This is an INTERNET station — it may not have a government call sign. Require at least one official owned web property plus one independent supporting public listing. Do not approve based only on a private social-media page.'
      : 'This is a TERRESTRIAL/SATELLITE station — match against applicable licensing or public broadcasting records whenever available.',
    '',
    'Detect and explain fraud signals: fake call signs, mismatched frequency/station, copied websites, newly created imitation domains, applicant email unrelated to station, duplicate applications, false staff claims, broken streams, inactive stations, identity inconsistencies, impersonation of major stations.',
    'Return flags as an array of short human-readable explanations, risk_level (low/medium/high/critical), and a summary explaining the score.'
  );
  return parts.join('\n');
}