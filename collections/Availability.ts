import type { CollectionConfig } from "payload";

import { authenticated } from "./access";

export const Availability: CollectionConfig = {
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    defaultColumns: ["startDate", "accommodation", "spotsRemaining", "spotsBooked"],
    useAsTitle: "startDate",
  },
  fields: [
    {
      index: true,
      name: "startDate",
      required: true,
      type: "date",
    },
    {
      index: true,
      name: "accommodation",
      relationTo: "accommodations",
      required: true,
      type: "relationship",
    },
    {
      defaultValue: 0,
      min: 0,
      name: "spotsBooked",
      required: true,
      type: "number",
    },
    {
      min: 0,
      name: "spotsRemaining",
      required: true,
      type: "number",
    },
  ],
  indexes: [
    {
      fields: ["accommodation", "startDate"],
      unique: true,
    },
  ],
  slug: "availability",
};
