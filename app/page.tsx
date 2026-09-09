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
} from 'lucide-react';
import {
  formatNumber,
  formatWeight,
  formatKRW,
  formatIDR,
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
}

export default function InvoiceDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, RouteSetting>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('ALL');

  // UI Toast
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load Settings
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
      }
    }
    loadSettings();
  }, []);

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
      case 'Completed':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30';
      case 'Picked up':
        return 'bg-sky-950/70 text-sky-300 border-sky-500/30';
      case 'Sent':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-500/30';
      case 'Arrived':
        return 'bg-purple-950/70 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
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
      console.error('Failed to update delivery status', err);
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

  // Copy WhatsApp Text Totalan
  const handleCopyWAText = async (inv: Invoice) => {
    const setting = settingsMap[inv.route] || {
      route: inv.route,
      krw_bank_account: `토스뱅크 Toss Bank\n100043237236\nPutra Bahy Helmi Hartoyo`,
      idr_bank_account: `BCA 8410928123\na.n. Putra Bahy Helmi Hartoyo`,
    };

    const text = generateTotalanText(
      {
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
        krwBankAccount: setting.krw_bank_account,
        idrBankAccount: setting.idr_bank_account,
      },
      {
        basePricePerKg: inv.base_price_per_kg,
        pickupDiscountApplied: inv.pickup_discount_per_kg,
        isPickupDiscountActive: inv.pickup_discount_per_kg > 0,
        finalPricePerKg: inv.final_price_per_kg,
        shippingSubtotalKRW: inv.shipping_subtotal_krw,
        extraKRW: (inv.extra_charges || []).filter((ec) => ec.currency === 'KRW'),
        extraIDR: (inv.extra_charges || []).filter((ec) => ec.currency === 'IDR'),
        totalExtraKRW: (inv.extra_charges || [])
          .filter((ec) => ec.currency === 'KRW')
          .reduce((sum, item) => sum + item.amount, 0),
        totalExtraIDR: (inv.extra_charges || [])
          .filter((ec) => ec.currency === 'IDR')
          .reduce((sum, item) => sum + item.amount, 0),
        totalKRW: inv.total_krw,
        totalIDR: inv.total_idr,
      }
    );

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
    return { totalCount, unpaidCount, sumKRW, sumIDR };
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

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase">Total Invoice</span>
            <span className="text-xl font-bold text-white font-mono">{summary.totalCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase">Unpaid (Belum Bayar)</span>
            <span className="text-xl font-bold text-rose-400 font-mono">{summary.unpaidCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase">Total Omzet KRW</span>
            <span className="text-lg font-bold text-sky-400 font-mono">{formatKRW(summary.sumKRW)}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase">Total Omzet IDR</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{formatIDR(summary.sumIDR)}</span>
          </div>
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
              <option value="Pending">Pending</option>
              <option value="Arrived">Arrived</option>
              <option value="Sent">Sent</option>
              <option value="Picked up">Picked up</option>
              <option value="Completed">Completed</option>
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
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">No. Invoice & Customer</th>
                  <th className="py-3.5 px-4">Rute & Metode</th>
                  <th className="py-3.5 px-4">Berat & Item</th>
                  <th className="py-3.5 px-4">Total Bayar</th>
                  <th className="py-3.5 px-4">Status Bayar</th>
                  <th className="py-3.5 px-4">Status Kirim</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => (
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
                        value={inv.delivery_status}
                        onChange={(e) => handleUpdateDeliveryStatus(inv.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${getDeliveryBadge(
                          inv.delivery_status
                        )}`}
                      >
                        <option value="Pending" className="bg-slate-900 text-slate-300">Pending</option>
                        <option value="Arrived" className="bg-slate-900 text-purple-300">Arrived</option>
                        <option value="Sent" className="bg-slate-900 text-indigo-300">Sent</option>
                        <option value="Picked up" className="bg-slate-900 text-sky-300">Picked up</option>
                        <option value="Completed" className="bg-slate-900 text-emerald-300">Completed</option>
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
