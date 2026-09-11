import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateInvoice } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const route = searchParams.get('route') || '';
    const paymentStatus = searchParams.get('payment_status') || '';
    const deliveryStatus = searchParams.get('delivery_status') || '';

    const where: any = {};

    if (search.trim()) {
      where.customer_name = {
        contains: search.trim(),
      };
    }

    if (route && route !== 'ALL') {
      where.route = route;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      where.payment_status = paymentStatus;
    }

    if (deliveryStatus && deliveryStatus !== 'ALL') {
      if (deliveryStatus === 'Pending') {
        where.delivery_status = { in: ['Pending', 'Arrived'] };
      } else if (
        deliveryStatus === 'Sent / Picked up' ||
        deliveryStatus === 'Sent' ||
        deliveryStatus === 'Picked up' ||
        deliveryStatus === 'Completed'
      ) {
        where.delivery_status = { in: ['Sent / Picked up', 'Sent', 'Picked up', 'Completed'] };
      } else {
        where.delivery_status = deliveryStatus;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        extra_charges: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_name,
      route,
      weight_kg,
      item_count,
      pickup_or_delivery,
      apply_pickup_discount,
      payment_currency_preference = 'ORIGINAL',
      customer_note,
      internal_label_color,
      show_label_to_customer,
      extra_charges = [],
    } = body;

    if (!customer_name || !route || weight_kg === undefined || item_count === undefined) {
      return NextResponse.json(
        { error: 'Customer name, route, weight, and item count are required' },
        { status: 400 }
      );
    }

    // Fetch settings for route
    const setting = await prisma.settings.findUnique({
      where: { route },
    });

    const normalPrice = setting ? setting.normal_price_per_kg : (route.includes('ICN') ? 13000 : 9500);
    const over5kgPrice = setting ? setting.over_5kg_price_per_kg : (route.includes('CGK') ? 9000 : 0);
    const pickupDiscount = setting ? setting.pickup_discount_per_kg : (route.includes('CGK') ? 500 : 0);
    const enableOver5kg = setting ? setting.enable_over_5kg_price : route.includes('CGK');
    const enablePickupDisc = setting ? setting.enable_pickup_discount : route.includes('CGK');
    const baseExchangeRate = setting ? (setting.exchange_rate_krw_to_idr || 13.07) : 13.07;

    const calc = calculateInvoice({
      customerName: customer_name,
      route,
      weightKg: Number(weight_kg),
      itemCount: Number(item_count),
      pickupOrDelivery: pickup_or_delivery === 'pickup' ? 'pickup' : 'delivery',
      applyPickupDiscount: apply_pickup_discount !== false,
      extraCharges: extra_charges,
      normalPricePerKg: normalPrice,
      over5kgPricePerKg: over5kgPrice,
      pickupDiscountPerKg: pickupDiscount,
      enableOver5kgPrice: enableOver5kg,
      enablePickupDiscount: enablePickupDisc,
      exchangeRateKRWtoIDR: baseExchangeRate,
      paymentCurrencyPreference: payment_currency_preference,
    });

    // Generate Invoice Number: INV-YYYYMMDD-XXXX
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await prisma.invoice.count({
      where: {
        invoice_number: {
          startsWith: `INV-${todayStr}-`,
        },
      },
    });

    const seq = (countToday + 1).toString().padStart(4, '0');
    const invoiceNumber = `INV-${todayStr}-${seq}`;

    // Create Invoice with extra charges
    const invoice = await prisma.invoice.create({
      data: {
        invoice_number: invoiceNumber,
        customer_name: customer_name.trim(),
        route,
        weight_kg: Number(weight_kg),
        item_count: Number(item_count),
        pickup_or_delivery: pickup_or_delivery || 'delivery',
        base_price_per_kg: calc.basePricePerKg,
        final_price_per_kg: calc.finalPricePerKg,
        pickup_discount_per_kg: calc.pickupDiscountApplied,
        shipping_subtotal_krw: calc.shippingSubtotalKRW,
        total_krw: calc.totalKRW,
        total_idr: calc.totalIDR,
        payment_currency_preference: payment_currency_preference || 'ORIGINAL',
        exchange_rate_used: baseExchangeRate,
        payment_status: body.payment_status || 'Unpaid',
        delivery_status: body.delivery_status || 'Pending',
        customer_note: customer_note ? customer_note.trim() : null,
        internal_label_color: internal_label_color || null,
        show_label_to_customer: Boolean(show_label_to_customer),
        extra_charges: {
          create: extra_charges
            .filter((ec: any) => ec.name && ec.name.trim() && Number(ec.amount) > 0)
            .map((ec: any) => ({
              name: ec.name.trim(),
              currency: ec.currency === 'IDR' ? 'IDR' : 'KRW',
              amount: Number(ec.amount),
            })),
        },
      },
      include: {
        extra_charges: true,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
