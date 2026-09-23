import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

const DEFAULT_KRW_BANK = `토스뱅크 Toss Bank
100043237236
Putra Bahy Helmi Hartoyo`;

const DEFAULT_IDR_BANK = `BCA 8410928123
a.n. Putra Bahy Helmi Hartoyo`;

// Helper to ensure default settings exist for user
async function ensureSettingsExist(userId?: string | null) {
  const where = userId ? { user_id: userId } : { user_id: null };
  const count = await prisma.settings.count({ where });
  if (count === 0) {
    await prisma.settings.createMany({
      data: [
        {
          user_id: userId || null,
          route: 'ICN → CGK',
          normal_price_per_kg: 13000,
          over_5kg_price_per_kg: 13000,
          pickup_discount_per_kg: 0,
          enable_over_5kg_price: false,
          enable_pickup_discount: false,
          krw_bank_account: DEFAULT_KRW_BANK,
          idr_bank_account: DEFAULT_IDR_BANK,
        },
        {
          user_id: userId || null,
          route: 'CGK → ICN',
          normal_price_per_kg: 9500,
          over_5kg_price_per_kg: 9000,
          pickup_discount_per_kg: 500,
          enable_over_5kg_price: true,
          enable_pickup_discount: true,
          krw_bank_account: DEFAULT_KRW_BANK,
          idr_bank_account: DEFAULT_IDR_BANK,
        },
      ],
    });
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    await ensureSettingsExist(user?.id);
    const settings = await prisma.settings.findMany({
      where: user ? { user_id: user.id } : { user_id: null },
      orderBy: { route: 'asc' },
    });
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { settings } = body; // Array of route settings objects

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
    }

    const userId = user?.id || null;
    const updatedSettings = [];

    for (const item of settings) {
      const existing = await prisma.settings.findFirst({
        where: { user_id: userId, route: item.route },
      });

      let updated;
      if (existing) {
        updated = await prisma.settings.update({
          where: { id: existing.id },
          data: {
            normal_price_per_kg: Number(item.normal_price_per_kg),
            over_5kg_price_per_kg: Number(item.over_5kg_price_per_kg),
            pickup_discount_per_kg: Number(item.pickup_discount_per_kg),
            enable_over_5kg_price: Boolean(item.enable_over_5kg_price),
            enable_pickup_discount: Boolean(item.enable_pickup_discount),
            exchange_rate_krw_to_idr: Number(item.exchange_rate_krw_to_idr) || 13.07,
            krw_bank_account: String(item.krw_bank_account || ''),
            idr_bank_account: String(item.idr_bank_account || ''),
          },
        });
      } else {
        updated = await prisma.settings.create({
          data: {
            user_id: userId,
            route: item.route,
            normal_price_per_kg: Number(item.normal_price_per_kg),
            over_5kg_price_per_kg: Number(item.over_5kg_price_per_kg),
            pickup_discount_per_kg: Number(item.pickup_discount_per_kg),
            enable_over_5kg_price: Boolean(item.enable_over_5kg_price),
            enable_pickup_discount: Boolean(item.enable_pickup_discount),
            exchange_rate_krw_to_idr: Number(item.exchange_rate_krw_to_idr) || 13.07,
            krw_bank_account: String(item.krw_bank_account || ''),
            idr_bank_account: String(item.idr_bank_account || ''),
          },
        });
      }
      updatedSettings.push(updated);
    }

    return NextResponse.json(updatedSettings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
