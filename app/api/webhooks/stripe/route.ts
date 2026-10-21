import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { getStripe } from "@/lib/stripe";
import type { Booking } from "@/payload-types";
import { LIABILITY_FORM_URL, WELCOME_PACK_URL } from "@/lib/booking-constants";

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERNAL_NOTIFICATION_EMAIL = "atitlanecoretreat@gmail.com";

const metadataSchema = z.object({
  retreatId: z.string().min(1),
  roomId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  primaryGuestName: z.string().min(1),
  primaryGuestEmail: z.string().email(),
  primaryGuestPhone: z.string().min(1),
  secondaryGuestName: z.string().optional(),
  secondaryGuestEmail: z.string().email().or(z.literal("")).optional(),
});

function idOf(value: string | { id: string } | null): string | undefined {
  return typeof value === "string" ? value : (value?.id ?? undefined);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function POST(request: Request) {
  console.log("[webhook] Request received");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    console.error("[webhook] Missing secret or signature", {
      hasSecret: Boolean(webhookSecret),
      hasSignature: Boolean(signature),
    });
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 400 },
    );
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[webhook] Verified event ${event.type}`);

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    console.log(
      `[webhook] Session ${session.id} not paid: ${session.payment_status}`,
    );
    return NextResponse.json({ received: true });
  }

  const metadata = metadataSchema.safeParse(session.metadata);

  if (!metadata.success) {
    console.error(
      "Checkout session has invalid metadata:",
      session.id,
      metadata.error.issues,
    );
    return NextResponse.json(
      { error: "Invalid session metadata" },
      { status: 400 },
    );
  }

  if (session.amount_total == null) {
    console.error("Paid checkout session is missing its total:", session.id);
    return NextResponse.json(
      { error: "Missing session amount" },
      { status: 400 },
    );
  }

  const data = metadata.data;
  const paymentIntentId = idOf(session.payment_intent);

  try {
    const payload = await getPayload({ config });

    // Stripe retries webhooks; reuse an existing booking without incrementing inventory twice.
    let booking: Booking | undefined;
    if (paymentIntentId) {
      const existing = await payload.find({
        collection: "bookings",
        where: { stripePaymentIntentId: { equals: paymentIntentId } },
        limit: 1,
      });

      booking = existing.docs[0];
    }

    const startDate = new Date(`${data.startDate}T00:00:00.000Z`);
    const room = await payload.findByID({
      collection: "accommodations",
      id: data.roomId,
    });

    if (
      room.occupancyType === "double" &&
      (!data.secondaryGuestName || !data.secondaryGuestEmail)
    ) {
      console.error(
        "Double-occupancy checkout is missing second guest details:",
        session.id,
      );
      return NextResponse.json(
        { error: "Missing second guest details" },
        { status: 400 },
      );
    }

    if (!booking) {
      const bookingNumber = `AER-${Math.floor(100000 + Math.random() * 900000)}`;

      booking = await payload.create({
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
          totalAmountPaid: session.amount_total / 100,
          currency: session.currency?.toUpperCase() ?? "USD",
          stripePaymentIntentId: paymentIntentId,
          stripeCustomerId: idOf(session.customer),
          paymentStatus: "paid",
          welcomePackSent: false,
        },
      });

      const existingAvailability = await payload.find({
        collection: "availability",
        where: {
          and: [
            { accommodation: { equals: data.roomId } },
            { startDate: { greater_than_equal: startDate.toISOString() } },
            {
              startDate: {
                less_than: new Date(startDate.getTime() + DAY_MS).toISOString(),
              },
            },
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
    }

    console.log(
      `[webhook] Booking ${booking.bookingNumber} ready, welcomePackSent=${booking.welcomePackSent}`,
    );

    if (booking.welcomePackSent) {
      console.log(
        `[webhook] Skipping emails: booking ${booking.bookingNumber} already has welcomePackSent=true (Stripe retry or earlier send). Session ${session.id}`,
      );
    } else {
      const [retreat, room] = await Promise.all([
        payload.findByID({ collection: "retreats", id: data.retreatId }),
        payload.findByID({ collection: "accommodations", id: data.roomId }),
      ]);
      const guests = [
        data.primaryGuestName,
        ...(data.secondaryGuestName ? [data.secondaryGuestName] : []),
      ];
      const recipients = [
        data.primaryGuestEmail,
        ...(room.occupancyType === "double" && data.secondaryGuestEmail
          ? [data.secondaryGuestEmail]
          : []),
      ];
      const currency = session.currency?.toUpperCase() ?? "USD";
      const amountPaid = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(session.amount_total / 100);
      const checkIn = formatDate(data.startDate);
      const checkOut = formatDate(data.endDate);
      const guestList = guests.map(escapeHtml).join(", ");

      console.log("[webhook] Sending confirmation email to", recipients, {
        hasResendKey: Boolean(process.env.RESEND_API_KEY),
        from: process.env.RESEND_FROM_EMAIL ?? "hello@atitlanecoretreat.com",
      });

      const emailResult = await payload.sendEmail({
        from: {
          name: "Atitlan Eco Retreat",
          address: "hello@atitlanecoretreat.com",
        },
        to: recipients[0],
        ...(recipients.length > 1 ? { bcc: recipients.slice(1) } : {}),
        subject: "Your Atitlan Eco Retreat booking is confirmed",
        text: [
          `Hello ${guests.join(" and ")},`,
          "",
          "Your dream retreat booking is confirmed. Here are your reservation details:",
          `Retreat: ${retreat.title}`,
          `Duration: ${retreat.durationDays} days`,
          `Stay: ${room.title}`,
          `Amount paid: ${amountPaid}`,
          `Occupancy: ${room.occupancyType === "double" ? "2 guests" : "1 guest"}`,
          `Guests: ${guests.join(", ")}`,
          `Check-in: ${checkIn}`,
          `Check-out: ${checkOut}`,
          "",
          `Welcome Pack: ${WELCOME_PACK_URL}`,
          "",
          "We look forward to welcoming you.",
          "Atitlan Eco Retreat",
        ].join("\n"),
        html: `
          <p>Hello ${guests.map(escapeHtml).join(" and ")},</p>
          <p>Your booking is confirmed. Here are your reservation details:</p>
          <ul>
            <li><strong>Retreat:</strong> ${escapeHtml(retreat.title)}</li>
            <li><strong>Duration:</strong> ${retreat.durationDays} days</li>
            <li><strong>Stay:</strong> ${escapeHtml(room.title)}</li>
            <li><strong>Amount paid:</strong> ${escapeHtml(amountPaid)}</li>
            <li><strong>Occupancy:</strong> ${room.occupancyType === "double" ? "2 guests" : "1 guest"}</li>
            <li><strong>Guests:</strong> ${guestList}</li>
            <li><strong>Check-in:</strong> ${escapeHtml(checkIn)}</li>
            <li><strong>Check-out:</strong> ${escapeHtml(checkOut)}</li>
          </ul>
          <p><a href="${WELCOME_PACK_URL}">Open your Welcome Pack with all the relevant info you need to prepare yourself adequately for your dream retreat</a></p>
          <p><a href="${LIABILITY_FORM_URL}">The liability form you need to fill to attend the retreat</a></p>
          <p>We look forward to welcoming you.<br />Atitlan Eco Retreat</p>
        `,
      });

      console.log("[webhook] Resend response:", emailResult);

      await payload.update({
        collection: "bookings",
        id: booking.id,
        data: { welcomePackSent: true },
      });

      // Internal notification; failures must not trigger a webhook retry (guest email already sent).
      try {
        console.log(
          "[webhook] Sending internal notification to",
          INTERNAL_NOTIFICATION_EMAIL,
        );
        const stripeLines = [
          `Stripe Checkout Session ID: ${session.id}`,
          `Stripe Payment Intent ID: ${paymentIntentId ?? "N/A"}`,
        ];
        const internalResult = await payload.sendEmail({
          from: {
            name: "Atitlan Eco Retreat",
            address: "hello@atitlanecoretreat.com",
          },
          to: INTERNAL_NOTIFICATION_EMAIL,
          subject: "Retreat booked on AER's website",
          headers: { "X-AER-Label": "Customer booked" },
          text: [
            `Booking number: ${booking.bookingNumber}`,
            ...stripeLines,
            "",
            `Guest email(s): ${recipients.join(", ")}`,
            `Guest phone: ${data.primaryGuestPhone}`,
            `Retreat: ${retreat.title}`,
            `Duration: ${retreat.durationDays} days`,
            `Stay: ${room.title}`,
            `Amount paid: ${amountPaid}`,
            `Occupancy: ${room.occupancyType === "double" ? "2 guests" : "1 guest"}`,
            `Guests: ${guests.join(", ")}`,
            `Check-in: ${checkIn}`,
            `Check-out: ${checkOut}`,
          ].join("\n"),
          html: `
            <p>A retreat was booked on the AER website.</p>
            <ul>
              <li><strong>Booking number:</strong> ${escapeHtml(booking.bookingNumber)}</li>
              <li><strong>Stripe Checkout Session ID:</strong> ${escapeHtml(session.id)}</li>
              <li><strong>Stripe Payment Intent ID:</strong> ${escapeHtml(paymentIntentId ?? "N/A")}</li>
              <li><strong>Guest email(s):</strong> ${recipients.map(escapeHtml).join(", ")}</li>
              <li><strong>Guest phone:</strong> ${escapeHtml(data.primaryGuestPhone)}</li>
              <li><strong>Retreat:</strong> ${escapeHtml(retreat.title)}</li>
              <li><strong>Duration:</strong> ${retreat.durationDays} days</li>
              <li><strong>Stay:</strong> ${escapeHtml(room.title)}</li>
              <li><strong>Amount paid:</strong> ${escapeHtml(amountPaid)}</li>
              <li><strong>Occupancy:</strong> ${room.occupancyType === "double" ? "2 guests" : "1 guest"}</li>
              <li><strong>Guests:</strong> ${guestList}</li>
              <li><strong>Check-in:</strong> ${escapeHtml(checkIn)}</li>
              <li><strong>Check-out:</strong> ${escapeHtml(checkOut)}</li>
            </ul>
          `,
        });
        console.log(
          "[webhook] Internal notification response:",
          internalResult,
        );
      } catch (error) {
        console.error("[webhook] Failed to send internal notification:", error);
      }
    }

    console.log(
      `Processed booking ${booking.bookingNumber} for ${data.primaryGuestEmail}`,
    );
  } catch (error) {
    console.error(
      "[webhook] Error processing booking or sending email:",
      error,
    );
    return NextResponse.json(
      { error: "Database insertion error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
