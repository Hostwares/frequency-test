import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

/**
 * Emergency Recovery Access — a mechanism distinct from normal login for the
 * Master Administrator. Requires its own verification step and generates a
 * permanent log entry every time it is used.
 *
 * Actions:
 *   setup    — Master admin creates their recovery code + backup verification email.
 *              Requires the caller to be authenticated as a master_admin.
 *   initiate — Anyone submits a recovery code; system sends a 6-digit verification
 *              challenge to the backup email. Returns a challenge token.
 *   verify   — Verifies the challenge code against the token; if valid, grants
 *              temporary elevated access and logs the event permanently.
 *   revoke   — Master admin revokes a recovery access record.
 */

const SESSION_TTL_MINUTES = 30;

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateSessionToken(): string {
  return crypto.randomUUID() + "-" + Date.now();
}

function getClientInfo(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}

async function logPermanently(
  base44: any,
  recoveryAccessId: string,
  masterAdminUserId: string,
  masterAdminEmail: string,
  action: string,
  wasSuccessful: boolean,
  clientInfo: { ip: string; userAgent: string },
  failureReason?: string,
  sessionId?: string,
  sessionExpiresAt?: string
) {
  // 1. Permanent EmergencyRecoveryLog entry (immutable)
  await base44.asServiceRole.entities.EmergencyRecoveryLog.create({
    recovery_access_id: recoveryAccessId,
    master_admin_user_id: masterAdminUserId,
    master_admin_email: masterAdminEmail,
    action,
    was_successful: wasSuccessful,
    failure_reason: failureReason || "",
    verification_method: "email_code",
    ip_address: clientInfo.ip,
    user_agent: clientInfo.userAgent,
    granted_session_id: sessionId || "",
    session_expires_at: sessionExpiresAt || "",
  });

  // 2. SecurityEvent (critical severity)
  await base44.asServiceRole.entities.SecurityEvent.create({
    event_type: "account_takeover_attempt",
    user_id: masterAdminUserId,
    user_email: masterAdminEmail,
    ip_address: clientInfo.ip,
    user_agent: clientInfo.userAgent,
    severity: "critical",
    description: `Emergency recovery access — ${action} (${wasSuccessful ? "success" : "failed"})`,
    metadata: {
      recovery_access_id: recoveryAccessId,
      action,
      was_successful: wasSuccessful,
      failure_reason: failureReason || "",
      session_id: sessionId || "",
    },
  });

  // 3. AuditLog entry (immutable, master-admin-only readable)
  await base44.asServiceRole.entities.AuditLog.create({
    user_id: masterAdminUserId,
    user_email: masterAdminEmail,
    user_role: "master_admin",
    action: `emergency_recovery_${action}`,
    action_category: "security",
    entity_type: "EmergencyRecoveryAccess",
    entity_id: recoveryAccessId,
    details: `Emergency recovery ${action} — ${wasSuccessful ? "success" : "failed"}${failureReason ? ": " + failureReason : ""}`,
    ip_address: clientInfo.ip,
    user_agent: clientInfo.userAgent,
    is_security_event: true,
    is_master_admin_action: true,
    severity: wasSuccessful ? "critical" : "warning",
    metadata: {
      recovery_access_id: recoveryAccessId,
      session_id: sessionId || "",
      session_expires_at: sessionExpiresAt || "",
    },
  });
}

