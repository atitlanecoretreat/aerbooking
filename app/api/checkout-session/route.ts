import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { getStripe } from "@/lib/stripe";

const bodySchema = z.object({
  retreatId: z.string().min(1),
  roomId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  primaryGuestName: z.string().trim().min(1),
  primaryGuestEmail: z.string().trim().email(),
  primaryGuestPhone: z.string().trim().min(1),
  secondaryGuestName: z.string().trim().optional(),
  secondaryGuestEmail: z.string().trim().email().optional().or(z.literal("")),
});

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid booking parameters" }, { status: 400 });
  }

  const body = parsed.data;
  const dayStart = new Date(`${body.startDate}T00:00:00.000Z`);

  if (Number.isNaN(dayStart.getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }

  const payload = await getPayload({ config });

  const [retreat, room] = await Promise.all([
    payload.findByID({ collection: "retreats", id: body.retreatId }).catch(() => null),
    payload.findByID({ collection: "accommodations", id: body.roomId }).catch(() => null),
  ]);

  if (!retreat?.active || !room?.active) {
    return NextResponse.json({ error: "Retreat or accommodation not found" }, { status: 404 });
  }

  if (retreat.startDayRestriction === "sunday_only" && dayStart.getUTCDay() !== 0) {
    return NextResponse.json({ error: "This retreat requires a Sunday check-in" }, { status: 400 });
  }

  if (room.occupancyType === "double" && (!body.secondaryGuestName || !body.secondaryGuestEmail)) {
    return NextResponse.json({ error: "Second guest details are required" }, { status: 400 });
  }

  const pricing = await payload.find({
    collection: "pricing",
    where: {
      and: [{ retreat: { equals: body.retreatId } }, { accommodation: { equals: body.roomId } }],
    },
    limit: 1,
  });
  const price = pricing.docs[0]?.price;

  if (!price || price <= 0) {
    return NextResponse.json(
      { error: "No price is configured for this retreat and accommodation" },
      { status: 404 },
    );
  }

  const availability = await payload.find({
    collection: "availability",
    where: {
      and: [
        { accommodation: { equals: body.roomId } },
        { startDate: { greater_than_equal: dayStart.toISOString() } },
        { startDate: { less_than: new Date(dayStart.getTime() + DAY_MS).toISOString() } },
      ],
    },
    limit: 1,
  });

  if (room.totalCapacityUnits - (availability.docs[0]?.spotsBooked ?? 0) <= 0) {
    return NextResponse.json({ error: "This accommodation is fully booked" }, { status: 409 });
  }

  const endDate = addDays(body.startDate, retreat.durationDays - 1);
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  if (!serverUrl) {
    return NextResponse.json({ error: "Server URL is not configured" }, { status: 500 });
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${retreat.title} - ${room.title}`,
              description: `Check-in: ${body.startDate} | Check-out: ${endDate}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${serverUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${serverUrl}/?retreat=${encodeURIComponent(retreat.slug)}&room=${encodeURIComponent(room.slug)}`,
      customer_email: body.primaryGuestEmail,
      metadata: {
        retreatId: body.retreatId,
        roomId: body.roomId,
        startDate: body.startDate,
        endDate,
        primaryGuestName: body.primaryGuestName,
        primaryGuestEmail: body.primaryGuestEmail,
        primaryGuestPhone: body.primaryGuestPhone,
        secondaryGuestName: body.secondaryGuestName ?? "",
        secondaryGuestEmail: body.secondaryGuestEmail ?? "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
