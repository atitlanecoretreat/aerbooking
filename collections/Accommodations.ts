import type { CollectionConfig } from "payload";

import { authenticated } from "./access";

export const Accommodations: CollectionConfig = {
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      index: true,
      name: "slug",
      required: true,
      type: "text",
      unique: true,
    },
    {
      defaultValue: "single",
      name: "occupancyType",
      options: [
        { label: "Single Occupancy", value: "single" },
        { label: "Double Occupancy", value: "double" },
      ],
      required: true,
      type: "select",
    },
    {
      min: 1,
      name: "totalCapacityUnits",
      required: true,
      type: "number",
    },
    {
      defaultValue: true,
      name: "active",
      required: true,
      type: "checkbox",
    },
  ],
  slug: "accommodations",
};
