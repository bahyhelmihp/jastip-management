import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const settings = await prisma.settings.findMany();
    const invoices = await prisma.invoice.findMany({
      include: {
        extra_charges: true,
      },
    });

    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      invoices,
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `jastip_backup_${dateStr}.json`;

    return new Response(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { settings, invoices } = body;

    if (!Array.isArray(settings) || !Array.isArray(invoices)) {
      return NextResponse.json(
        { error: 'Invalid backup file structure' },
        { status: 400 }
      );
    }

    // Execute restore inside transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete existing records
      await tx.invoiceExtraCharge.deleteMany();
      await tx.invoice.deleteMany();
      await tx.settings.deleteMany();

      // 2. Restore settings
      for (const item of settings) {
        await tx.settings.create({
          data: {
            route: item.route,
            normal_price_per_kg: Number(item.normal_price_per_kg),
            over_5kg_price_per_kg: Number(item.over_5kg_price_per_kg || 0),
            pickup_discount_per_kg: Number(item.pickup_discount_per_kg || 0),
            enable_over_5kg_price: Boolean(item.enable_over_5kg_price),
            enable_pickup_discount: Boolean(item.enable_pickup_discount),
            exchange_rate_krw_to_idr: Number(item.exchange_rate_krw_to_idr || 13.07),
            krw_bank_account: String(item.krw_bank_account || ''),
            idr_bank_account: String(item.idr_bank_account || ''),
          },
        });
      }

      // 3. Restore invoices & extra charges
      for (const inv of invoices) {
        const extraCharges = Array.isArray(inv.extra_charges) ? inv.extra_charges : [];

        await tx.invoice.create({
          data: {
            id: inv.id,
            invoice_number: inv.invoice_number,
            customer_name: inv.customer_name,
            route: inv.route,
            weight_kg: Number(inv.weight_kg),
            item_count: Number(inv.item_count),
            pickup_or_delivery: inv.pickup_or_delivery || 'delivery',
            base_price_per_kg: Number(inv.base_price_per_kg),
            final_price_per_kg: Number(inv.final_price_per_kg),
            pickup_discount_per_kg: Number(inv.pickup_discount_per_kg || 0),
            shipping_subtotal_krw: Number(inv.shipping_subtotal_krw),
            total_krw: Number(inv.total_krw),
            total_idr: Number(inv.total_idr || 0),
            payment_currency_preference: inv.payment_currency_preference || 'ORIGINAL',
            exchange_rate_used: Number(inv.exchange_rate_used || 13.07),
            payment_status: inv.payment_status || 'Unpaid',
            delivery_status: inv.delivery_status || 'Pending',
            customer_note: inv.customer_note || null,
            internal_label_color: inv.internal_label_color || null,
            show_label_to_customer: Boolean(inv.show_label_to_customer),
            created_at: inv.created_at ? new Date(inv.created_at) : new Date(),
            updated_at: inv.updated_at ? new Date(inv.updated_at) : new Date(),
            extra_charges: {
              create: extraCharges.map((ch: any) => ({
                id: ch.id,
                name: ch.name,
                currency: ch.currency,
                amount: Number(ch.amount),
              })),
            },
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${invoices.length} invoice dan ${settings.length} pengaturan rute.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
