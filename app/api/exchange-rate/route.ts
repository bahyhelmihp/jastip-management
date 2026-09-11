import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Primary API
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/KRW', {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.IDR;
      if (rate && typeof rate === 'number') {
        const roundedRate = Math.round(rate * 100) / 100;
        return NextResponse.json({ rate: roundedRate, rawRate: rate, source: 'exchangerate-api' });
      }
    }

    // Backup API
    const res2 = await fetch('https://open.er-api.com/v6/latest/KRW');
    if (res2.ok) {
      const data2 = await res2.json();
      const rate2 = data2.rates?.IDR;
      if (rate2 && typeof rate2 === 'number') {
        const roundedRate2 = Math.round(rate2 * 100) / 100;
        return NextResponse.json({ rate: roundedRate2, rawRate: rate2, source: 'er-api' });
      }
    }

    return NextResponse.json({ rate: 13.07, source: 'fallback' });
  } catch (error: any) {
    return NextResponse.json({ rate: 13.07, error: error.message, source: 'fallback' });
  }
}
