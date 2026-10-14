import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";

const querySchema = z.object({
  accommodationId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    accommodationId: searchParams.get("accommodationId"),
    startDate: searchParams.get("startDate"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 });
  }

  const { accommodationId, startDate } = parsed.data;
  const dayStart = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const payload = await getPayload({ config });

  const room = await payload
    .findByID({ collection: "accommodations", id: accommodationId })
    .catch(() => null);

  if (!room || !room.active) {
    return NextResponse.json({ error: "Accommodation not found" }, { status: 404 });
  }

  // Date fields may be stored at any time of day, so match the whole UTC day.
  const availability = await payload.find({
    collection: "availability",
    where: {
      and: [
        { accommodation: { equals: accommodationId } },
        { startDate: { greater_than_equal: dayStart.toISOString() } },
        { startDate: { less_than: dayEnd.toISOString() } },
      ],
    },
    limit: 1,
  });

  const spotsBooked = availability.docs[0]?.spotsBooked ?? 0;
  const spotsRemaining = Math.max(0, room.totalCapacityUnits - spotsBooked);

  return NextResponse.json({
    available: spotsRemaining > 0,
    spotsRemaining,
    totalCapacity: room.totalCapacityUnits,
  });
}
