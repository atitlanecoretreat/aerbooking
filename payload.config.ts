import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { resendAdapter } from "@payloadcms/email-resend";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Accommodations } from "./collections/Accommodations";
import { Availability } from "./collections/Availability";
import { Bookings } from "./collections/Bookings";
import { Media } from "./collections/Media";
import { Pricing } from "./collections/Pricing";
import { Resources } from "./collections/Resources";
import { Retreats } from "./collections/Retreats";
import { Users } from "./collections/Users";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const requiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export default buildConfig({
  admin: {
    importMap: {
      baseDir: dirname,
    },
    user: Users.slug,
  },
  collections: [
    Users,
    Retreats,
    Accommodations,
    Availability,
    Bookings,
    Pricing,
    Resources,
    Media,
  ],
  db: mongooseAdapter({
    url: requiredEnv("DATABASE_URI"),
  }),
  editor: lexicalEditor(),
  email: resendAdapter({
    apiKey: requiredEnv("RESEND_API_KEY"),
    defaultFromAddress:
      process.env.RESEND_FROM_EMAIL ?? "hello@atitlanecoretreat.com",
    defaultFromName: process.env.RESEND_FROM_NAME ?? "Atitlan Eco Retreat",
  }),
  plugins: [
    vercelBlobStorage({
      collections: {
        media: {
          prefix: "media",
        },
      },
      token: requiredEnv("BLOB_READ_WRITE_TOKEN"),
    }),
    s3Storage({
      bucket: requiredEnv("S3_BUCKET"),
      collections: {
        resources: {
          prefix: "resources",
          signedDownloads: {
            shouldUseSignedURL: () => true,
          },
        },
      },
      config: {
        credentials: {
          accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
          secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
        },
        endpoint: requiredEnv("S3_ENDPOINT").replace(/\/+$/, ""),
        forcePathStyle: true,
        region: "auto",
      },
    }),
  ],
  secret: requiredEnv("PAYLOAD_SECRET"),
  serverURL: requiredEnv("PAYLOAD_PUBLIC_SERVER_URL").replace(/\/+$/, ""),
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
