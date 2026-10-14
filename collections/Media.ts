import type { CollectionConfig } from "payload";

import { authenticated } from "./access";

export const Media: CollectionConfig = {
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    useAsTitle: "alt",
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
  ],
  slug: "media",
  upload: {
    mimeTypes: ["image/*"],
  },
};
