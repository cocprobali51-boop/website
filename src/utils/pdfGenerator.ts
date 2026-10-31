import { jsPDF } from 'jspdf';
import { Invoice, SupplierProfile } from '../types';

export type DocLanguage = 'id' | 'en';

function formatFullDate(dateStr: string, lang: DocLanguage = 'id'): string {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const monthsId = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const monthsEn = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${day} ${lang === 'en' ? monthsEn[month - 1] : monthsId[month - 1]} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatRpCompact(amount: number): string {
  const isNeg = amount < 0;
  const formatted = new Intl.NumberFormat('id-ID').format(Math.abs(Math.round(amount)));
  return isNeg ? `-Rp${formatted}` : `Rp${formatted}`;
}

export function downloadInvoicePDF(
  invoice: Invoice,
  supplier: SupplierProfile,
  docMode: 'INVOICE' | 'SURAT_JALAN' = 'INVOICE',
  lang: DocLanguage = 'id'
): void {
  const isEn = lang === 'en';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2; // 170mm
  let cursorY = 22;

  // 1. Centered Header Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const docTitle =
    docMode === 'INVOICE' ? 'INVOICE' : isEn ? 'DELIVERY NOTE' : 'SURAT JALAN';
  doc.text(docTitle, pageWidth / 2, cursorY, {
    align: 'center',
  });

  cursorY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(supplier.companyName || 'KaryaVilla Supply', pageWidth / 2, cursorY, {
    align: 'center',
  });

  if (supplier.address) {
    cursorY += 5;
    doc.text(supplier.address, pageWidth / 2, cursorY, { align: 'center' });
  }

  const contactLine = [supplier.email, supplier.phone]
    .filter((v) => v && v !== '-')
    .join(' · ');
  if (contactLine) {
    cursorY += 5;
    doc.text(contactLine, pageWidth / 2, cursorY, { align: 'center' });
  }

  if (supplier.socialMedia && supplier.socialMedia !== '-') {
    cursorY += 5;
    doc.text(supplier.socialMedia, pageWidth / 2, cursorY, { align: 'center' });
  }

  cursorY += 12;

  // 2. Two-Column Metadata Section
  const leftColX = marginX;
  const rightColX = pageWidth / 2 + 8;
  const rightColMaxWidth = pageWidth - marginX - rightColX;

  let leftY = cursorY;
  let rightY = cursorY;

  // Left 1: Nomor Invoice
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    docMode === 'INVOICE'
      ? 'Invoice'
      : isEn
      ? 'Delivery Note No.'
      : 'Nomor Surat Jalan',
    leftColX,
    leftY
  );
  leftY += 5;
  doc.setFont('helvetica', 'normal');
  const displayInvNo =
    docMode === 'INVOICE'
      ? invoice.invoiceNumber
      : invoice.invoiceNumber.replace('INV/', isEn ? 'DN/' : 'SJ/');
  doc.text(displayInvNo, leftColX, leftY);

  // Left 2: Tanggal Terbit / Issue Date
  leftY += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(isEn ? 'Issue Date' : 'Tanggal Terbit', leftColX, leftY);
  leftY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(formatFullDate(invoice.issueDate, lang), leftColX, leftY);

  // Left 3: Status (only on Invoice)
  if (docMode === 'INVOICE') {
    leftY += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Status', leftColX, leftY);
    leftY += 5;
    doc.setFont('helvetica', 'normal');
    const statusText = isEn
      ? invoice.status === 'PAID'
        ? 'Paid'
        : invoice.status === 'PARTIAL'
        ? 'Partially Paid'
        : invoice.status === 'CANCELLED'
        ? 'Cancelled'
        : 'Unpaid'
      : invoice.status === 'PAID'
      ? 'Sudah Dibayar (Lunas)'
      : invoice.status === 'PARTIAL'
      ? 'Dibayar Sebagian (DP)'
      : invoice.status === 'CANCELLED'
      ? 'Dibatalkan'
      : 'Belum Dibayar';
    doc.text(statusText, leftColX, leftY);
  }

  // Right Column: Ditagihkan Kepada / Billed To
  doc.setFont('helvetica', 'bold');
  doc.text(
    docMode === 'INVOICE'
      ? isEn
        ? 'Billed To'
        : 'Ditagihkan Kepada'
      : isEn
      ? 'Delivered To'
      : 'Dikirimkan Kepada',
    rightColX,
    rightY
  );
  rightY += 5;
  doc.setFont('helvetica', 'normal');
  const villaNameLines = doc.splitTextToSize(invoice.villaName || '-', rightColMaxWidth);
  doc.text(villaNameLines, rightColX, rightY);
  rightY += villaNameLines.length * 5;

  if (invoice.villaAddress) {
    const addrLines = doc.splitTextToSize(invoice.villaAddress, rightColMaxWidth);
    doc.text(addrLines, rightColX, rightY);
    rightY += addrLines.length * 5;
  }

  if (invoice.villaContact && invoice.villaContact !== '-') {
    const attnPrefix = isEn ? 'Attn:' : 'UP:';
    const contactLines = doc.splitTextToSize(`${attnPrefix} ${invoice.villaContact}`, rightColMaxWidth);
    doc.text(contactLines, rightColX, rightY);
    rightY += contactLines.length * 5;
  }

  cursorY = Math.max(leftY, rightY) + 12;

  // 3. Full-Bordered Table with Blue Header (#1976D2)
  const colWidths =
    docMode === 'INVOICE'
      ? [78, 16, 22, 27, 27]
      : [96, 20, 24, 30];

  const headers =
    docMode === 'INVOICE'
      ? isEn
        ? ['Description', 'Qty', 'Unit', 'Unit Price', 'Subtotal']
        : ['Deskripsi', 'Qty', 'Satuan', 'Harga Satuan', 'Subtotal']
      : isEn
      ? ['Description', 'Qty', 'Unit', 'Remarks / Check']
      : ['Deskripsi', 'Qty', 'Satuan', 'Keterangan / Cek'];

  const headerHeight = 9;
  doc.setLineWidth(0.3);

  let colX = marginX;
  headers.forEach((hText, idx) => {
    const w = colWidths[idx];
    doc.setFillColor(25, 118, 210); // #1976D2
    doc.setDrawColor(30, 41, 59);
    doc.rect(colX, cursorY, w, headerHeight, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(hText, colX + w / 2, cursorY + 6, { align: 'center' });
    colX += w;
  });

  cursorY += headerHeight;

  // Table Body Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  invoice.items.forEach((item) => {
    const descLines = doc.splitTextToSize(item.name || '-', colWidths[0] - 5);
    const rowHeight = Math.max(8.5, descLines.length * 5 + 3.5);

    if (cursorY + rowHeight > 260) {
      doc.addPage();
      cursorY = 20;
    }

    let cellX = marginX;
    const rowValues =
      docMode === 'INVOICE'
        ? [
            descLines,
            String(item.quantity),
            item.unit || 'Pcs',
            formatRpCompact(item.unitPrice),
            formatRpCompact(item.subtotal),
          ]
        : [
            descLines,
            String(item.quantity),
            item.unit || 'Pcs',
            isEn ? '[    ] Complete' : '[    ] Lengkap',
          ];

    rowValues.forEach((val, cIdx) => {
      const w = colWidths[cIdx];
      doc.setDrawColor(30, 41, 59);
      doc.rect(cellX, cursorY, w, rowHeight, 'S');
      doc.setTextColor(15, 23, 42);
      doc.text(val, cellX + 2.5, cursorY + 5.5);
      cellX += w;
    });

    cursorY += rowHeight;
  });

  cursorY += 10;

  // 4. Right-Aligned Totals Block (Only for Invoice)
  if (docMode === 'INVOICE') {
    const labelX = marginX + colWidths[0] + colWidths[1] + colWidths[2];
    const valueX = marginX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal', labelX, cursorY);
    doc.text(formatRpCompact(invoice.subtotal), valueX, cursorY);
    cursorY += 6.5;

    if (invoice.discountAmount > 0) {
      doc.text(isEn ? 'Discount' : 'Diskon', labelX, cursorY);
      doc.text(`-${formatRpCompact(invoice.discountAmount)}`, valueX, cursorY);
      cursorY += 6.5;
    }

    if (invoice.taxAmount > 0) {
      doc.text(isEn ? `VAT ${invoice.taxRate}%` : `PPN ${invoice.taxRate}%`, labelX, cursorY);
      doc.text(formatRpCompact(invoice.taxAmount), valueX, cursorY);
      cursorY += 6.5;
    }

    cursorY += 1;
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'Total Amount' : 'Total Tagihan', labelX, cursorY);
    doc.text(formatRpCompact(invoice.totalAmount), valueX, cursorY);

    if (invoice.paidAmount > 0 && invoice.paidAmount < invoice.totalAmount) {
      const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      cursorY += 6.5;
      doc.setFont('helvetica', 'normal');
      doc.text(isEn ? 'Down Payment (DP)' : 'DP / Telah Dibayar', labelX, cursorY);
      doc.text(`-${formatRpCompact(invoice.paidAmount)}`, valueX, cursorY);

      cursorY += 6.5;
      doc.setFont('helvetica', 'bold');
      doc.text(isEn ? 'Balance Due' : 'Sisa Tagihan', labelX, cursorY);
      doc.text(formatRpCompact(remaining), valueX, cursorY);
    }

    cursorY += 12;
  } else {
    cursorY += 4;
  }

  // 5. Bottom Bordered Box (Informasi Pembayaran / Payment Information)
  if (docMode === 'INVOICE') {
    const boxHeight = 25;
    if (cursorY + boxHeight > 275) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.35);
    doc.rect(marginX, cursorY, contentWidth, boxHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      isEn ? 'Payment Information' : 'Informasi Pembayaran',
      marginX + 4,
      cursorY + 6.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const bankLine = isEn
      ? `${supplier.bankName} · Account No. ${supplier.bankAccountNumber} · Account Name: ${supplier.bankAccountName}`
      : `${supplier.bankName} · No Rekening ${supplier.bankAccountNumber} · a.n ${supplier.bankAccountName}`;
    doc.text(bankLine, marginX + 4, cursorY + 13);

    const confirmLine = isEn
      ? `Kindly confirm your payment along with the transfer receipt via the WhatsApp number listed above (${supplier.phone}).`
      : `Mohon melakukan konfirmasi pembayaran beserta bukti transfer melalui nomor WhatsApp yang tercantum (${supplier.phone}).`;
    const wrappedConfirm = doc.splitTextToSize(confirmLine, contentWidth - 8);
    doc.text(wrappedConfirm, marginX + 4, cursorY + 18.5);
  } else {
    const boxHeight = 40;
    if (cursorY + boxHeight > 275) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.35);
    doc.rect(marginX, cursorY, contentWidth, boxHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      isEn ? 'Handover Note:' : 'Catatan Serah Terima Barang:',
      marginX + 4,
      cursorY + 6.5
    );
    doc.setFont('helvetica', 'normal');
    doc.text(
      isEn
        ? 'All items have been inspected and received in good condition.'
        : 'Barang telah diperiksa dan diterima dalam jumlah serta kondisi baik.',
      marginX + (isEn ? 32 : 55),
      cursorY + 6.5
    );

    const leftSignCenter = marginX + contentWidth * 0.25;
    const rightSignCenter = marginX + contentWidth * 0.75;
    doc.text(
      isEn ? 'Received By (Villa),' : 'Penerima Pihak Villa,',
      leftSignCenter,
      cursorY + 15,
      { align: 'center' }
    );
    doc.text(
      isEn ? `Delivered By (${supplier.companyName}),` : `Pengirim (${supplier.companyName}),`,
      rightSignCenter,
      cursorY + 15,
      { align: 'center' }
    );

    doc.text(
      `( ${invoice.villaContact || invoice.villaName} )`,
      leftSignCenter,
      cursorY + 34,
      { align: 'center' }
    );
    doc.text(`( ${supplier.signeeName} )`, rightSignCenter, cursorY + 34, { align: 'center' });
  }

  const prefix = docMode === 'INVOICE' ? '' : isEn ? 'Delivery_Note_' : 'Surat_Jalan_';
  const safeInv = (invoice.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeVilla = (invoice.villaName || 'Villa').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${prefix}${safeInv}_${safeVilla}.pdf`);
}
