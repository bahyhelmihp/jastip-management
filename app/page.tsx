'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Copy,
  FileDown,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  Package,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  formatNumber,
  formatWeight,
  formatKRW,
  formatIDR,
  calculateInvoice,
  generateTotalanText,
} from '@/lib/utils';
import { generateInvoicePDF } from '@/lib/pdf';

interface ExtraCharge {
  id: string;
  name: string;
  currency: 'KRW' | 'IDR';
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  route: string;
  weight_kg: number;
  item_count: number;
  pickup_or_delivery: string;
  base_price_per_kg: number;
  final_price_per_kg: number;
  pickup_discount_per_kg: number;
  shipping_subtotal_krw: number;
  total_krw: number;
  total_idr: number;
  payment_currency_preference?: string;
  exchange_rate_used?: number;
  payment_status: string;
  delivery_status: string;
  customer_note?: string | null;
  internal_label_color?: string | null;
  show_label_to_customer: boolean;
  created_at: string;
  extra_charges: ExtraCharge[];
}

interface RouteSetting {
  route: string;
  krw_bank_account: string;
  idr_bank_account: string;
  exchange_rate_krw_to_idr?: number;
}

export default function InvoiceDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, RouteSetting>>({});
  const [loading, setLoading] = useState(true);

  // Google Rate Control State
  const [googleRateInput, setGoogleRateInput] = useState('13.07');
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [rateSavedMessage, setRateSavedMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('ALL');

  // Sorting State
  type SortField = 'customer_name' | 'route' | 'weight_kg' | 'total_krw' | 'payment_status' | 'delivery_status' | 'created_at';
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 inline ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-sky-400 inline ml-1 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-sky-400 inline ml-1 font-bold" />
    );
  };

  const sortedInvoices = useMemo(() => {
    const list = [...invoices];
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [invoices, sortField, sortOrder]);

  // UI Toast
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load Settings
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, RouteSetting> = {};
        data.forEach((s: RouteSetting) => {
          map[s.route] = s;
        });
        setSettingsMap(map);
        if (data[0]?.exchange_rate_krw_to_idr) {
          setGoogleRateInput(String(data[0].exchange_rate_krw_to_idr));
        }
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save manual rate to settings
  const handleSaveRate = async (newRate: number) => {
    setIsSavingRate(true);
    setRateSavedMessage(null);
    try {
      const fetchRes = await fetch('/api/settings');
      const currentSettings = await fetchRes.json();
      const updated = Array.isArray(currentSettings)
        ? currentSettings.map((s: any) => ({
            ...s,
            exchange_rate_krw_to_idr: newRate,
          }))
        : [];

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updated }),
      });

      if (res.ok) {
        const data = await res.json();
        setGoogleRateInput(String(newRate));
        setRateSavedMessage(`Rate disimpan: Rp${newRate}`);
        setTimeout(() => setRateSavedMessage(null), 3500);

        const map: Record<string, RouteSetting> = {};
        if (Array.isArray(data)) {
          data.forEach((s: any) => {
            map[s.route] = s;
          });
        }
        setSettingsMap(map);
      }
    } catch (err) {
      console.error('Failed to save exchange rate', err);
    } finally {
      setIsSavingRate(false);
    }
  };

  // Auto fetch live rate from Google API
  const handleFetchLiveRate = async () => {
    setIsFetchingRate(true);
    try {
      const res = await fetch('/api/exchange-rate');
      const data = await res.json();
      if (data.rate && typeof data.rate === 'number') {
        setGoogleRateInput(String(data.rate));
        await handleSaveRate(data.rate);
      }
    } catch (err) {
      console.error('Failed to fetch live rate', err);
    } finally {
      setIsFetchingRate(false);
    }
  };

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (routeFilter !== 'ALL') params.append('route', routeFilter);
      if (paymentStatusFilter !== 'ALL') params.append('payment_status', paymentStatusFilter);
      if (deliveryStatusFilter !== 'ALL') params.append('delivery_status', deliveryStatusFilter);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, routeFilter, paymentStatusFilter, deliveryStatusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  // Status Badge Colors
  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40';
      case 'Partially Paid':
        return 'bg-amber-950/70 text-amber-400 border-amber-500/40';
      default:
        return 'bg-rose-950/70 text-rose-400 border-rose-500/40';
    }
  };

  const getDeliveryBadge = (status: string) => {
    switch (status) {
      case 'Sent / Picked up':
      case 'Sent':
      case 'Picked up':
      case 'Completed':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30';
      case 'Pending':
      default:
        return 'bg-amber-950/70 text-amber-400 border-amber-500/40';
    }
  };

  // Status Change Handlers
  const handleUpdatePaymentStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newStatus }),
      });
      if (res.ok) {
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, payment_status: newStatus } : inv))
        );
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleUpdateDeliveryStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_status: newStatus }),
      });
      if (res.ok) {
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, delivery_status: newStatus } : inv))
        );
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Delete Invoice
  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus invoice ini?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete invoice', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Copy Totalan Text to Clipboard
  const handleCopyWAText = async (inv: Invoice) => {
    const setting = settingsMap[inv.route] || {
      route: inv.route,
      krw_bank_account: `토스뱅크 Toss Bank\n100043237236\nPutra Bahy Helmi Hartoyo`,
      idr_bank_account: `BCA 8410928123\na.n. Putra Bahy Helmi Hartoyo`,
    };

    const calcInput = {
      customerName: inv.customer_name,
      route: inv.route,
      weightKg: inv.weight_kg,
      itemCount: inv.item_count,
      pickupOrDelivery: inv.pickup_or_delivery as any,
      applyPickupDiscount: inv.pickup_discount_per_kg > 0,
      extraCharges: inv.extra_charges || [],
      normalPricePerKg: inv.base_price_per_kg,
      over5kgPricePerKg: 0,
      pickupDiscountPerKg: inv.pickup_discount_per_kg,
      enableOver5kgPrice: false,
      enablePickupDiscount: inv.pickup_discount_per_kg > 0,
      exchangeRateKRWtoIDR: inv.exchange_rate_used || 13.07,
      paymentCurrencyPreference: (inv.payment_currency_preference as any) || 'ORIGINAL',
      krwBankAccount: setting.krw_bank_account,
      idrBankAccount: setting.idr_bank_account,
    };

    const calcResult = calculateInvoice(calcInput);
    const text = generateTotalanText(calcInput, calcResult);

    try {
      await navigator.clipboard.writeText(text);
      setCopiedInvoiceId(inv.id);
      setTimeout(() => setCopiedInvoiceId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  // Download PDF
  const handleDownloadPDF = (inv: Invoice) => {
    const setting = settingsMap[inv.route] || {
      route: inv.route,
      krw_bank_account: `토스뱅크 Toss Bank\n100043237236\nPutra Bahy Helmi Hartoyo`,
      idr_bank_account: `BCA 8410928123\na.n. Putra Bahy Helmi Hartoyo`,
    };

    const calcInput = {
      customerName: inv.customer_name,
      route: inv.route,
      weightKg: inv.weight_kg,
      itemCount: inv.item_count,
      pickupOrDelivery: inv.pickup_or_delivery as any,
      applyPickupDiscount: inv.pickup_discount_per_kg > 0,
      extraCharges: inv.extra_charges || [],
      normalPricePerKg: inv.base_price_per_kg,
      over5kgPricePerKg: 0,
      pickupDiscountPerKg: inv.pickup_discount_per_kg,
      enableOver5kgPrice: false,
      enablePickupDiscount: inv.pickup_discount_per_kg > 0,
      exchangeRateKRWtoIDR: inv.exchange_rate_used || 13.07,
      paymentCurrencyPreference: (inv.payment_currency_preference as any) || 'ORIGINAL',
      krwBankAccount: setting.krw_bank_account,
      idrBankAccount: setting.idr_bank_account,
    };

    const calcResult = calculateInvoice(calcInput);

    const doc = generateInvoicePDF({
      invoiceNumber: inv.invoice_number,
      createdAt: inv.created_at,
      customerName: inv.customer_name,
      route: inv.route,
      weightKg: inv.weight_kg,
      itemCount: inv.item_count,
      pickupOrDelivery: inv.pickup_or_delivery,
      basePricePerKg: inv.base_price_per_kg,
      pickupDiscountPerKg: inv.pickup_discount_per_kg,
      finalPricePerKg: inv.final_price_per_kg,
      shippingSubtotalKRW: inv.shipping_subtotal_krw,
      totalKRW: inv.total_krw,
      totalIDR: inv.total_idr,
      paymentStatus: inv.payment_status,
      deliveryStatus: inv.delivery_status,
      paymentCurrencyPreference: inv.payment_currency_preference,
      exchangeRateUsed: inv.exchange_rate_used,
      fullIDRTotal: calcResult.fullIDRTotal,
      fullKRWTotal: calcResult.fullKRWTotal,
      customerNote: inv.customer_note,
      internalLabelColor: inv.internal_label_color,
      showLabelToCustomer: inv.show_label_to_customer,
      extraCharges: inv.extra_charges || [],
      krwBankAccount: setting.krw_bank_account,
      idrBankAccount: setting.idr_bank_account,
    });

    doc.save(`${inv.invoice_number}_${inv.customer_name}.pdf`);
  };

  // Summary Metrics
  const summary = useMemo(() => {
    const totalCount = invoices.length;
    const unpaidCount = invoices.filter((i) => i.payment_status === 'Unpaid').length;
    const sumKRW = invoices.reduce((acc, i) => acc + i.total_krw, 0);
    const sumIDR = invoices.reduce((acc, i) => acc + i.total_idr, 0);

    // Delivery Status Metrics (Pending vs Sent / Picked up)
    const pendingDeliveryCount = invoices.filter(
      (i) => i.delivery_status === 'Pending' || i.delivery_status === 'Arrived' || !i.delivery_status
    ).length;
    const dispatchedCount = invoices.filter(
      (i) =>
        i.delivery_status === 'Sent / Picked up' ||
        i.delivery_status === 'Sent' ||
        i.delivery_status === 'Picked up' ||
        i.delivery_status === 'Completed'
    ).length;

    return {
      totalCount,
      unpaidCount,
      sumKRW,
      sumIDR,
      pendingDeliveryCount,
      dispatchedCount,
    };
  }, [invoices]);

  return (
    <div className="space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Daftar Invoice Jastip</h1>
          <p className="text-slate-400 text-sm mt-1">
            Kelola invoice, filter berdasarkan rute dan status, copy teks WhatsApp, dan download PDF.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-sky-500/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Buat Invoice Baru</span>
        </Link>
      </div>

      {/* Google Exchange Rate Control Widget */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white tracking-tight">Kurs Dasar Google Rate (1 KRW = X IDR)</h2>
              {rateSavedMessage && (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium transition-all">
                  {rateSavedMessage}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Input nilai rate secara manual jika terdapat perbedaan dengan rate Google, atau tekan tombol update otomatis dari API.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Manual Input Field */}
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-sky-500 transition-all">
              <span className="text-xs text-slate-400 font-medium">1 KRW = Rp</span>
              <input
                type="number"
                step="0.01"
                value={googleRateInput}
                onChange={(e) => setGoogleRateInput(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-20 bg-transparent text-white font-bold text-sm outline-none font-mono"
                placeholder="13.07"
              />
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(googleRateInput);
                  if (!isNaN(val) && val > 0) handleSaveRate(val);
                }}
                disabled={isSavingRate}
                className="text-xs bg-sky-500 hover:bg-sky-400 text-white font-semibold px-3 py-1 rounded-lg transition-all disabled:opacity-50"
              >
                {isSavingRate ? '...' : 'Simpan Rate'}
              </button>
            </div>

            {/* Auto Refresh Button */}
            <button
              type="button"
              onClick={handleFetchLiveRate}
              disabled={isFetchingRate || isSavingRate}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/50 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all disabled:opacity-50"
              title="Ambil rate Google terkini otomatis via API"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRate ? 'animate-spin' : ''}`} />
              <span>Update Auto (API)</span>
            </button>
          </div>
        </div>

        {/* Live Buffer Rate Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Rate Khusus KRW → IDR (+0.3):</span>
            <span className="text-xs font-bold font-mono text-emerald-400">
              1 KRW = Rp{((parseFloat(googleRateInput) || 13.07) + 0.3).toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Rate Khusus IDR → KRW (-0.3):</span>
            <span className="text-xs font-bold font-mono text-sky-400">
              1 KRW = Rp{((parseFloat(googleRateInput) || 13.07) - 0.3).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Invoice */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoice</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-white font-mono">{summary.totalCount}</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">Semua invoice</span>
          </div>
        </div>

        {/* Unpaid */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Belum Bayar</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-rose-400 font-mono">{summary.unpaidCount}</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">Status Unpaid</span>
          </div>
        </div>

        {/* Belum Kirim/Pickup */}
        <div 
          onClick={() => setDeliveryStatusFilter(deliveryStatusFilter === 'Pending' ? 'ALL' : 'Pending')}
          className={`bg-slate-900/80 border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all ${
            deliveryStatusFilter === 'Pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-800 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Belum Kirim/Pickup</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-400 font-mono">{summary.pendingDeliveryCount}</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">Paket Pending</span>
          </div>
        </div>

        {/* Dispatched/Picked Up */}
        <div 
          onClick={() => setDeliveryStatusFilter(deliveryStatusFilter === 'Sent / Picked up' ? 'ALL' : 'Sent / Picked up')}
          className={`bg-slate-900/80 border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all ${
            deliveryStatusFilter === 'Sent / Picked up' || deliveryStatusFilter === 'Sent' || deliveryStatusFilter === 'Picked up' || deliveryStatusFilter === 'Completed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-800 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sudah Kirim/Pickup</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">{summary.dispatchedCount}</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">Sent / Picked up</span>
          </div>
        </div>

        {/* Total KRW */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Omzet KRW</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-extrabold text-sky-400 font-mono">{formatKRW(summary.sumKRW)}</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">Total tagihan KRW</span>
          </div>
        </div>

        {/* Total IDR */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Omzet IDR</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-extrabold text-emerald-400 font-mono">{formatIDR(summary.sumIDR)}</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">Total tagihan IDR</span>
          </div>
        </div>

      </div>

      {/* Detailed Delivery Status Tracker Quick Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Truck className="w-4 h-4 text-sky-400" />
          <span>Tracking Status Kirim Paket:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDeliveryStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              deliveryStatusFilter === 'ALL'
                ? 'bg-slate-100 text-slate-900 border-white shadow-md'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Semua ({summary.totalCount})
          </button>

          <button
            onClick={() => setDeliveryStatusFilter(deliveryStatusFilter === 'Pending' ? 'ALL' : 'Pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              deliveryStatusFilter === 'Pending'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                : 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-950/70'
            }`}
          >
            🕒 Pending / Belum Kirim ({summary.pendingDeliveryCount})
          </button>

          <button
            onClick={() => setDeliveryStatusFilter(deliveryStatusFilter === 'Sent / Picked up' ? 'ALL' : 'Sent / Picked up')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              deliveryStatusFilter === 'Sent / Picked up'
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-950/70'
            }`}
          >
            🚚 Sent / Picked up ({summary.dispatchedCount})
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          {/* Route Filter */}
          <div>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
            >
              <option value="ALL">Semua Rute</option>
              <option value="CGK → ICN">CGK → ICN</option>
              <option value="ICN → CGK">ICN → CGK</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
            >
              <option value="ALL">Semua Status Bayar</option>
              <option value="Unpaid">Unpaid (Belum Lunas)</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid (Lunas)</option>
            </select>
          </div>

          {/* Delivery Status Filter */}
          <div>
            <select
              value={deliveryStatusFilter}
              onChange={(e) => setDeliveryStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
            >
              <option value="ALL">Semua Status Pengiriman</option>
              <option value="Pending">Pending (Belum Kirim/Pickup)</option>
              <option value="Sent / Picked up">Sent / Picked up (Sudah Kirim/Pickup)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Invoice List Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-7 h-7 text-sky-400 animate-spin" />
            <span className="ml-3 text-slate-400 text-sm">Memuat data invoice...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-semibold">Tidak ada invoice ditemukan.</p>
            <p className="text-slate-500 text-xs mt-1">Coba ubah kata kunci pencarian atau filter Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800 font-semibold select-none">
                <tr>
                  <th
                    onClick={() => handleSort('customer_name')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group"
                    title="Klik untuk mengurutkan berdasarkan Nama Customer / Invoice"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Customer & Invoice</span>
                      {renderSortIcon('customer_name')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('route')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group"
                    title="Klik untuk mengurutkan berdasarkan Rute"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Rute & Metode</span>
                      {renderSortIcon('route')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('weight_kg')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group"
                    title="Klik untuk mengurutkan berdasarkan Berat"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Berat & Item</span>
                      {renderSortIcon('weight_kg')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('total_krw')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group"
                    title="Klik untuk mengurutkan berdasarkan Total Tagihan"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Total Bayar</span>
                      {renderSortIcon('total_krw')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('payment_status')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group"
                    title="Klik untuk mengurutkan berdasarkan Status Bayar"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status Bayar</span>
                      {renderSortIcon('payment_status')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('delivery_status')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group"
                    title="Klik untuk mengurutkan berdasarkan Status Kirim"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status Kirim</span>
                      {renderSortIcon('delivery_status')}
                    </div>
                  </th>

                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sortedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    
                    {/* Customer & Invoice No */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-base flex items-center space-x-2">
                        <span>{inv.customer_name}</span>
                        {inv.internal_label_color && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px] font-normal">
                            {inv.internal_label_color}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5 flex items-center space-x-2">
                        <span>{inv.invoice_number}</span>
                        <span>•</span>
                        <span>{new Date(inv.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                      {inv.customer_note && (
                        <span className="inline-block text-[11px] text-amber-400/90 italic mt-1">
                          &quot;{inv.customer_note}&quot;
                        </span>
                      )}
                    </td>

                    {/* Route & Pickup */}
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 bg-sky-950 text-sky-300 border border-sky-800/50 rounded-lg text-xs font-mono font-semibold inline-block">
                        {inv.route}
                      </span>
                      <span className="block text-xs text-slate-400 mt-1 capitalize">
                        {inv.pickup_or_delivery === 'pickup' ? 'Ambil Sendiri (Pickup)' : 'Kirim (Delivery)'}
                      </span>
                    </td>

                    {/* Weight & Item */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-200">
                        {formatWeight(inv.weight_kg)} kg
                      </div>
                      <div className="text-xs text-slate-400">
                        {inv.item_count} pcs
                      </div>
                    </td>

                    {/* Total Bayar */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-sky-400 font-mono">
                        {formatKRW(inv.total_krw)}
                      </div>
                      {inv.total_idr > 0 && (
                        <div className="font-semibold text-emerald-400 font-mono text-xs">
                          {formatIDR(inv.total_idr)}
                        </div>
                      )}
                    </td>

                    {/* Payment Status Selector */}
                    <td className="py-4 px-4">
                      <select
                        value={inv.payment_status}
                        onChange={(e) => handleUpdatePaymentStatus(inv.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${getPaymentBadge(
                          inv.payment_status
                        )}`}
                      >
                        <option value="Unpaid" className="bg-slate-900 text-rose-400">Unpaid</option>
                        <option value="Partially Paid" className="bg-slate-900 text-amber-400">Partially Paid</option>
                        <option value="Paid" className="bg-slate-900 text-emerald-400">Paid</option>
                      </select>
                    </td>

                    {/* Delivery Status Selector */}
                    <td className="py-4 px-4">
                      <select
                        value={
                          inv.delivery_status === 'Sent' || inv.delivery_status === 'Picked up' || inv.delivery_status === 'Completed' || inv.delivery_status === 'Sent / Picked up'
                            ? 'Sent / Picked up'
                            : 'Pending'
                        }
                        onChange={(e) => handleUpdateDeliveryStatus(inv.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${getDeliveryBadge(
                          inv.delivery_status
                        )}`}
                      >
                        <option value="Pending" className="bg-slate-900 text-amber-400">Pending</option>
                        <option value="Sent / Picked up" className="bg-slate-900 text-emerald-400">Sent / Picked up</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        
                        {/* Copy WA Text */}
                        <button
                          type="button"
                          onClick={() => handleCopyWAText(inv)}
                          title="Copy Text Totalan WhatsApp"
                          className="p-2 text-slate-300 hover:text-sky-300 hover:bg-sky-950/60 border border-transparent hover:border-sky-800 rounded-lg transition-all"
                        >
                          {copiedInvoiceId === inv.id ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Download PDF */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(inv)}
                          title="Download Invoice PDF"
                          className="p-2 text-slate-300 hover:text-indigo-300 hover:bg-indigo-950/60 border border-transparent hover:border-indigo-800 rounded-lg transition-all"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <Link
                          href={`/invoices/${inv.id}/edit`}
                          title="Edit Invoice"
                          className="p-2 text-slate-300 hover:text-amber-300 hover:bg-amber-950/60 border border-transparent hover:border-amber-800 rounded-lg transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv.id)}
                          disabled={deletingId === inv.id}
                          title="Hapus Invoice"
                          className="p-2 text-slate-300 hover:text-rose-400 hover:bg-rose-950/60 border border-transparent hover:border-rose-800 rounded-lg transition-all disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
