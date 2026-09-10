/**
 * Helper functions for Jastip Management
 */

// Format numbers with dot thousand separators (e.g. 13000 -> "13.000")
export function formatNumber(num: number): string {
  const rounded = Math.round(num);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Format KRW currency string (e.g. 65520 -> "65.520 KRW")
export function formatKRW(num: number): string {
  return `${formatNumber(num)} KRW`;
}

// Format IDR currency string (e.g. 150000 -> "Rp150.000")
export function formatIDR(num: number): string {
  return `Rp${formatNumber(num)}`;
}

// Format weight to max 3 decimals without trailing zeros (e.g. 1.000 -> "1", 1.250 -> "1.25", 5.964 -> "5.964")
export function formatWeight(weightKg: number): string {
  if (isNaN(weightKg)) return '0';
  // Round to max 3 decimal places
  const rounded = Math.round(weightKg * 1000) / 1000;
  return rounded.toString();
}

export interface ExtraChargeItem {
  id?: string;
  name: string;
  currency: 'KRW' | 'IDR';
  amount: number;
}

export interface InvoiceCalculationInput {
  customerName: string;
  route: string; // "ICN → CGK" | "CGK → ICN"
  weightKg: number;
  itemCount: number;
  pickupOrDelivery: 'pickup' | 'delivery';
  applyPickupDiscount?: boolean;
  extraCharges: ExtraChargeItem[];
  // Setting params for the route
  normalPricePerKg: number;
  over5kgPricePerKg: number;
  pickupDiscountPerKg: number;
  enableOver5kgPrice: boolean;
  enablePickupDiscount: boolean;
  krwBankAccount?: string;
  idrBankAccount?: string;
}

export interface InvoiceCalculationResult {
  basePricePerKg: number;
  pickupDiscountApplied: number; // 0 if not applied
  isPickupDiscountActive: boolean;
  finalPricePerKg: number;
  shippingSubtotalKRW: number;
  extraKRW: ExtraChargeItem[];
  extraIDR: ExtraChargeItem[];
  totalExtraKRW: number;
  totalExtraIDR: number;
  totalKRW: number;
  totalIDR: number;
}

export function calculateInvoice(input: InvoiceCalculationInput): InvoiceCalculationResult {
  const weight = input.weightKg || 0;
  
  // 1. Determine base price per kg
  let basePricePerKg = input.normalPricePerKg;
  if (input.enableOver5kgPrice && weight > 5 && input.over5kgPricePerKg > 0) {
    basePricePerKg = input.over5kgPricePerKg;
  }

  // 2. Pickup discount check
  let pickupDiscountApplied = 0;
  const isPickupDiscountActive = 
    input.pickupOrDelivery === 'pickup' && 
    input.enablePickupDiscount && 
    (input.applyPickupDiscount !== false) &&
    input.pickupDiscountPerKg > 0;

  if (isPickupDiscountActive) {
    pickupDiscountApplied = input.pickupDiscountPerKg;
  }

  const finalPricePerKg = Math.max(0, basePricePerKg - pickupDiscountApplied);

  // 3. Shipping subtotal KRW
  const shippingSubtotalKRW = Math.round(weight * finalPricePerKg);

  // 4. Split extra charges
  const extraKRW = (input.extraCharges || []).filter(item => item.currency === 'KRW' && item.amount > 0);
  const extraIDR = (input.extraCharges || []).filter(item => item.currency === 'IDR' && item.amount > 0);

  const totalExtraKRW = extraKRW.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExtraIDR = extraIDR.reduce((sum, item) => sum + (item.amount || 0), 0);

  const totalKRW = Math.round(shippingSubtotalKRW + totalExtraKRW);
  const totalIDR = Math.round(totalExtraIDR);

  return {
    basePricePerKg,
    pickupDiscountApplied,
    isPickupDiscountActive,
    finalPricePerKg,
    shippingSubtotalKRW,
    extraKRW,
    extraIDR,
    totalExtraKRW,
    totalExtraIDR,
    totalKRW,
    totalIDR,
  };
}

/**
 * Generate formatted WhatsApp / Kakao totalan text
 */
export function generateTotalanText(
  input: InvoiceCalculationInput,
  calc: InvoiceCalculationResult
): string {
  const weightStr = formatWeight(input.weightKg);
  const lines: string[] = [];

  lines.push('Halo kak, barangnya sudah siap dipickup hari ini atau dikirim besok ya. Berikut totalannya ya kak.');
  lines.push('');
  lines.push('Nanti silakan bisa ditimbang ulang saat barang sudah diterima. Jika ada selisih berat, insyaAllah akan kami refund sesuai selisihnya ya kak.');
  lines.push('');
  lines.push(`${input.customerName}: ${weightStr}kg`);
  lines.push(`Items: ${input.itemCount} pcs`);
  lines.push('');
  lines.push(`Total: ${weightStr}kg`);
  lines.push(`Harga: ${formatNumber(calc.basePricePerKg)}/kg`);

  if (calc.isPickupDiscountActive && calc.pickupDiscountApplied > 0) {
    lines.push(`Diskon pickup: -${formatNumber(calc.pickupDiscountApplied)}/kg`);
    lines.push(`Harga setelah diskon: ${formatNumber(calc.finalPricePerKg)}/kg`);
  }

  // Extra KRW section
  if (calc.extraKRW.length > 0) {
    lines.push('');
    lines.push('Tambahan:');
    calc.extraKRW.forEach((item) => {
      lines.push(`• ${item.name}: ${formatNumber(item.amount)} KRW`);
    });
  }

  // Extra IDR section
  if (calc.extraIDR.length > 0) {
    lines.push('');
    lines.push('Tambahan IDR:');
    calc.extraIDR.forEach((item) => {
      lines.push(`• ${item.name}: Rp${formatNumber(item.amount)}`);
    });
  }

  lines.push('');
  lines.push(`Total KRW: ${formatNumber(calc.totalKRW)} KRW`);

  if (calc.totalIDR > 0) {
    lines.push(`Total IDR: Rp${formatNumber(calc.totalIDR)}`);
  }

  // Bank Accounts
  lines.push('');
  if (input.krwBankAccount) {
    lines.push(input.krwBankAccount.trim());
  }

  if (calc.totalIDR > 0 && input.idrBankAccount) {
    lines.push('');
    lines.push(input.idrBankAccount.trim());
  }

  lines.push('');
  const methodLabel = input.pickupOrDelivery === 'pickup' ? 'Pickup' : 'Kirim';
  lines.push(`Harga di atas berdasarkan asumsi ${methodLabel} ya, jika ingin ada perubahan metode, bisa dikabari`);

  lines.push('');
  if (input.pickupOrDelivery === 'pickup') {
    lines.push(
      'Untuk pengambilan barang bisa janjian lebih lanjut di chat ini ya kak. Untuk pelunasan, bisa dilakukan sebelum pickup ya (ongkir lokal dibayarkan terpisah setelah resi keluar) 🙏'
    );
  } else {
    lines.push(
      'Untuk pengiriman, bisa diinfokan alamat kirimnya ya. Untuk pelunasan, bisa dilakukan sebelum barang dikirim ya (ongkir lokal dibayarkan terpisah setelah resi keluar) 🙏'
    );
  }

  return lines.join('\n');
}

/**
 * Clean text for standard PDF Helvetica font (replaces arrows, strips unsupported non-ASCII Hangul)
 */
export function cleanPdfText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/→/g, '->')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .split('\n')
    .map((line) =>
      line
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((line) => line.length > 0)
    .join('\n');
}