export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { action } = body;
    const base44 = createClientFromRequest(req);
    const clientInfo = getClientInfo(req);

    // ── SETUP: Master admin creates recovery code + backup email ──────────
    if (action === "setup") {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
      if (user.role !== "master_admin") {
        return Response.json({ error: "Only the Master Administrator can set up emergency recovery access." }, { status: 403 });
      }

      const { recovery_code, backup_verification_email } = body;
      if (!recovery_code || recovery_code.length < 12) {
        return Response.json({ error: "Recovery code must be at least 12 characters." }, { status: 400 });
      }
      if (!backup_verification_email) {
        return Response.json({ error: "A backup verification email is required." }, { status: 400 });
      }

      // Check for existing active recovery access
      const existing = await base44.asServiceRole.entities.EmergencyRecoveryAccess.filter({
        master_admin_user_id: user.id,
        is_active: true,
      });
      if (existing && existing.length > 0) {
        return Response.json({ error: "An active emergency recovery access already exists. Revoke it first." }, { status: 409 });
      }

      const codeHash = await sha256(recovery_code);
      const record = await base44.asServiceRole.entities.EmergencyRecoveryAccess.create({
        master_admin_user_id: user.id,
        master_admin_email: user.email,
        recovery_code_hash: codeHash,
        backup_verification_email: backup_verification_email,
        is_active: true,
        is_revoked: false,
        use_count: 0,
        created_by_setup: true,
      });

      // Log the setup permanently
      await logPermanently(
        base44, record.id, user.id, user.email,
        "recovery_setup", true, clientInfo
      );

      return Response.json({
        message: "Emergency recovery access configured. Store your recovery code securely — it cannot be retrieved.",
        recovery_access_id: record.id,
      });
    }

    // ── INITIATE: Submit recovery code, send verification challenge ─────────
    if (action === "initiate") {
      const { recovery_code, master_admin_email } = body;
      if (!recovery_code || !master_admin_email) {
        return Response.json({ error: "Recovery code and master admin email are required." }, { status: 400 });
      }

      // Find active recovery access by email
      const records = await base44.asServiceRole.entities.EmergencyRecoveryAccess.filter({
        master_admin_email,
        is_active: true,
        is_revoked: false,
      });
      if (!records || records.length === 0) {
        return Response.json({ error: "No active recovery access found for this email." }, { status: 404 });
      }

      const access = records[0];
      const codeHash = await sha256(recovery_code);

      if (codeHash !== access.recovery_code_hash) {
        // Log failed attempt permanently
        await logPermanently(
          base44, access.id, access.master_admin_user_id, access.master_admin_email,
          "recovery_code_submitted", false, clientInfo,
          "Invalid recovery code"
        );
        return Response.json({ error: "Invalid recovery code." }, { status: 401 });
      }

      // Generate and send 6-digit verification challenge to backup email
      const verificationCode = generateSixDigitCode();
      const challengeToken = generateSessionToken();

      // Store challenge in a SecurityEvent (used as a temporary challenge store)
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: "mfa_challenge",
        user_id: access.master_admin_user_id,
        user_email: access.backup_verification_email,
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        severity: "warning",
        description: `Emergency recovery verification challenge. Token: ${challengeToken}`,
        metadata: {
          challenge_token: challengeToken,
          verification_code: verificationCode,
          recovery_access_id: access.id,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      });

      // Send verification email
      await base44.integrations.Core.SendEmail({
        to: access.backup_verification_email,
        subject: "Emergency Recovery Verification Code",
        body: `Your emergency recovery verification code is: ${verificationCode}\n\nThis code expires in 10 minutes. If you did not initiate this recovery, contact platform security immediately.`,
      });

      // Log challenge sent
      await logPermanently(
        base44, access.id, access.master_admin_user_id, access.master_admin_email,
        "verification_challenge_sent", true, clientInfo
      );

      return Response.json({
        message: "A verification code has been sent to the backup email.",
        challenge_token: challengeToken,
      });
    }

    // ── VERIFY: Verify challenge code, grant temporary access ──────────────
    if (action === "verify") {
      const { challenge_token, verification_code } = body;
      if (!challenge_token || !verification_code) {
        return Response.json({ error: "Challenge token and verification code are required." }, { status: 400 });
      }

      // Find the challenge SecurityEvent
      const challenges = await base44.asServiceRole.entities.SecurityEvent.filter({
        event_type: "mfa_challenge",
      });
      const challenge = challenges?.find((c: any) =>
        c.metadata?.challenge_token === challenge_token
      );

      if (!challenge) {
        return Response.json({ error: "Invalid or expired challenge token." }, { status: 401 });
      }

      const expiresAt = new Date(challenge.metadata.expires_at);
      if (new Date() > expiresAt) {
        return Response.json({ error: "Verification code has expired. Please restart the recovery process." }, { status: 401 });
      }

      if (String(challenge.metadata.verification_code) !== String(verification_code)) {
        // Log failed verification
        const accessId = challenge.metadata.recovery_access_id;
        const accessRecords = await base44.asServiceRole.entities.EmergencyRecoveryAccess.filter({ id: accessId });
        const access = accessRecords?.[0];
        if (access) {
          await logPermanently(
            base44, access.id, access.master_admin_user_id, access.master_admin_email,
            "verification_completed", false, clientInfo,
            "Invalid verification code"
          );
        }
        return Response.json({ error: "Invalid verification code." }, { status: 401 });
      }

      // Challenge verified — grant temporary elevated access
      const accessId = challenge.metadata.recovery_access_id;
      const accessRecords = await base44.asServiceRole.entities.EmergencyRecoveryAccess.filter({ id: accessId });
      const access = accessRecords?.[0];
      if (!access) {
        return Response.json({ error: "Recovery access record not found." }, { status: 404 });
      }

      // Generate a temporary session token
      const sessionToken = generateSessionToken();
      const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000).toISOString();

      // Update recovery access record
      await base44.asServiceRole.entities.EmergencyRecoveryAccess.update(access.id, {
        use_count: (access.use_count || 0) + 1,
        last_used_date: new Date().toISOString(),
        last_used_ip: clientInfo.ip,
      });

      // Log successful access granted — PERMANENT
      await logPermanently(
        base44, access.id, access.master_admin_user_id, access.master_admin_email,
        "access_granted", true, clientInfo,
        undefined, sessionToken, sessionExpiresAt
      );

      return Response.json({
        message: "Emergency recovery access granted. This session is temporary.",
        session_token: sessionToken,
        session_expires_at: sessionExpiresAt,
        master_admin_user_id: access.master_admin_user_id,
      });
    }

    // ── REVOKE: Master admin revokes a recovery access record ──────────────
    if (action === "revoke") {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
      if (user.role !== "master_admin") {
        return Response.json({ error: "Only the Master Administrator can revoke recovery access." }, { status: 403 });
      }

      const { recovery_access_id, reason } = body;
      if (!recovery_access_id) {
        return Response.json({ error: "Recovery access ID is required." }, { status: 400 });
      }

      await base44.asServiceRole.entities.EmergencyRecoveryAccess.update(recovery_access_id, {
        is_active: false,
        is_revoked: true,
        revoked_date: new Date().toISOString(),
        revoked_reason: reason || "Revoked by master admin",
      });

      await logPermanently(
        base44, recovery_access_id, user.id, user.email,
        "code_revoked", true, clientInfo
      );

      return Response.json({ message: "Emergency recovery access revoked." });
    }

    return Response.json({ error: "Unknown action. Use: setup, initiate, verify, or revoke." }, { status: 400 });
  } catch (error) {
    console.error("Emergency recovery error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}