import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateInvoice } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        extra_charges: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // If only status update
    if (body.payment_status && !body.customer_name) {
      const updated = await prisma.invoice.update({
        where: { id: params.id },
        data: {
          payment_status: body.payment_status,
          ...(body.delivery_status ? { delivery_status: body.delivery_status } : {}),
        },
        include: { extra_charges: true },
      });
      return NextResponse.json(updated);
    }

    if (body.delivery_status && !body.customer_name) {
      const updated = await prisma.invoice.update({
        where: { id: params.id },
        data: {
          delivery_status: body.delivery_status,
        },
        include: { extra_charges: true },
      });
      return NextResponse.json(updated);
    }

    // Full update
    const {
      customer_name,
      route,
      weight_kg,
      item_count,
      pickup_or_delivery,
      apply_pickup_discount,
      payment_status,
      delivery_status,
      customer_note,
      internal_label_color,
      show_label_to_customer,
      extra_charges = [],
    } = body;

    // Fetch route setting
    const setting = await prisma.settings.findUnique({
      where: { route },
    });

    const normalPrice = setting ? setting.normal_price_per_kg : (route.includes('ICN') ? 13000 : 9500);
    const over5kgPrice = setting ? setting.over_5kg_price_per_kg : (route.includes('CGK') ? 9000 : 0);
    const pickupDiscount = setting ? setting.pickup_discount_per_kg : (route.includes('CGK') ? 500 : 0);
    const enableOver5kg = setting ? setting.enable_over_5kg_price : route.includes('CGK');
    const enablePickupDisc = setting ? setting.enable_pickup_discount : route.includes('CGK');

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
    });

    // Delete existing extra charges first
    await prisma.invoiceExtraCharge.deleteMany({
      where: { invoice_id: params.id },
    });

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
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
        payment_status: payment_status || 'Unpaid',
        delivery_status: delivery_status || 'Pending',
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

    return NextResponse.json(updatedInvoice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.invoice.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
