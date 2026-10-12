🗺️ Implementation Roadmap
Step 1: Project Setup & Environment Configuration

Initialize Next.js 15+ (App Router) with TypeScript and Tailwind/Custom CSS.

Configure Payload CMS 3.x with MongoDB Atlas connection.

Set up Cloudflare R2 media storage adapter and environment variables.

Step 2: Payload CMS Collections & Database Schemas

Build collections for Users, Retreats, Accommodations, Availability, Bookings, Resources, and Media.

Seed initial data for retreats and accommodation types with occupancy rules.

Step 3: Query Parameter Parsing & Dynamic Booking State

Create the single booking page (app/page.tsx).

Read and validate retreat and room query parameters from the URL.

Build fallback dropdown selectors if parameters are missing or invalid.

Step 4: Availability Engine & Sunday-Locking Date Picker

Build the interactive date picker component (enforcing Sunday check-in vs. flexible logic).

Calculate checkout dates dynamically based on duration.

Connect date selection to Payload CMS to verify live room/spot availability.

Step 5: Dynamic Guest Details Form

Build guest contact form (Name, Email, Phone, Dietary requirements, Special requests).

Dynamically append Guest 2 fields when double-occupancy shared rooms are selected.

Step 6: Stripe Checkout Integration & Webhooks

Create Next.js API route to generate Stripe Checkout sessions.

Implement Stripe Webhook handler (checkout.session.completed).

Trigger Payload Bookings record creation and update inventory capacity upon successful payment.

Step 7: Onboarding Emails & Success Page

Setup Resend integration for instant booking confirmation emails.

Build the post-checkout /success page with booking summary and downloadable Welcome Pack.

Step 8: Domain, CNAME & Subdomain Deployment

Deploy Next.js + Payload CMS app to Vercel/Railway.

Configure DNS CNAME records for book.atitlanecoretreat.com.

Wire up Elementor "Book Now" CTA buttons on the WordPress main site.
