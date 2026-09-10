'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Copy,
  FileDown,
  Save,
  CheckCircle2,
  Calculator,
  MessageSquare,
  Sparkles,
  PackageCheck,
  Tag,
} from 'lucide-react';
import {
  calculateInvoice,
  generateTotalanText,
  formatNumber,
  formatWeight,
  formatKRW,
  formatIDR,
  ExtraChargeItem,
} from '@/lib/utils';
import { generateInvoicePDF } from '@/lib/pdf';

interface RouteSetting {
  route: string;
  normal_price_per_kg: number;
  over_5kg_price_per_kg: number;
  pickup_discount_per_kg: number;
  enable_over_5kg_price: boolean;
  enable_pickup_discount: boolean;
  exchange_rate_krw_to_idr?: number;
  krw_bank_account: string;
  idr_bank_account: string;
}

export default function CreateInvoicePage() {
  const router = useRouter();

  const [settingsMap, setSettingsMap] = useState<Record<string, RouteSetting>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [route, setRoute] = useState('CGK → ICN');
  const [weightKg, setWeightKg] = useState<string>('');
  const [itemCount, setItemCount] = useState<string>('1');
  const [pickupOrDelivery, setPickupOrDelivery] = useState<'pickup' | 'delivery'>('delivery');
  const [applyPickupDiscount, setApplyPickupDiscount] = useState(true);
  const [paymentCurrencyPreference, setPaymentCurrencyPreference] = useState<'ORIGINAL' | 'FULL_KRW' | 'FULL_IDR'>('ORIGINAL');
  const [customerNote, setCustomerNote] = useState('');
  const [internalLabelColor, setInternalLabelColor] = useState('');
  const [showLabelToCustomer, setShowLabelToCustomer] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [deliveryStatus, setDeliveryStatus] = useState('Pending');

  // Extra Charges
  const [extraCharges, setExtraCharges] = useState<ExtraChargeItem[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch route settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (Array.isArray(data)) {
          const map: Record<string, RouteSetting> = {};
          data.forEach((s: RouteSetting) => {
            map[s.route] = s;
          });
          setSettingsMap(map);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  const currentSetting = useMemo(() => {
    return (
      settingsMap[route] || {
        route,
        normal_price_per_kg: route.includes('ICN') ? 13000 : 9500,
        over_5kg_price_per_kg: route.includes('CGK') ? 9000 : 0,
        pickup_discount_per_kg: route.includes('CGK') ? 500 : 0,
        enable_over_5kg_price: route.includes('CGK'),
        enable_pickup_discount: route.includes('CGK'),
        krw_bank_account: `토스뱅크 Toss Bank\n100043237236\nPutra Bahy Helmi Hartoyo`,
        idr_bank_account: `BCA 8410928123\na.n. Putra Bahy Helmi Hartoyo`,
      }
    );
  }, [settingsMap, route]);

  // Update pickup discount checkbox default when switching pickup/delivery
  useEffect(() => {
    if (pickupOrDelivery === 'pickup' && currentSetting.enable_pickup_discount) {
      setApplyPickupDiscount(true);
    }
  }, [pickupOrDelivery, currentSetting]);

  // Live Calculations
  const parsedWeight = parseFloat(weightKg) || 0;
  const parsedItems = parseInt(itemCount) || 1;

  const calculationInput = useMemo(() => {
    return {
      customerName: customerName || 'Nama Customer',
      route,
      weightKg: parsedWeight,
      itemCount: parsedItems,
      pickupOrDelivery,
      applyPickupDiscount,
      extraCharges,
      normalPricePerKg: currentSetting.normal_price_per_kg,
      over5kgPricePerKg: currentSetting.over_5kg_price_per_kg,
      pickupDiscountPerKg: currentSetting.pickup_discount_per_kg,
      enableOver5kgPrice: currentSetting.enable_over_5kg_price,
      enablePickupDiscount: currentSetting.enable_pickup_discount,
      exchangeRateKRWtoIDR: currentSetting.exchange_rate_krw_to_idr || 11.5,
      paymentCurrencyPreference,
      krwBankAccount: currentSetting.krw_bank_account,
      idrBankAccount: currentSetting.idr_bank_account,
    };
  }, [
    customerName,
    route,
    parsedWeight,
    parsedItems,
    pickupOrDelivery,
    applyPickupDiscount,
    paymentCurrencyPreference,
    extraCharges,
    currentSetting,
  ]);

  const calcResult = useMemo(() => {
    return calculateInvoice(calculationInput);
  }, [calculationInput]);

  const generatedWAText = useMemo(() => {
    return generateTotalanText(calculationInput, calcResult);
  }, [calculationInput, calcResult]);

  // Handlers for Extra Charges
  const addExtraCharge = () => {
    setExtraCharges([...extraCharges, { id: Date.now().toString(), name: '', currency: 'KRW', amount: 0 }]);
  };

  const updateExtraCharge = (index: number, field: keyof ExtraChargeItem, value: any) => {
    const updated = [...extraCharges];
    updated[index] = { ...updated[index], [field]: value };
    setExtraCharges(updated);
  };

  const removeExtraCharge = (index: number) => {
    setExtraCharges(extraCharges.filter((_, i) => i !== index));
  };

  // Copy WhatsApp Text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatedWAText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Download PDF Preview
  const handleDownloadPDF = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const doc = generateInvoicePDF({
      invoiceNumber: `INV-${todayStr}-DRAFT`,
      createdAt: new Date(),
      customerName: customerName || 'Nama Customer',
      route,
      weightKg: parsedWeight,
      itemCount: parsedItems,
      pickupOrDelivery,
      basePricePerKg: calcResult.basePricePerKg,
      pickupDiscountPerKg: calcResult.pickupDiscountApplied,
      finalPricePerKg: calcResult.finalPricePerKg,
      shippingSubtotalKRW: calcResult.shippingSubtotalKRW,
      totalKRW: calcResult.totalKRW,
      totalIDR: calcResult.totalIDR,
      paymentStatus,
      deliveryStatus,
      customerNote,
      internalLabelColor,
      showLabelToCustomer,
      extraCharges,
      krwBankAccount: currentSetting.krw_bank_account,
      idrBankAccount: currentSetting.idr_bank_account,
    });

    doc.save(`Invoice_${customerName || 'Draft'}_${route.replace(/\s+/g, '_')}.pdf`);
  };

  // Submit Save Invoice
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Nama customer wajib diisi');
      return;
    }
    if (parsedWeight <= 0) {
      setErrorMsg('Berat total harus lebih dari 0 kg');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          route,
          weight_kg: parsedWeight,
          item_count: parsedItems,
          pickup_or_delivery: pickupOrDelivery,
          apply_pickup_discount: applyPickupDiscount,
          payment_currency_preference: paymentCurrencyPreference,
          customer_note: customerNote,
          internal_label_color: internalLabelColor,
          show_label_to_customer: showLabelToCustomer,
          payment_status: paymentStatus,
          delivery_status: deliveryStatus,
          extra_charges: extraCharges,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan invoice');
      }

      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Buat Invoice Baru</h1>
          <p className="text-slate-400 text-sm mt-1">
            Input detail pengiriman customer untuk menghitung totalan dan generate WhatsApp text & PDF.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-xl border border-slate-700 text-sm transition-all"
          >
            <FileDown className="w-4 h-4 text-sky-400" />
            <span>Download PDF</span>
          </button>
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center space-x-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 font-medium px-4 py-2.5 rounded-xl border border-sky-500/30 text-sm transition-all"
          >
            {copiedText ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-sky-400" />
                <span>Copy Text Totalan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Main Grid Form & Preview */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-4">
              <PackageCheck className="w-5 h-5 text-sky-400" />
              <span>Detail Customer & Pengiriman</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Nama Customer *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: WI Malioboro, Yuri, dll."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                  required
                />
              </div>

              {/* Route */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Rute Pengiriman *
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="CGK → ICN">CGK → ICN (Indo to Korea)</option>
                  <option value="ICN → CGK">ICN → CGK (Korea to Indo)</option>
                </select>
              </div>

              {/* Pickup / Delivery */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Metode Penerimaan *
                </label>
                <select
                  value={pickupOrDelivery}
                  onChange={(e) => setPickupOrDelivery(e.target.value as 'pickup' | 'delivery')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="delivery">Kirim / Delivery</option>
                  <option value="pickup">Pickup / Ambil Sendiri</option>
                </select>
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Total Berat (kg) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="misal: 5.964"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                    required
                  />
                  <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-semibold">kg</span>
                </div>
                {parsedWeight > 0 && (
                  <p className="text-xs text-sky-400 mt-1">
                    Format output: <strong className="text-white">{formatWeight(parsedWeight)}kg</strong>
                  </p>
                )}
              </div>

              {/* Item Count */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Jumlah Item (pcs) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={itemCount}
                  onChange={(e) => setItemCount(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="misal: 32"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                  required
                />
              </div>

              {/* Pickup Discount Toggle */}
              {pickupOrDelivery === 'pickup' && currentSetting.enable_pickup_discount && (
                <div className="md:col-span-2 bg-sky-950/30 border border-sky-800/40 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-sky-200">Diskon Pickup Rute</span>
                    <p className="text-xs text-sky-400">
                      Potongan {formatKRW(currentSetting.pickup_discount_per_kg)}/kg aktif untuk rute ini.
                    </p>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyPickupDiscount}
                      onChange={(e) => setApplyPickupDiscount(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-sky-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-white">Terapkan Diskon</span>
                  </label>
                </div>
              )}

              {/* Internal Label & Show Label Toggle */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Warna Label Internal (Optional)
                </label>
                <input
                  type="text"
                  value={internalLabelColor}
                  onChange={(e) => setInternalLabelColor(e.target.value)}
                  placeholder="misal: Merah / Dokument / Fragile"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLabelToCustomer}
                    onChange={(e) => setShowLabelToCustomer(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="text-sm text-slate-300">Tampilkan Label di Customer Output / PDF</span>
                </label>
              </div>

              {/* Optional Note */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Catatan Barang (Optional)
                </label>
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="misal: Ada dokumen, sate, fragile, frozen handling"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Extra Charges Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Tag className="w-5 h-5 text-indigo-400" />
                  <span>Tambahan Titip Barang / Service Khusus</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tambahkan biaya tambahan dalam KRW (misal Bubble Wrap) atau IDR (misal Belanja Barang Indo).
                </p>
              </div>
              <button
                type="button"
                onClick={addExtraCharge}
                className="flex items-center space-x-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold px-3 py-2 rounded-lg border border-indigo-500/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Item</span>
              </button>
            </div>

            {extraCharges.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                Belum ada tambahan titip barang. Klik &quot;Tambah Item&quot; untuk menambahkan.
              </div>
            ) : (
              <div className="space-y-3">
                {extraCharges.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800"
                  >
                    <input
                      type="text"
                      placeholder="Nama service/item (misal: Bubble Wrap Daiso)"
                      value={item.name}
                      onChange={(e) => updateExtraCharge(idx, 'name', e.target.value)}
                      className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none"
                    />

                    <select
                      value={item.currency}
                      onChange={(e) => updateExtraCharge(idx, 'currency', e.target.value as 'KRW' | 'IDR')}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-semibold outline-none"
                    >
                      <option value="KRW">KRW</option>
                      <option value="IDR">IDR (Rp)</option>
                    </select>

                    <input
                      type="number"
                      placeholder="Harga"
                      value={item.amount || ''}
                      onChange={(e) => updateExtraCharge(idx, 'amount', Number(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full sm:w-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => removeExtraCharge(idx)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoice Status Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Status Invoice
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Status Pembayaran
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="Unpaid">Unpaid (Belum Lunas)</option>
                  <option value="Partially Paid">Partially Paid (DP)</option>
                  <option value="Paid">Paid (Lunas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Status Pengiriman
                </label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Arrived">Arrived (Tiba di Gudang)</option>
                  <option value="Sent">Sent (Dikirim)</option>
                  <option value="Picked up">Picked up (Diambil)</option>
                  <option value="Completed">Completed (Selesai)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Side (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Price Calculation Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-sky-400" />
                <span>Kalkulasi Otomatis</span>
              </h2>
              <span className="text-xs px-2.5 py-1 bg-sky-950 text-sky-400 border border-sky-800/50 rounded-full font-mono">
                {route}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-slate-300">
                <span>Berat & Jumlah:</span>
                <span className="font-semibold text-white">
                  {formatWeight(parsedWeight)} kg ({parsedItems} pcs)
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span>Harga Dasar / kg:</span>
                <span className="font-mono text-slate-200">
                  {formatNumber(calcResult.basePricePerKg)} KRW
                  {currentSetting.enable_over_5kg_price && parsedWeight > 5 && (
                    <span className="text-[11px] text-emerald-400 block text-right font-sans">
                      (Tarif &gt;5kg aktif)
                    </span>
                  )}
                </span>
              </div>

              {calcResult.isPickupDiscountActive && calcResult.pickupDiscountApplied > 0 && (
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Diskon Pickup / kg:</span>
                  <span className="font-mono">-{formatNumber(calcResult.pickupDiscountApplied)} KRW</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-800">
                <span>Harga Akhir / kg:</span>
                <span className="font-bold text-sky-300 font-mono">
                  {formatNumber(calcResult.finalPricePerKg)} KRW/kg
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span>Subtotal Ongkir KRW:</span>
                <span className="font-bold text-white font-mono">
                  {formatNumber(calcResult.shippingSubtotalKRW)} KRW
                </span>
              </div>

              {calcResult.totalExtraKRW > 0 && (
                <div className="flex justify-between items-center text-indigo-300">
                  <span>Total Tambahan KRW:</span>
                  <span className="font-mono">+{formatNumber(calcResult.totalExtraKRW)} KRW</span>
                </div>
              )}

              {calcResult.totalExtraIDR > 0 && (
                <div className="flex justify-between items-center text-emerald-300">
                  <span>Total Tambahan IDR:</span>
                  <span className="font-mono">+{formatIDR(calcResult.totalExtraIDR)}</span>
                </div>
              )}

              {/* Total Cards */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-sky-500/30 flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-slate-400">Total Tagihan KRW</span>
                  <span className="text-xl font-extrabold text-sky-400 font-mono">
                    {formatKRW(calcResult.totalKRW)}
                  </span>
                </div>

                {calcResult.totalIDR > 0 && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-slate-400">Total Tagihan IDR</span>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">
                      {formatIDR(calcResult.totalIDR)}
                    </span>
                  </div>
                )}
              </div>

              {/* Currency Preference Selector */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Opsi Pembayaran Customer:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPaymentCurrencyPreference('ORIGINAL')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      paymentCurrencyPreference === 'ORIGINAL'
                        ? 'bg-sky-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentCurrencyPreference('FULL_IDR')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      paymentCurrencyPreference === 'FULL_IDR'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Full IDR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentCurrencyPreference('FULL_KRW')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      paymentCurrencyPreference === 'FULL_KRW'
                        ? 'bg-indigo-500 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Full KRW
                  </button>
                </div>

                {paymentCurrencyPreference === 'FULL_IDR' && (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold text-emerald-400">
                      <span>Total Full IDR:</span>
                      <span className="text-sm font-mono font-extrabold">{formatIDR(calcResult.fullIDRTotal)}</span>
                    </div>
                    <p className="text-[11px] text-emerald-300/80">
                      Rate KRW → IDR: 1 KRW = Rp{calcResult.rateKRWtoIDR} (Google +0.3)
                    </p>
                  </div>
                )}

                {paymentCurrencyPreference === 'FULL_KRW' && (
                  <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold text-indigo-300">
                      <span>Total Full KRW:</span>
                      <span className="text-sm font-mono font-extrabold">{formatKRW(calcResult.fullKRWTotal)}</span>
                    </div>
                    <p className="text-[11px] text-indigo-300/80">
                      Rate IDR → KRW: 1 KRW = Rp{calcResult.rateIDRtoKRW} (Google -0.3)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* WA Output Preview */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-slate-400 flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Preview WhatsApp Text</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedText ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                {generatedWAText}
              </div>
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full mt-4 flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Menyimpan Invoice...' : 'Simpan Invoice'}</span>
            </button>
          </div>

        </div>

      </form>
    </div>
  );
}
