import Image from "next/image";
import type Stripe from "stripe";
import { getPayload } from "payload";
import config from "@payload-config";
import { getStripe } from "@/lib/stripe";
import { WELCOME_PACK_URL } from "@/lib/booking-constants";

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

type BookingDetails = {
  retreatName: string;
  durationDays: number;
  stay: string;
  amountPaid: string;
  occupancy: string;
  startDate: string;
  endDate: string;
};

type BookingLoadResult =
  | { status: "unpaid" }
  | { status: "incomplete" }
  | { status: "error" }
  | ({ status: "success" } & BookingDetails);

function BookingStatus({ message }: { message: string }) {
  return (
    <main className="booking-main-wrapper">
      <div className="booking-container">
        <section className="booking-selection" aria-live="polite">
          <p className="booking-eyebrow">Booking confirmation</p>
          <h2>We couldn&apos;t load your booking details</h2>
          <p className="booking-next-step">{message}</p>
        </section>
      </div>
    </main>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isValidDate(date: string | undefined): date is string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date
  );
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <BookingStatus message="The payment session is missing. Please check your confirmation email or contact us for help." />
    );
  }

  let session: Stripe.Checkout.Session | null = null;

  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error("Unable to verify Stripe checkout session:", error);
  }

  if (!session) {
    return (
      <BookingStatus message="Your payment status could not be verified. Please check your confirmation email or contact us for help." />
    );
  }

  if (session.payment_status !== "paid") {
    return (
      <BookingStatus message="We haven't received confirmation of your payment yet. Please check your confirmation email or contact us for help." />
    );
  }

  if (
    !session.metadata?.retreatId ||
    !session.metadata.roomId ||
    !isValidDate(session.metadata.startDate) ||
    !isValidDate(session.metadata.endDate) ||
    session.amount_total == null
  ) {
    return (
      <BookingStatus message="Your payment was received, but we couldn't retrieve all of your booking details. Please contact us for help." />
    );
  }

  let result: BookingLoadResult;
  try {
    const payload = await getPayload({ config });
    const [retreat, room] = await Promise.all([
      payload.findByID({
        collection: "retreats",
        id: session.metadata.retreatId,
      }),
      payload.findByID({
        collection: "accommodations",
        id: session.metadata.roomId,
      }),
    ]);
    const amountPaid = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: session.currency?.toUpperCase() ?? "USD",
    }).format(session.amount_total / 100);

    result = {
      status: "success",
      retreatName: retreat.title,
      durationDays: retreat.durationDays,
      stay: room.title,
      amountPaid,
      occupancy: room.occupancyType === "double" ? "2 guests" : "1 guest",
      startDate: session.metadata.startDate,
      endDate: session.metadata.endDate,
    };
  } catch (error) {
    console.error("Unable to load booking details for paid session:", error);
    result = { status: "error" };
  }

  if (result.status === "error") {
    return (
      <BookingStatus message="Your payment was received, but we couldn't load your booking details. Please check your confirmation email or contact us for help." />
    );
  }

  return (
    <main className="booking-main-wrapper">
      <div className="booking-container">
        <section className="booking-selection">
          <div>
            <p className="booking-eyebrow">Your payment was successful</p>
            <h2>
              Thank you for booking your dream retreat with Atitlan Eco Retreat
            </h2>
            <p className="booking-next-step">
              Your reservation is confirmed. A confirmation email with your
              Welcome Pack link is on its way.
            </p>
          </div>

          <h3 className="success-retreat-title">{result.retreatName}</h3>

          <dl className="booking-details">
            <div>
              <dt>Duration</dt>
              <dd>{result.durationDays} days</dd>
            </div>
            <div>
              <dt>Stay</dt>
              <dd>{result.stay}</dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>{result.amountPaid}</dd>
            </div>
            <div>
              <dt>Occupancy</dt>
              <dd>{result.occupancy}</dd>
            </div>
            <div>
              <dt>Check-in</dt>
              <dd>{formatDate(result.startDate)}</dd>
            </div>
            <div>
              <dt>Check-out</dt>
              <dd>{formatDate(result.endDate)}</dd>
            </div>
          </dl>

          <a
            className="success-welcome-pack"
            href={WELCOME_PACK_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open your Welcome Pack
          </a>

          <div className="success-image-grid" aria-label="Retreat photos">
            <div className="success-image">
              <Image
                src="/view.jpg"
                alt="View from Atitlan Eco Retreat"
                fill
                sizes="(max-width: 680px) 80vw, 30vw"
              />
            </div>
            <div className="success-image">
              <Image
                src="/food.jpg"
                alt="Food served at the retreat"
                fill
                sizes="(max-width: 680px) 80vw, 30vw"
              />
            </div>
            <div className="success-image">
              <Image
                src="/cafe.jpg"
                alt="Cafe at Atitlan Eco Retreat"
                fill
                sizes="(max-width: 680px) 80vw, 30vw"
              />
            </div>
            <div className="success-image">
              <Image
                src="/cafe-inside.jpg"
                alt="Inside the retreat cafe"
                fill
                sizes="(max-width: 680px) 80vw, 30vw"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
