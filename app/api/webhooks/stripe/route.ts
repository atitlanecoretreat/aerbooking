import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { getStripe } from "@/lib/stripe";

const DAY_MS = 24 * 60 * 60 * 1000;

const metadataSchema = z.object({
  retreatId: z.string().min(1),
  roomId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  primaryGuestName: z.string().min(1),
  primaryGuestEmail: z.string().email(),
  primaryGuestPhone: z.string().min(1),
  secondaryGuestName: z.string().optional(),
  secondaryGuestEmail: z.string().optional(),
});

function idOf(value: string | { id: string } | null): string | undefined {
  return typeof value === "string" ? value : (value?.id ?? undefined);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const metadata = metadataSchema.safeParse(session.metadata);

  if (!metadata.success) {
    console.error("Checkout session has invalid metadata:", session.id);
    return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 });
  }

  const data = metadata.data;
  const paymentIntentId = idOf(session.payment_intent);

  try {
    const payload = await getPayload({ config });

    // Stripe retries webhooks, so skip sessions that already produced a booking.
    if (paymentIntentId) {
      const existing = await payload.find({
        collection: "bookings",
        where: { stripePaymentIntentId: { equals: paymentIntentId } },
        limit: 1,
      });

      if (existing.docs.length > 0) {
        return NextResponse.json({ received: true });
      }
    }

    const bookingNumber = `AER-${Math.floor(100000 + Math.random() * 900000)}`;
    const startDate = new Date(`${data.startDate}T00:00:00.000Z`);

    await payload.create({
      collection: "bookings",
      data: {
        bookingNumber,
        primaryGuestName: data.primaryGuestName,
        primaryGuestEmail: data.primaryGuestEmail,
        primaryGuestPhone: data.primaryGuestPhone,
        secondaryGuestName: data.secondaryGuestName || undefined,
        secondaryGuestEmail: data.secondaryGuestEmail || undefined,
        retreat: data.retreatId,
        accommodation: data.roomId,
        startDate: startDate.toISOString(),
        endDate: new Date(`${data.endDate}T00:00:00.000Z`).toISOString(),
        totalAmountPaid: (session.amount_total ?? 0) / 100,
        currency: "USD",
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: idOf(session.customer),
        paymentStatus: "paid",
        welcomePackSent: false,
      },
    });

    const room = await payload.findByID({ collection: "accommodations", id: data.roomId });
    const existingAvailability = await payload.find({
      collection: "availability",
      where: {
        and: [
          { accommodation: { equals: data.roomId } },
          { startDate: { greater_than_equal: startDate.toISOString() } },
          { startDate: { less_than: new Date(startDate.getTime() + DAY_MS).toISOString() } },
        ],
      },
      limit: 1,
    });
    const record = existingAvailability.docs[0];
    const spotsBooked = (record?.spotsBooked ?? 0) + 1;
    const spotsRemaining = Math.max(0, room.totalCapacityUnits - spotsBooked);

    if (record) {
      await payload.update({
        collection: "availability",
        id: record.id,
        data: { spotsBooked, spotsRemaining },
      });
    } else {
      await payload.create({
        collection: "availability",
        data: {
          startDate: startDate.toISOString(),
          accommodation: data.roomId,
          spotsBooked,
          spotsRemaining,
        },
      });
    }

    console.log(`Processed booking ${bookingNumber} for ${data.primaryGuestEmail}`);
  } catch (error) {
    console.error("Error recording booking in Payload CMS:", error);
    return NextResponse.json({ error: "Database insertion error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
