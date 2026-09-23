'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Send, PlaneTakeoff, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setDevResetUrl(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim permintaan reset kata sandi');
      }

      setSuccess(data.message);
      if (data.dev_reset_url) {
        setDevResetUrl(data.dev_reset_url);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 mb-4">
            <PlaneTakeoff className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Lupa Kata Sandi?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Masukkan alamat email Anda untuk menerima tautan reset kata sandi
          </p>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3 text-emerald-300 text-sm">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <p className="font-semibold">{success}</p>
            </div>

            {/* Dev Mode Banner */}
            {devResetUrl && (
              <div className="pt-3 border-t border-emerald-500/20 text-xs">
                <p className="font-medium text-emerald-400 mb-1">🔧 Development Mode Link:</p>
                <a
                  href={devResetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 underline text-sky-300 hover:text-white break-all"
                >
                  <span>Klik di sini untuk reset kata sandi sekarang</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center space-x-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {!success && (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Tautan Reset</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-800 text-center text-sm text-slate-400">
          Kembali ke{' '}
          <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300 transition">
            Halaman Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
