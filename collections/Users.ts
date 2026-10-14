import type { CollectionConfig } from "payload";

import { authenticated, createFirstAdmin } from "./access";

export const Users: CollectionConfig = {
  access: {
    admin: ({ req }) => Boolean(req.user),
    create: createFirstAdmin,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    useAsTitle: "email",
  },
  auth: true,
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "roles",
      type: "select",
      hasMany: true,
      defaultValue: "admin",
      options: [{ label: "Admin", value: "admin" }],
      required: true,
      saveToJWT: true,
    },
  ],
  slug: "users",
};
