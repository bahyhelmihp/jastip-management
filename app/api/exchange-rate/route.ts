import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // 1. Primary: Yahoo Finance (Matches Google Search "KRW IDR" real-time spot market)
  try {
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/KRWIDR=X', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && typeof price === 'number') {
        const roundedRate = Math.round(price * 100) / 100;
        return NextResponse.json(
          { rate: roundedRate, rawRate: price, source: 'Google / Yahoo Finance (Real-time)' },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }
    }
  } catch (err) {
    console.error('Yahoo Finance rate fetch failed:', err);
  }

  // 2. Secondary: Frankfurter ECB Rate
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?from=KRW&to=IDR', {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.IDR;
      if (rate && typeof rate === 'number') {
        const roundedRate = Math.round(rate * 100) / 100;
        return NextResponse.json(
          { rate: roundedRate, rawRate: rate, source: 'Frankfurter (ECB Rate)' },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }
    }
  } catch (err) {
    console.error('Frankfurter rate fetch failed:', err);
  }

  // 3. Backup: Open ER API
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/KRW', {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.IDR;
      if (rate && typeof rate === 'number') {
        const roundedRate = Math.round(rate * 100) / 100;
        return NextResponse.json(
          { rate: roundedRate, rawRate: rate, source: 'er-api' },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }
    }
  } catch (err) {
    console.error('ER-API rate fetch failed:', err);
  }

  return NextResponse.json(
    { rate: 13.07, source: 'fallback' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
