import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAX_ADMIN_PARTNERS = 5;

const DEFAULT_PERMISSIONS = {
  can_view_users: true,
  can_edit_users: false,
  can_view_artists: true,
  can_edit_artists: false,
  can_view_songs: true,
  can_edit_songs: false,
  can_view_payments: true,
  can_edit_payments: false,
  can_view_subscriptions: true,
  can_edit_subscriptions: false,
  can_view_marketplace: true,
  can_edit_marketplace: false,
  can_view_events: true,
  can_edit_events: false,
  can_view_reports: true,
  can_export_reports: false,
  can_view_private_radio_data: false,
  can_view_legal_takedowns: false,
  can_manage_support_tickets: false,
  can_manage_business_partners: false,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // Extract request metadata for audit logging
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const logAction = async (actionType, category, details, entityId, prevData, newData) => {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: user.role,
        action: actionType,
        action_category: category,
        entity_type: 'AdminPartner',
        entity_id: entityId || null,
        details,
        ip_address: ip,
        user_agent: userAgent,
        is_security_event: true,
        severity: 'info',
        metadata: { previous_value: prevData || null, new_value: newData || null },
      });
    };

    // All actions require Master Admin (app owner has 'admin' role and cannot be changed to 'master_admin')
    const isMasterAdmin = user.role === 'master_admin' || user.role === 'admin';
    if (!isMasterAdmin) {
      await logAction(`failed_access_${action}`, 'security', `Non-master-admin attempted admin action`, null, null, null);
      return Response.json({ error: 'Only the Master Admin can perform this action' }, { status: 403 });
    }

    // CREATE admin partner
    if (action === 'create') {
      const { email, partner_name, revenue_share_percentage } = body;
      if (!email || !partner_name) {
        return Response.json({ error: 'Email and partner name are required' }, { status: 400 });
      }

      // Check max limit
      const existing = await base44.asServiceRole.entities.AdminPartner.filter({ is_active: true });
      if (existing.length >= MAX_ADMIN_PARTNERS) {
        return Response.json({ error: `Maximum of ${MAX_ADMIN_PARTNERS} Admin Partners allowed` }, { status: 400 });
      }

      // Invite the user with admin_partner role
      let invitedUser;
      try {
        invitedUser = await base44.asServiceRole.users.inviteUser(email, 'admin_partner');
      } catch (e) {
        return Response.json({ error: `Failed to invite user: ${e.message}` }, { status: 400 });
      }

      const partner = await base44.asServiceRole.entities.AdminPartner.create({
        user_id: invitedUser.id || invitedUser._id || email,
        partner_name,
        partner_email: email,
        revenue_share_percentage: revenue_share_percentage || 0,
        is_active: true,
        created_by_user_id: user.id,
        created_by_name: user.full_name || user.email,
        permissions: DEFAULT_PERMISSIONS,
      });

      await logAction('create_admin_partner', 'admin', `Created Admin Partner: ${partner_name} (${email})`, partner.id, null, { partner_name, email, revenue_share_percentage });
      return Response.json({ success: true, partner });
    }

    // REMOVE admin partner
    if (action === 'remove') {
      const { partner_id } = body;
      if (!partner_id) return Response.json({ error: 'Partner ID required' }, { status: 400 });

      const partner = await base44.asServiceRole.entities.AdminPartner.get(partner_id);
      if (!partner) return Response.json({ error: 'Partner not found' }, { status: 404 });

      await base44.asServiceRole.entities.AdminPartner.update(partner_id, { is_active: false });
      await logAction('remove_admin_partner', 'admin', `Removed Admin Partner: ${partner.partner_name}`, partner_id, { partner_name: partner.partner_name, is_active: true }, { is_active: false });
      return Response.json({ success: true });
    }

    // UPDATE PERMISSIONS
    if (action === 'update_permissions') {
      const { partner_id, permissions } = body;
      if (!partner_id) return Response.json({ error: 'Partner ID required' }, { status: 400 });

      const partner = await base44.asServiceRole.entities.AdminPartner.get(partner_id);
      if (!partner) return Response.json({ error: 'Partner not found' }, { status: 404 });

      await base44.asServiceRole.entities.AdminPartner.update(partner_id, { permissions });
      await logAction('update_admin_permissions', 'security', `Updated permissions for ${partner.partner_name}`, partner_id, partner.permissions, permissions);
      return Response.json({ success: true });
    }

    // UPDATE REVENUE SHARE
    if (action === 'update_revenue_share') {
      const { partner_id, revenue_share_percentage } = body;
      if (!partner_id) return Response.json({ error: 'Partner ID required' }, { status: 400 });

      const partner = await base44.asServiceRole.entities.AdminPartner.get(partner_id);
      if (!partner) return Response.json({ error: 'Partner not found' }, { status: 404 });

      await base44.asServiceRole.entities.AdminPartner.update(partner_id, { revenue_share_percentage });
      await logAction('update_revenue_share', 'payment', `Updated revenue share for ${partner.partner_name} to ${revenue_share_percentage}%`, partner_id, partner.revenue_share_percentage, revenue_share_percentage);
      return Response.json({ success: true });
    }

    // CALCULATE MONTHLY EARNINGS
    if (action === 'calculate_earnings') {
      const { month } = body;
      if (!month) return Response.json({ error: 'Month (YYYY-MM) required' }, { status: 400 });

      // Get gross revenue from paid orders for the month
      const orders = await base44.asServiceRole.entities.Order.filter({ payment_status: 'paid' });
      const monthOrders = orders.filter(o => {
        const d = o.created_date ? new Date(o.created_date) : null;
        return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month;
      });
      const grossRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      // Get platform expenses for the month
      const expenses = await base44.asServiceRole.entities.PlatformExpense.filter({ month });
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netRevenue = grossRevenue - totalExpenses;

      // Calculate for each active partner
      const partners = await base44.asServiceRole.entities.AdminPartner.filter({ is_active: true });
      const results = [];

      for (const partner of partners) {
        const estimatedPayout = netRevenue * (partner.revenue_share_percentage / 100);

        // Check if earning record already exists for this month
        const existingEarnings = await base44.asServiceRole.entities.AdminPartnerEarning.filter({
          admin_partner_id: partner.id,
          month,
        });

        if (existingEarnings.length > 0) {
          const record = existingEarnings[0];
          const paidAmount = record.paid_amount || 0;
          await base44.asServiceRole.entities.AdminPartnerEarning.update(record.id, {
            gross_revenue: grossRevenue,
            platform_expenses: totalExpenses,
            net_revenue: netRevenue,
            revenue_share_percentage: partner.revenue_share_percentage,
            estimated_payout: estimatedPayout,
            pending_amount: Math.max(0, estimatedPayout - paidAmount),
            status: paidAmount >= estimatedPayout ? 'paid' : (paidAmount > 0 ? 'partial' : 'calculated'),
          });
          results.push({ partner_id: partner.id, updated: true });
        } else {
          await base44.asServiceRole.entities.AdminPartnerEarning.create({
            admin_partner_id: partner.id,
            partner_name: partner.partner_name,
            user_id: partner.user_id,
            month,
            year: parseInt(month.split('-')[0]),
            gross_revenue: grossRevenue,
            platform_expenses: totalExpenses,
            net_revenue: netRevenue,
            revenue_share_percentage: partner.revenue_share_percentage,
            estimated_payout: estimatedPayout,
            paid_amount: 0,
            pending_amount: estimatedPayout,
            status: 'calculated',
          });
          results.push({ partner_id: partner.id, created: true });
        }
      }

      await logAction('calculate_partner_earnings', 'payment', `Calculated earnings for ${month}: Gross $${grossRevenue.toFixed(2)}, Expenses $${totalExpenses.toFixed(2)}, Net $${netRevenue.toFixed(2)}`, null, null, { month, grossRevenue, totalExpenses, netRevenue });
      return Response.json({ success: true, grossRevenue, totalExpenses, netRevenue, partnerCount: partners.length, results });
    }

    // RECORD PAYOUT
    if (action === 'record_payout') {
      const { earning_id, amount } = body;
      if (!earning_id) return Response.json({ error: 'Earning ID required' }, { status: 400 });

      const earning = await base44.asServiceRole.entities.AdminPartnerEarning.get(earning_id);
      if (!earning) return Response.json({ error: 'Earning record not found' }, { status: 404 });

      const newPaidAmount = (earning.paid_amount || 0) + amount;
      const newPending = Math.max(0, earning.estimated_payout - newPaidAmount);
      const newStatus = newPaidAmount >= earning.estimated_payout ? 'paid' : 'partial';

      await base44.asServiceRole.entities.AdminPartnerEarning.update(earning_id, {
        paid_amount: newPaidAmount,
        pending_amount: newPending,
        status: newStatus,
        paid_date: new Date().toISOString(),
      });

      await logAction('record_partner_payout', 'payment', `Recorded payout of $${amount} for ${earning.partner_name} (${earning.month})`, earning_id, { paid_amount: earning.paid_amount }, { paid_amount: newPaidAmount, status: newStatus });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manageAdminPartner error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});