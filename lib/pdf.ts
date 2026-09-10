import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNumber, formatWeight, formatKRW, formatIDR, cleanPdfText } from './utils';
import { LOGO_BASE64 } from './logoBase64';

export interface PDFInvoiceData {
  invoiceNumber: string;
  createdAt: string | Date;
  customerName: string;
  route: string;
  weightKg: number;
  itemCount: number;
  pickupOrDelivery: string; // 'pickup' | 'delivery'
  basePricePerKg: number;
  pickupDiscountPerKg: number;
  finalPricePerKg: number;
  shippingSubtotalKRW: number;
  totalKRW: number;
  totalIDR: number;
  paymentStatus: string;
  deliveryStatus: string;
  paymentCurrencyPreference?: string; // "ORIGINAL" | "FULL_KRW" | "FULL_IDR"
  exchangeRateUsed?: number;
  fullIDRTotal?: number;
  fullKRWTotal?: number;
  customerNote?: string | null;
  internalLabelColor?: string | null;
  showLabelToCustomer?: boolean;
  extraCharges?: Array<{ name: string; currency: string; amount: number }>;
  krwBankAccount?: string;
  idrBankAccount?: string;
}

export function generateInvoicePDF(data: PDFInvoiceData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const blackColor: [number, number, number] = [15, 23, 42]; // #0f172a (Deep Slate / Black)
  const secondaryTextColor: [number, number, number] = [71, 85, 105]; // Slate 600
  const borderColor: [number, number, number] = [203, 213, 225]; // Slate 300
  const lightBgColor: [number, number, number] = [248, 250, 252]; // Slate 50

  // 1. TOP HEADER - Prominent Square Logo (Left) & Invoice Title (Right)
  // Draw Logo (34mm x 34mm)
  try {
    doc.addImage(LOGO_BASE64, 'PNG', 14, 8, 34, 34);
  } catch (err) {
    console.error('Failed to render logo in PDF', err);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.text('BAHY & CO JASTIP', 14, 20);
  }

  // Invoice Title & Metadata (Right side)
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.text('INVOICE', 196, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
  doc.text(`Invoice No: ${data.invoiceNumber}`, 196, 24, { align: 'right' });

  const dateObj = typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt;
  const dateStr = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Tanggal: ${dateStr}`, 196, 29, { align: 'right' });

  // Status Badge right header
  const statusStr = data.paymentStatus.toUpperCase();
  doc.setDrawColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(164, 32, 32, 6, 1, 1, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.text(statusStr, 180, 36.2, { align: 'center' });

  // Divider Line below header
  doc.setDrawColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.setLineWidth(0.6);
  doc.line(14, 44, 196, 44);

  // 2. CUSTOMER & SHIPMENT DETAILS CARD (2 Columns)
  let y = 49;
  const cardHeight = data.customerNote ? 34 : 28;

  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(14, y, 182, cardHeight, 1.5, 1.5, 'FD');

  // Left Column: Customer details
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
  doc.text('DITERBITKAN UNTUK:', 18, y + 6);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.text(cleanPdfText(data.customerName), 18, y + 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.text(`Berat Total: ${formatWeight(data.weightKg)} kg  |  Jumlah Item: ${data.itemCount} pcs`, 18, y + 18);

  if (data.showLabelToCustomer && data.internalLabelColor) {
    doc.text(`Label: ${cleanPdfText(data.internalLabelColor)}`, 18, y + 23);
  }

  // Right Column: Route & Delivery Method
  const cleanedRoute = cleanPdfText(data.route);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
  doc.text('RUTE & METODE:', 120, y + 6);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.text(`Rute: ${cleanedRoute}`, 120, y + 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const methodStr = data.pickupOrDelivery === 'pickup' ? 'PICKUP (Ambil Sendiri)' : 'DELIVERY (Kirim Resi)';
  doc.text(`Metode: ${methodStr}`, 120, y + 18);

  if (data.customerNote) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text(`Catatan: "${cleanPdfText(data.customerNote)}"`, 18, y + (data.showLabelToCustomer ? 28 : 25));
  }

  y += cardHeight + 6;

  // 3. TABLE ITEMS
  const tableRows: any[] = [];

  // Shipping item row
  let shippingDesc = `Ongkir Jastip (${cleanedRoute})\nTarif: ${formatWeight(data.weightKg)} kg x ${formatNumber(data.basePricePerKg)} KRW/kg`;
  if (data.pickupDiscountPerKg > 0 && data.pickupOrDelivery === 'pickup') {
    shippingDesc += `\nDiskon Pickup: -${formatNumber(data.pickupDiscountPerKg)} KRW/kg (Net: ${formatNumber(data.finalPricePerKg)} KRW/kg)`;
  }

  tableRows.push([
    '1',
    shippingDesc,
    `${formatWeight(data.weightKg)} kg`,
    `${formatNumber(data.finalPricePerKg)} KRW`,
    `${formatNumber(data.shippingSubtotalKRW)} KRW`,
  ]);

  // Extra charges rows
  if (data.extraCharges && data.extraCharges.length > 0) {
    data.extraCharges.forEach((extra, idx) => {
      const formattedAmount = extra.currency === 'KRW'
        ? `${formatNumber(extra.amount)} KRW`
        : `Rp${formatNumber(extra.amount)}`;

      tableRows.push([
        (idx + 2).toString(),
        `Tambahan: ${cleanPdfText(extra.name)} (${extra.currency})`,
        '1 pcs',
        formattedAmount,
        formattedAmount,
      ]);
    });
  }

  autoTable(doc, {
    startY: y,
    head: [['No', 'Deskripsi / Item', 'Qty / Berat', 'Harga Satuan', 'Subtotal']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: blackColor as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    bodyStyles: {
      textColor: blackColor as [number, number, number],
      fontSize: 9,
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 6;

  // 4. TOTALS BOX (Right) & PAYMENT INSTRUCTIONS (Left)

  // Payment Instructions (Left Side)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.text('PETUNJUK PEMBAYARAN:', 14, finalY + 4);

  let bankY = finalY + 9;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);

  const cleanedKrwBank = cleanPdfText(data.krwBankAccount);
  if (cleanedKrwBank) {
    doc.setFont('helvetica', 'bold');
    doc.text('[ Rekening KRW ]', 14, bankY);
    bankY += 4.5;
    doc.setFont('helvetica', 'normal');
    const krwLines = doc.splitTextToSize(cleanedKrwBank, 95);
    doc.text(krwLines, 14, bankY);
    bankY += krwLines.length * 4.5;
  }

  const cleanedIdrBank = cleanPdfText(data.idrBankAccount);
  if (data.totalIDR > 0 && cleanedIdrBank) {
    bankY += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('[ Rekening IDR ]', 14, bankY);
    bankY += 4.5;
    doc.setFont('helvetica', 'normal');
    const idrLines = doc.splitTextToSize(cleanedIdrBank, 95);
    doc.text(idrLines, 14, bankY);
    bankY += idrLines.length * 4.5;
  }

  // Summary Totals Box (Right Side)
  const pref = data.paymentCurrencyPreference || 'ORIGINAL';
  let summaryBoxHeight = 18;
  if (pref === 'FULL_IDR' || pref === 'FULL_KRW' || data.totalIDR > 0) {
    summaryBoxHeight = 32;
  }

  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.setDrawColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(120, finalY, 76, summaryBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.text('TOTAL KRW:', 124, finalY + 6);
  doc.text(`${formatKRW(data.totalKRW)}`, 192, finalY + 6, { align: 'right' });

  let curY = finalY + 13;

  if (data.totalIDR > 0) {
    doc.line(124, finalY + 8.5, 192, finalY + 8.5);
    doc.text('TOTAL IDR:', 124, curY);
    doc.text(`${formatIDR(data.totalIDR)}`, 192, curY, { align: 'right' });
    curY += 7;
  }

  if (pref === 'FULL_IDR' && data.fullIDRTotal) {
    doc.line(124, curY - 4.5, 192, curY - 4.5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text('TOTAL FULL IDR:', 124, curY + 2);
    doc.text(`${formatIDR(data.fullIDRTotal)}`, 192, curY + 2, { align: 'right' });
  } else if (pref === 'FULL_KRW' && data.fullKRWTotal) {
    doc.line(124, curY - 4.5, 192, curY - 4.5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199); // Sky
    doc.text('TOTAL FULL KRW:', 124, curY + 2);
    doc.text(`${formatKRW(data.fullKRWTotal)}`, 192, curY + 2, { align: 'right' });
  }

  // 5. FOOTER GUARANTEE NOTE BOX
  const footerY = Math.max(finalY + summaryBoxHeight + 8, bankY + 4);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(14, footerY, 182, 14, 1, 1, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.text('Catatan & Garansi Penimbangan:', 18, footerY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
  doc.text(
    '“Silakan bisa ditimbang ulang saat barang diterima. Jika ada selisih berat, insyaAllah akan kami refund sesuai selisihnya.”',
    18,
    footerY + 9.5
  );

  return doc;
}
