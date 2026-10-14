# Aerbooking

Booking portal built with Next.js and Payload CMS.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URI` to a MongoDB connection string and `PAYLOAD_SECRET` to a long random secret.
3. Set `RESEND_API_KEY` to your Resend API key. Set `RESEND_FROM_EMAIL` to a sender address on a domain verified with Resend; it defaults to `bookings@atitlanecoretreat.com`. `RESEND_FROM_NAME` defaults to `Atitlan Eco Retreat`.
4. Create a Cloudflare R2 bucket and API token with object read/write permissions. Set `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
5. Set `NEXT_PUBLIC_ASSETS_URL` to the public base URL configured for the R2 bucket. Uploaded Media files use this URL; Resources files use short-lived signed downloads.
6. Start the app:

   ```bash
   npm run dev
   ```

The Payload admin panel is available at `/admin`. Create the first admin account there; public first-user creation is disabled once that account exists. The Payload REST API is mounted at `/api`, GraphQL at `/api/graphql`, and the GraphQL playground at `/api/graphql-playground`.

Payload uses Resend for auth-related messages such as password resets and verification emails.

The CMS includes retreats, accommodations, availability, bookings, resources, and media collections. Retreat, accommodation, availability, resource, and media records can be read publicly; authenticated admins manage records and uploads. Booking records are restricted to authenticated admins. Media image uploads and Resource PDF uploads are stored in R2; Resource downloads use signed URLs.

The booking page accepts `?retreat={retreat-slug}&room={accommodation-slug}` to preselect active records. Missing or invalid slugs leave the corresponding selector available so guests can choose from active retreats and accommodations.

Seed the initial retreats and accommodation inventory after configuring MongoDB:

```bash
npm run seed
```

The seed command is safe to rerun: it creates records whose slugs are missing and leaves existing records unchanged.

## Validation

```bash
npm run lint
npm run build
```
