import type { CollectionConfig } from "payload";

import { authenticated } from "./access";
export const Pricing: CollectionConfig = {
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  fields: [
    {
      index: true,
      name: "retreat",
      relationTo: "retreats",
      required: true,
      type: "relationship",
    },
    {
      index: true,
      name: "accommodation",
      relationTo: "accommodations",
      required: true,
      type: "relationship",
    },
    {
      min: 0,
      name: "price",
      required: true,
      type: "number",
    },
    {
      name: "stripePriceID",
      required: true,
      type: "text",
    },
  ],
  indexes: [
    {
      fields: ["retreat", "accommodation"],
      unique: true,
    },
  ],
  slug: "pricing",
};
