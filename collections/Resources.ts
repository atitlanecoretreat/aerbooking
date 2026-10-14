import type { CollectionConfig } from "payload";

import { authenticated } from "./access";

export const Resources: CollectionConfig = {
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
      name: "version",
      type: "text",
    },
    {
      name: "instructionsText",
      type: "textarea",
    },
  ],
  slug: "resources",
  upload: {
    mimeTypes: ["application/pdf"],
  },
};
