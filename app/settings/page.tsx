'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle2, AlertCircle, Banknote, DollarSign } from 'lucide-react';

interface RouteSetting {
  id?: number;
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<RouteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSettings(data);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal memuat pengaturan pricing.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (index: number, field: keyof RouteSetting, value: any) => {
    const updated = [...settings];
    updated[index] = { ...updated[index], [field]: value };
    setSettings(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (!res.ok) {
        throw new Error('Gagal menyimpan pengaturan');
      }

      const updated = await res.json();
      setSettings(updated);
      setMessage({ type: 'success', text: 'Pengaturan pricing & rekening berhasil disimpan!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan data.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        <span className="ml-3 text-slate-400 font-medium">Memuat pengaturan...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Global Settings / Pricing</h1>
        <p className="text-slate-400 text-sm mt-1">
          Atur harga per kg, diskon pickup, dan informasi rekening per rute. Pengaturan ini akan dipakai otomatis saat membuat invoice baru.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 border ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {settings.map((setting, idx) => (
          <div
            key={setting.route}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold uppercase tracking-wider">
                  Rute
                </span>
                <h2 className="text-lg font-bold text-white">{setting.route}</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Normal Price */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Harga Normal per kg (KRW)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={setting.normal_price_per_kg}
                    onChange={(e) => handleChange(idx, 'normal_price_per_kg', Number(e.target.value))}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                    required
                  />
                  <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-semibold">
                    KRW/kg
                  </span>
                </div>
              </div>

              {/* Over 5kg Price */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Harga Khusus &gt;5kg (KRW)
                  </label>
                  <label className="flex items-center cursor-pointer space-x-2">
                    <input
                      type="checkbox"
                      checked={setting.enable_over_5kg_price}
                      onChange={(e) => handleChange(idx, 'enable_over_5kg_price', e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs text-sky-400 font-medium">Aktifkan</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={setting.over_5kg_price_per_kg}
                    disabled={!setting.enable_over_5kg_price}
                    onChange={(e) => handleChange(idx, 'over_5kg_price_per_kg', Number(e.target.value))}
                    onWheel={(e) => e.currentTarget.blur()}
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-white font-medium outline-none transition-opacity ${
                      setting.enable_over_5kg_price
                        ? 'border-slate-700 focus:ring-2 focus:ring-sky-500'
                        : 'border-slate-800 opacity-40 cursor-not-allowed'
                    }`}
                  />
                  <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-semibold">
                    KRW/kg
                  </span>
                </div>
              </div>

              {/* Pickup Discount */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Diskon Pickup per kg (KRW)
                  </label>
                  <label className="flex items-center cursor-pointer space-x-2">
                    <input
                      type="checkbox"
                      checked={setting.enable_pickup_discount}
                      onChange={(e) => handleChange(idx, 'enable_pickup_discount', e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs text-sky-400 font-medium">Aktifkan Diskon Pickup</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={setting.pickup_discount_per_kg}
                    disabled={!setting.enable_pickup_discount}
                    onChange={(e) => handleChange(idx, 'pickup_discount_per_kg', Number(e.target.value))}
                    onWheel={(e) => e.currentTarget.blur()}
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-white font-medium outline-none transition-opacity ${
                      setting.enable_pickup_discount
                        ? 'border-slate-700 focus:ring-2 focus:ring-sky-500'
                        : 'border-slate-800 opacity-40 cursor-not-allowed'
                    }`}
                  />
                  <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-semibold">
                    KRW/kg
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Potongan harga per kg jika customer memilih metode pengambilan Pickup.
                </p>
              </div>

              {/* Base Google Exchange Rate */}
              <div className="md:col-span-2 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase text-sky-400 tracking-wider">
                    Kurs Dasar Google Rate (1 KRW = X IDR)
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/exchange-rate');
                        const data = await res.json();
                        if (data.rate) {
                          handleChange(idx, 'exchange_rate_krw_to_idr', data.rate);
                        }
                      } catch (e) {}
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium underline flex items-center space-x-1"
                  >
                    <span>Fetch Rate Google Terkini (API)</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={setting.exchange_rate_krw_to_idr ?? 13.07}
                      onChange={(e) => handleChange(idx, 'exchange_rate_krw_to_idr', Number(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-semibold">IDR</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs">
                    <span className="block text-slate-400 font-medium">Rate KRW → IDR (+0.3):</span>
                    <strong className="text-emerald-400 text-sm">
                      1 KRW = Rp{((setting.exchange_rate_krw_to_idr ?? 13.07) + 0.3).toFixed(2)}
                    </strong>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs">
                    <span className="block text-slate-400 font-medium">Rate IDR → KRW (-0.3):</span>
                    <strong className="text-sky-400 text-sm">
                      1 KRW = Rp{((setting.exchange_rate_krw_to_idr ?? 13.07) - 0.3).toFixed(2)}
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Buffer +0.3 digunakan saat customer bayar KRW → IDR (Rate Khusus Jastip), dan buffer -0.3 digunakan saat customer bayar IDR → KRW (Rate Khusus Jastip) agar terhindar dari rugi kurs.
                </p>
              </div>

              {/* KRW Bank */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Rekening Pembayaran KRW
                </label>
                <textarea
                  rows={3}
                  value={setting.krw_bank_account}
                  onChange={(e) => handleChange(idx, 'krw_bank_account', e.target.value)}
                  placeholder="Contoh: Toss Bank 100043237236 a.n Putra Bahy"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none font-mono"
                />
              </div>

              {/* IDR Bank */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Rekening Pembayaran IDR
                </label>
                <textarea
                  rows={3}
                  value={setting.idr_bank_account}
                  onChange={(e) => handleChange(idx, 'idr_bank_account', e.target.value)}
                  placeholder="Contoh: BCA 8410928123 a.n Putra Bahy"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none font-mono"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
