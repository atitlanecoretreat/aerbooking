# Aerbooking

Booking portal built with Next.js and Payload CMS.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URI` to a MongoDB connection string and `PAYLOAD_SECRET` to a long random secret.
3. Set `RESEND_API_KEY` to your Resend API key. Verify `atitlanecoretreat.com` with Resend; booking confirmations are sent from `hello@atitlanecoretreat.com`. `RESEND_FROM_EMAIL` defaults to this address for Payload auth messages, and `RESEND_FROM_NAME` defaults to `Atitlan Eco Retreat`.
4. Create a Cloudflare R2 bucket and API token with object read/write permissions. Set `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`; R2 stores Resource PDFs.
5. Add a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`; Blob stores Media images.
6. Start the app:

   ```bash
   npm run dev
   ```

The Payload admin panel is available at `/admin`. Create the first admin account there; public first-user creation is disabled once that account exists. The Payload REST API is mounted at `/api`, GraphQL at `/api/graphql`, and the GraphQL playground at `/api/graphql-playground`.

Payload uses Resend for auth-related messages such as password resets and verification emails. Paid Stripe bookings trigger a confirmation email with the retreat, accommodation, guest, payment, date, and Welcome Pack details; double-occupancy bookings send it to both guests.

The CMS includes retreats, accommodations, availability, bookings, resources, and media collections. Retreat, accommodation, availability, resource, and media records can be read publicly; authenticated admins manage records and uploads. Booking records are restricted to authenticated admins. Media image uploads are stored in Vercel Blob; Resource PDF uploads are stored in R2 and use signed download URLs.

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
