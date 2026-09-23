'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, PlaneTakeoff, ArrowRight } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!token) {
      setError('Token verifikasi tidak ditemukan.');
      setLoading(false);
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Verifikasi gagal');
        }
        setError(null);
        setSuccess(data.message || 'Email berhasil diverifikasi!');
      })
      .catch((err: any) => {
        // If already succeeded on first invocation, ignore double fetch error
        setSuccess((prevSuccess) => {
          if (!prevSuccess) {
            setError(err.message);
          }
          return prevSuccess;
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="max-w-md w-full space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center backdrop-blur">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 mb-4">
        <PlaneTakeoff className="w-7 h-7 text-white" />
      </div>

      {loading && (
        <div className="py-8 space-y-4">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-sky-500 border-t-transparent"></div>
          <p className="text-slate-300 font-medium">Memverifikasi email Anda...</p>
        </div>
      )}

      {!loading && success && (
        <div className="space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Verifikasi Berhasil!</h2>
            <p className="mt-2 text-sm text-slate-300">{success}</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition"
          >
            <span>Buka Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {!loading && !success && error && (
        <div className="space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Verifikasi Gagal</h2>
            <p className="mt-2 text-sm text-rose-300">{error}</p>
          </div>
          <div className="flex flex-col space-y-3">
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition"
            >
              Daftar Ulang
            </Link>
            <Link href="/login" className="text-sm text-sky-400 hover:underline">
              Halaman Masuk
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-white">Memuat verifikasi...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
