import type { CollectionConfig } from "payload";

import { authenticated } from "./access";

export const Bookings: CollectionConfig = {
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: [
      "bookingNumber",
      "primaryGuestName",
      "retreat",
      "startDate",
      "paymentStatus",
    ],
    useAsTitle: "bookingNumber",
  },
  fields: [
    {
      index: true,
      name: "bookingNumber",
      required: true,
      type: "text",
      unique: true,
    },
    {
      name: "primaryGuestName",
      required: true,
      type: "text",
    },
    {
      name: "primaryGuestEmail",
      required: true,
      type: "email",
    },
    {
      name: "primaryGuestPhone",
      required: true,
      type: "text",
    },
    {
      name: "secondaryGuestName",
      type: "text",
    },
    {
      name: "secondaryGuestEmail",
      type: "email",
    },
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
      index: true,
      name: "startDate",
      required: true,
      type: "date",
    },
    {
      name: "endDate",
      required: true,
      type: "date",
    },
    {
      min: 0,
      name: "totalAmountPaid",
      required: true,
      type: "number",
    },
    {
      defaultValue: "USD",
      name: "currency",
      required: true,
      type: "text",
    },
    {
      index: true,
      name: "stripePaymentIntentId",
      type: "text",
    },
    {
      name: "stripeCustomerId",
      type: "text",
    },
    {
      defaultValue: "pending",
      name: "paymentStatus",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Paid", value: "paid" },
        { label: "Refunded", value: "refunded" },
        { label: "Failed", value: "failed" },
      ],
      required: true,
      type: "select",
    },
    {
      name: "dietaryNeeds",
      type: "textarea",
    },
    {
      name: "specialRequests",
      type: "textarea",
    },
    {
      defaultValue: false,
      name: "welcomePackSent",
      required: true,
      type: "checkbox",
    },
  ],
  slug: "bookings",
};
