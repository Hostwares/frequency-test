import jsPDF from 'jspdf';
import { format } from 'date-fns';

export const PLATFORM_FEE_RATE = 0.15;

export function money(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

/**
 * Compute a single-month earnings statement from raw entity data.
 */
export function computeStatement({ orders = [], allocations = [], payouts = [], events = [] }, monthKey) {
  const monthOrders = orders.filter((o) => (o.created_date || '').slice(0, 7) === monthKey);
  const merchOrders = monthOrders.filter((o) => o.payment_type === 'merch');
  const ticketOrders = monthOrders.filter((o) => o.payment_type === 'tickets');

  const merchGross = merchOrders.reduce((s, o) => s + (o.subtotal || o.total || 0), 0);
  const merchArtist = merchOrders.reduce((s, o) => s + (o.artist_earnings || 0), 0);
  const merchPlatformFee = merchGross - merchArtist;

  const ticketGross = ticketOrders.reduce((s, o) => s + (o.total || 0), 0);
  const ticketArtist = ticketOrders.reduce((s, o) => s + (o.artist_earnings || 0), 0);
  const ticketPlatformFee = ticketGross - ticketArtist;

  const monthAllocations = allocations.filter(
    (a) => a.month === monthKey || (a.created_date || '').slice(0, 7) === monthKey
  );
  const supportGross = monthAllocations.reduce((s, a) => s + (a.amount || 0), 0);
  const supportPlatformFee = supportGross * PLATFORM_FEE_RATE;
  const supportArtist = supportGross - supportPlatformFee;

  const monthEvents = events.filter((e) => (e.date || '').slice(0, 7) === monthKey);
  const eventRevenue = monthEvents.reduce(
    (s, e) => s + ((e.ticket_price || 0) * (e.attendee_count || 0)), 0
  );

  const monthPayouts = payouts.filter((p) => {
    const pm = (p.processed_date || p.period_end || '').slice(0, 7);
    return pm === monthKey && p.status === 'completed';
  });
  const totalPaidOut = monthPayouts.reduce((s, p) => s + (p.amount || 0), 0);

  const grossTotal = merchGross + ticketGross + supportGross;
  const platformFees = merchPlatformFee + ticketPlatformFee + supportPlatformFee;
  const netEarnings = merchArtist + ticketArtist + supportArtist;

  return {
    merchOrders, ticketOrders, monthAllocations, monthPayouts, monthEvents,
    merchGross, merchArtist, merchPlatformFee,
    ticketGross, ticketArtist, ticketPlatformFee,
    supportGross, supportArtist, supportPlatformFee,
    eventRevenue, grossTotal, platformFees, netEarnings, totalPaidOut,
  };
}

/**
 * Build a jsPDF document for a single monthly statement (does not save).
 * Returns the doc instance so callers can save() or output('blob') as needed.
 */
export function generateStatementDoc({ statement, artistProfile, user, monthKey, monthLabel }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 64;

  // Header band
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageW, 44, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Frequency', margin, 28);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Monthly Earnings Statement', pageW - margin, 28, { align: 'right' });

  y = 80;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(artistProfile?.artist_name || 'Artist', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  if (artistProfile?.artist_handle) { doc.text(`Handle: !${artistProfile.artist_handle}`, margin, y); y += 14; }
  doc.text(`Statement Period: ${monthLabel}`, margin, y); y += 14;
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, margin, y); y += 14;
  if (user?.email) { doc.text(`Account: ${user.email}`, margin, y); y += 22; }

  // Summary box
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(248, 248, 252);
  doc.roundedRect(margin, y, pageW - margin * 2, 96, 6, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('Earnings Summary', margin + 16, y + 22);
  doc.setFontSize(10);
  const summaryRows = [
    ['Gross Revenue', money(statement.grossTotal)],
    ['Platform Fees (15%)', `-${money(statement.platformFees)}`],
    ['Net Earnings', money(statement.netEarnings)],
    ['Paid Out This Period', money(statement.totalPaidOut)],
  ];
  let sy = y + 40;
  summaryRows.forEach(([label, val], i) => {
    const isTotal = i >= 2;
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setTextColor(isTotal ? 124 : 90, isTotal ? 58 : 90, isTotal ? 237 : 90);
    doc.text(label, margin + 16, sy);
    doc.text(val, margin + pageW - margin * 2 - 16, sy, { align: 'right' });
    sy += 15;
  });
  y += 110;

  const section = (title, rows) => {
    if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 64; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(title, margin, y); y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    rows.forEach(([label, val]) => {
      doc.text(label, margin + 8, y);
      doc.text(val, pageW - margin - 8, y, { align: 'right' });
      y += 14;
    });
    y += 8;
  };

  section('Revenue Breakdown', [
    ['Merch Sales (gross)', money(statement.merchGross)],
    ['Merch — platform fee', `-${money(statement.merchPlatformFee)}`],
    ['Merch — artist share', money(statement.merchArtist)],
    ['Ticket Sales (gross)', money(statement.ticketGross)],
    ['Tickets — platform fee', `-${money(statement.ticketPlatformFee)}`],
    ['Tickets — artist share', money(statement.ticketArtist)],
    ['Fan Support (gross)', money(statement.supportGross)],
    ['Fan Support — platform fee', `-${money(statement.supportPlatformFee)}`],
    ['Fan Support — artist share', money(statement.supportArtist)],
    ['Projected Event Revenue', money(statement.eventRevenue)],
  ]);

  const txSection = (title, cols, rows) => {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 64; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(title, margin, y); y += 16;
    doc.setFontSize(9);
    doc.setFillColor(238, 238, 245);
    doc.roundedRect(margin, y - 10, pageW - margin * 2, 16, 3, 3, 'F');
    doc.setTextColor(90, 90, 90);
    doc.setFont('helvetica', 'bold');
    cols.forEach((c) => { doc.text(c.label, margin + 8 + c.x, y); });
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    if (rows.length === 0) {
      doc.text('No transactions this period.', margin + 8, y); y += 14;
    } else {
      rows.forEach((r) => {
        if (y > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = 64; }
        cols.forEach((c) => { doc.text(String(r[c.key] ?? ''), margin + 8 + c.x, y); });
        y += 13;
      });
    }
    y += 10;
  };

  txSection(
    'Merch Transactions',
    [
      { key: 'date', label: 'Date', x: 0 },
      { key: 'id', label: 'Order #', x: 80 },
      { key: 'items', label: 'Items', x: 240 },
      { key: 'total', label: 'Total', x: 380 },
      { key: 'earn', label: 'Artist', x: 450 },
    ],
    statement.merchOrders.slice(0, 50).map((o) => ({
      date: (o.created_date || '').slice(0, 10),
      id: (o.order_number || '').slice(0, 14),
      items: String((o.items || []).reduce((s, it) => s + (it.quantity || 0), 0)),
      total: money(o.total),
      earn: money(o.artist_earnings),
    }))
  );

  txSection(
    'Fan Support',
    [
      { key: 'date', label: 'Date', x: 0 },
      { key: 'amount', label: 'Amount', x: 120 },
      { key: 'share', label: 'Artist Share', x: 240 },
    ],
    statement.monthAllocations.slice(0, 50).map((a) => ({
      date: (a.created_date || '').slice(0, 10),
      amount: money(a.amount),
      share: money((a.amount || 0) * (1 - PLATFORM_FEE_RATE)),
    }))
  );

  txSection(
    'Payouts This Period',
    [
      { key: 'date', label: 'Date', x: 0 },
      { key: 'provider', label: 'Method', x: 120 },
      { key: 'amount', label: 'Amount', x: 280 },
      { key: 'id', label: 'Transaction', x: 380 },
    ],
    statement.monthPayouts.map((p) => ({
      date: (p.processed_date || '').slice(0, 10),
      provider: p.payment_provider || '—',
      amount: money(p.amount),
      id: (p.transaction_id || '—').slice(0, 18),
    }))
  );

  // Footer
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'This statement is for your personal records. Frequency does not guarantee tax accuracy — consult a tax professional.',
      margin,
      doc.internal.pageSize.getHeight() - 24
    );
    doc.text(`Page ${i} of ${pages}`, pageW - margin, doc.internal.pageSize.getHeight() - 24, { align: 'right' });
  }

  return doc;
}