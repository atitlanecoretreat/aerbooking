import type { CollectionConfig } from "payload";

import { authenticated } from "./access";

export const Retreats: CollectionConfig = {
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
      min: 1,
      name: "durationDays",
      required: true,
      type: "number",
    },
    {
      defaultValue: "sunday_only",
      name: "startDayRestriction",
      options: [
        { label: "Sunday Only", value: "sunday_only" },
        { label: "Sunday to Thursday", value: "sunday_to_thursday" },
        { label: "Any Day", value: "any" },
      ],
      required: true,
      type: "select",
    },
    {
      name: "description",
      type: "textarea",
    },
    {
      defaultValue: true,
      name: "active",
      required: true,
      type: "checkbox",
    },
  ],
  slug: "retreats",
};
