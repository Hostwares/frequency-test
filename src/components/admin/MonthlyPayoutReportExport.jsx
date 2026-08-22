import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function formatMonth(ym) {
  const [y, m] = ym.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MonthlyPayoutReportExport({ earnings, partners, isMasterAdmin }) {
  const [generating, setGenerating] = useState(false);

  const handleExport = () => {
    if (!earnings || earnings.length === 0) {
      toast.error('No earnings data to export');
      return;
    }

    setGenerating(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = 20;

      // Header
      doc.setFillColor(10, 10, 20);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(168, 85, 247);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('The Mainstream Frequency', margin, 8);
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text('Admin Partner Monthly Payout Summary Report', pageWidth - margin, 8, { align: 'right' });

      y = 20;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, margin, y);
      y += 5;
      doc.text(`Report Period: All recorded earnings`, margin, y);
      y += 7;

      // Group earnings by month
      const byMonth = {};
      earnings.forEach(e => {
        if (!byMonth[e.month]) byMonth[e.month] = [];
        byMonth[e.month].push(e);
      });
      const sortedMonths = Object.keys(byMonth).sort();

      // Table column positions
      const colX = {
        partner: margin,
        gross: margin + 50,
        expenses: margin + 80,
        net: margin + 110,
        share: margin + 140,
        payout: margin + 160,
        paid: margin + 185,
        pending: margin + 210,
        status: margin + 235,
      };
      const colWidths = { partner: 50, gross: 30, expenses: 30, net: 30, share: 20, payout: 25, paid: 25, pending: 25, status: 30 };

      const addTableHeader = () => {
        doc.setFillColor(240, 240, 245);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text('Partner', colX.partner, y);
        doc.text('Gross', colX.gross, y, { align: 'right' });
        doc.text('Expenses', colX.expenses, y, { align: 'right' });
        doc.text('Net', colX.net, y, { align: 'right' });
        doc.text('Share %', colX.share, y, { align: 'right' });
        doc.text('Payout', colX.payout, y, { align: 'right' });
        doc.text('Paid', colX.paid, y, { align: 'right' });
        doc.text('Pending', colX.pending, y, { align: 'right' });
        doc.text('Status', colX.status, y);
        y += 6;
      };

      const checkPageBreak = () => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
          addTableHeader();
        }
      };

      let grandGross = 0, grandExpenses = 0, grandNet = 0, grandPayout = 0, grandPaid = 0, grandPending = 0;

      for (const month of sortedMonths) {
        checkPageBreak();
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(107, 33, 168);
        doc.text(formatMonth(month), margin, y);
        y += 5;

        addTableHeader();

        const monthEntries = byMonth[month];
        let monthGross = 0, monthExpenses = 0, monthNet = 0, monthPayout = 0, monthPaid = 0, monthPending = 0;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);

        for (const e of monthEntries) {
          checkPageBreak();
          doc.text(e.partner_name || '—', colX.partner, y);
          doc.text(`$${(e.gross_revenue || 0).toFixed(2)}`, colX.gross, y, { align: 'right' });
          doc.text(`$${(e.platform_expenses || 0).toFixed(2)}`, colX.expenses, y, { align: 'right' });
          doc.text(`$${(e.net_revenue || 0).toFixed(2)}`, colX.net, y, { align: 'right' });
          doc.text(`${e.revenue_share_percentage || 0}%`, colX.share, y, { align: 'right' });
          doc.text(`$${(e.estimated_payout || 0).toFixed(2)}`, colX.payout, y, { align: 'right' });
          doc.text(`$${(e.paid_amount || 0).toFixed(2)}`, colX.paid, y, { align: 'right' });
          doc.text(`$${(e.pending_amount || 0).toFixed(2)}`, colX.pending, y, { align: 'right' });
          doc.text(e.status || '—', colX.status, y);
          y += 5;

          monthGross += e.gross_revenue || 0;
          monthExpenses += e.platform_expenses || 0;
          monthNet += e.net_revenue || 0;
          monthPayout += e.estimated_payout || 0;
          monthPaid += e.paid_amount || 0;
          monthPending += e.pending_amount || 0;
        }

        // Month totals row
        checkPageBreak();
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(230, 230, 240);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 6, 'F');
        doc.setTextColor(30, 30, 30);
        doc.text('Month Total', colX.partner, y);
        doc.text(`$${monthGross.toFixed(2)}`, colX.gross, y, { align: 'right' });
        doc.text(`$${monthExpenses.toFixed(2)}`, colX.expenses, y, { align: 'right' });
        doc.text(`$${monthNet.toFixed(2)}`, colX.net, y, { align: 'right' });
        doc.text(`$${monthPayout.toFixed(2)}`, colX.payout, y, { align: 'right' });
        doc.text(`$${monthPaid.toFixed(2)}`, colX.paid, y, { align: 'right' });
        doc.text(`$${monthPending.toFixed(2)}`, colX.pending, y, { align: 'right' });
        y += 8;

        grandGross += monthGross;
        grandExpenses += monthExpenses;
        grandNet += monthNet;
        grandPayout += monthPayout;
        grandPaid += monthPaid;
        grandPending += monthPending;
      }

      // Grand totals
      checkPageBreak();
      y += 3;
      doc.setFillColor(168, 85, 247);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('GRAND TOTAL', colX.partner, y + 1);
      doc.text(`$${grandGross.toFixed(2)}`, colX.gross, y + 1, { align: 'right' });
      doc.text(`$${grandExpenses.toFixed(2)}`, colX.expenses, y + 1, { align: 'right' });
      doc.text(`$${grandNet.toFixed(2)}`, colX.net, y + 1, { align: 'right' });
      doc.text(`$${grandPayout.toFixed(2)}`, colX.payout, y + 1, { align: 'right' });
      doc.text(`$${grandPaid.toFixed(2)}`, colX.paid, y + 1, { align: 'right' });
      doc.text(`$${grandPending.toFixed(2)}`, colX.pending, y + 1, { align: 'right' });
      y += 12;

      // Footer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('The Mainstream Frequency — Admin Partner Payout Report', margin, pageHeight - 5);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 5, { align: 'right' });

      const filename = `monthly-payout-summary-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('Monthly summary report downloaded');
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1.5"
      onClick={handleExport}
      disabled={generating || !earnings || earnings.length === 0}
    >
      {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
      Export Monthly Summary
    </Button>
  );
}