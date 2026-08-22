import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Generates a printable PDF sales log for an artist's direct song purchases.
// `sales` matches the shape produced by DirectSalesHistory: [{ order, item }].
export default function SalesLogPdfExport({ sales = [], artistProfile }) {
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    if (sales.length === 0) return;
    setBusy(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;
      const right = pageW - margin;
      let y = margin;

      const gross = sales.reduce(
        (sum, s) => sum + (s.item.price || 0) * (s.item.quantity || 1),
        0
      );

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Song Sales Log', margin, y);
      y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Artist: ${artistProfile?.artist_name || '—'}`, margin, y);
      y += 14;
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 14;
      doc.text(
        `Total sales: ${sales.length}   Gross revenue: $${gross.toFixed(2)}`,
        margin,
        y
      );
      y += 24;

      // Columns
      const cols = [
        { key: 'date', label: 'Date', x: margin, w: 70, align: 'left' },
        { key: 'order', label: 'Order #', x: margin + 70, w: 80, align: 'left' },
        { key: 'song', label: 'Song', x: margin + 150, w: 160, align: 'left' },
        { key: 'fan', label: 'Fan', x: margin + 310, w: 120, align: 'left' },
        { key: 'price', label: 'Price', x: margin + 430, w: 42, align: 'right' },
        { key: 'qty', label: 'Qty', x: margin + 472, w: 28, align: 'right' },
        { key: 'total', label: 'Total', x: margin + 500, w: right - (margin + 500), align: 'right' },
      ];

      // Table header row
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(30, 30, 45);
      doc.rect(margin, y - 10, right - margin, 16, 'F');
      doc.setTextColor(255, 255, 255);
      cols.forEach((c) => {
        doc.text(c.label, c.align === 'right' ? c.x + c.w : c.x, y, {
          align: c.align === 'right' ? 'right' : 'left',
        });
      });
      y += 18;
      doc.setTextColor(20, 20, 20);

      // Rows
      doc.setFont('helvetica', 'normal');
      const rowH = 16;
      const truncate = (str, max) =>
        str.length > max ? str.slice(0, Math.max(0, max - 1)) + '\u2026' : str;

      sales.forEach((s, i) => {
        if (y > pageH - margin - 24) {
          doc.addPage();
          y = margin;
        }
        const vals = {
          date: s.order.created_date
            ? new Date(s.order.created_date).toLocaleDateString()
            : '\u2014',
          order: s.order.order_number || '\u2014',
          song: truncate(s.item.product_title || 'Untitled', 28),
          fan: truncate(s.order.fan_name || s.order.fan_email || 'Anonymous', 20),
          price: `$${Number(s.item.price || 0).toFixed(2)}`,
          qty: String(s.item.quantity || 1),
          total: `$${((s.item.price || 0) * (s.item.quantity || 1)).toFixed(2)}`,
        };
        if (i % 2 === 1) {
          doc.setFillColor(245, 245, 248);
          doc.rect(margin, y - 11, right - margin, rowH, 'F');
        }
        cols.forEach((c) => {
          doc.text(vals[c.key], c.align === 'right' ? c.x + c.w : c.x, y, {
            align: c.align === 'right' ? 'right' : 'left',
          });
        });
        y += rowH;
      });

      // Grand total line
      y += 8;
      doc.setDrawColor(150);
      doc.line(margin + 430, y - 12, right, y - 12);
      doc.setFont('helvetica', 'bold');
      doc.text('Total', margin + 430, y, { align: 'left' });
      doc.text(`$${gross.toFixed(2)}`, right, y, { align: 'right' });

      // Footer / page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text('The Mainstream Frequency \u2014 Song Sales Log', margin, pageH - 20, {
          align: 'left',
        });
        doc.text(`Page ${p} of ${pageCount}`, pageW / 2, pageH - 20, { align: 'center' });
      }

      const safeName = (artistProfile?.artist_name || 'artist').replace(/[^a-z0-9]+/gi, '_');
      doc.save(`song_sales_log_${safeName}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      disabled={sales.length === 0 || busy}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      Export PDF
    </Button>
  );
}