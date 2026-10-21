import "dotenv/config";
import { getPayload } from "payload";

import config from "../payload.config";

const retreats = [
  {
    title: "4-Day Yoga Wellness",
    slug: "yoga-wellness-4",
    durationDays: 4,
    startDayRestriction: "sunday_to_thursday",
    active: true,
  },
  {
    title: "7-Day Yoga Wellness",
    slug: "yoga-wellness-7",
    durationDays: 7,
    startDayRestriction: "sunday_only",
    active: true,
  },
  {
    title: "28-Day Yoga Wellness",
    slug: "yoga-wellness-28",
    durationDays: 28,
    startDayRestriction: "sunday_only",
    active: true,
  },
  {
    title: "7-Day Yoga Spanish",
    slug: "yoga-spanish-7",
    durationDays: 7,
    startDayRestriction: "sunday_only",
    active: true,
  },
  {
    title: "14-Day Yoga Spanish",
    slug: "yoga-spanish-14",
    durationDays: 14,
    startDayRestriction: "sunday_only",
    active: true,
  },
] as const;

const accommodations = [
  {
    title: "Dorm with Shared Bathroom",
    slug: "dorm-shared-bath",
    occupancyType: "single",
    totalCapacityUnits: 10,
    active: true,
  },
  {
    title: "Private Room with Shared Bathroom",
    slug: "private-shared-bath",
    occupancyType: "single",
    totalCapacityUnits: 4,
    active: true,
  },
  {
    title: "Private Room with Private Bathroom",
    slug: "private-private-bath",
    occupancyType: "single",
    totalCapacityUnits: 4,
    active: true,
  },
  {
    title: "Shared Room with Shared Bathroom",
    slug: "shared-shared-bath",
    occupancyType: "double",
    totalCapacityUnits: 5,
    active: true,
  },
  {
    title: "Shared Room with Private Bathroom",
    slug: "shared-private-bath",
    occupancyType: "double",
    totalCapacityUnits: 5,
    active: true,
  },
] as const;

const seedDatabase = async (): Promise<void> => {
  const payload = await getPayload({ config });

  try {
    let retreatsCreated = 0;

    for (const retreat of retreats) {
      const existing = await payload.find({
        collection: "retreats",
        limit: 1,
        overrideAccess: true,
        where: {
          slug: {
            equals: retreat.slug,
          },
        },
      });

      if (existing.docs.length > 0) {
        continue;
      }

      await payload.create({
        collection: "retreats",
        data: retreat,
        overrideAccess: true,
      });
      retreatsCreated += 1;
    }

    let accommodationsCreated = 0;

    for (const accommodation of accommodations) {
      const existing = await payload.find({
        collection: "accommodations",
        limit: 1,
        overrideAccess: true,
        where: {
          slug: {
            equals: accommodation.slug,
          },
        },
      });

      if (existing.docs.length > 0) {
        continue;
      }

      await payload.create({
        collection: "accommodations",
        data: accommodation,
        overrideAccess: true,
      });
      accommodationsCreated += 1;
    }

    // Placeholder prices and Stripe price IDs; replace with real values in the admin panel.
    let pricingCreated = 0;
    let pricingSkipped = 0;

    for (const retreat of retreats) {
      for (const accommodation of accommodations) {
        const [retreatDoc, accommodationDoc] = await Promise.all([
          payload.find({
            collection: "retreats",
            limit: 1,
            overrideAccess: true,
            where: { slug: { equals: retreat.slug } },
          }),
          payload.find({
            collection: "accommodations",
            limit: 1,
            overrideAccess: true,
            where: { slug: { equals: accommodation.slug } },
          }),
        ]);
        const retreatId = retreatDoc.docs[0]?.id;
        const accommodationId = accommodationDoc.docs[0]?.id;

        if (!retreatId || !accommodationId) {
          throw new Error(
            `Missing retreat or accommodation for ${retreat.slug} / ${accommodation.slug}`,
          );
        }

        const existing = await payload.find({
          collection: "pricing",
          limit: 1,
          overrideAccess: true,
          where: {
            and: [
              { retreat: { equals: retreatId } },
              { accommodation: { equals: accommodationId } },
            ],
          },
        });

        if (existing.docs.length > 0) {
          pricingSkipped += 1;
          continue;
        }

        await payload.create({
          collection: "pricing",
          data: {
            retreat: retreatId,
            accommodation: accommodationId,
            price: Math.floor(Math.random() * 1500) + 200,
            stripePriceID: `price_placeholder_${retreat.slug}_${accommodation.slug}`,
          },
          overrideAccess: true,
        });
        pricingCreated += 1;
      }
    }

    payload.logger.info({
      msg: "Database seeding completed.",
      retreatsCreated,
      retreatsSkipped: retreats.length - retreatsCreated,
      accommodationsCreated,
      accommodationsSkipped: accommodations.length - accommodationsCreated,
      pricingCreated,
      pricingSkipped,
    });
  } finally {
    await payload.destroy();
  }
};

seedDatabase().catch((error: unknown) => {
  console.error("Database seeding failed.", error);
  process.exitCode = 1;
});
