# Atitlan Eco Retreat — Booking System Specifications

🏡 **A seamless, full-stack booking engine for Atitlan Eco Retreat, enabling guests to select check-in dates and complete reservations for structured yoga, wellness, and language immersion retreats with instant online payment.**

---

## 📌 Problem & Solution

Guests looking to book immersive yoga and language retreats at Lake Atitlán often face friction with manual email inquiries, back-and-forth scheduling, and offline payment coordination. Main marketing pages hosted on WordPress/Elementor showcase retreat packages and prices, but need a fast, reliable execution engine for date selection and payments.

➡️ **Atitlan Eco Retreat Booking System provides a single-page checkout portal on a dedicated subdomain (`book.atitlanecoretreat.com`). It pre-loads selected retreats and accommodations via URL parameters, enforces strict check-in schedule constraints (Sunday vs. Flexible), validates live inventory, processes full payments via Stripe, and immediately delivers onboarding assets upon reservation.**

---

## 🧑‍💻 Target Users & Roles

| Persona                       | Needs & Goals                                                                                                                                                                                                           |
| :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Retreat Guests**            | Arrive via pre-filled links from the main site, select valid check-in dates on an interactive calendar, supply primary and secondary guest details, make instant full payments via Stripe, and access the Welcome Pack. |
| **Retreat Admins / Managers** | Manage retreat offerings, configure room categories and inventory capacity, track incoming bookings, review guest rosters (including dietary preferences), and update Welcome Pack assets.                              |
| **On-Site Operations Team**   | View upcoming weekly guest schedules, room assignments, occupancy counts (single vs. double), and special requests to prepare accommodations and meals.                                                                 |

---

## 🧘 Retreat Packages & Scheduling Rules

| Retreat Name             | Slug               | Duration            | Check-in Rules          | End Date Calculation | Program & Focus                                                     |
| :----------------------- | :----------------- | :------------------ | :---------------------- | :------------------- | :------------------------------------------------------------------ |
| **4-Day Yoga Wellness**  | `yoga-wellness-4`  | 4 Days / 3 Nights   | **Any Day of the Week** | Check-in + 3 Days    | Flexible wellness getaway with yoga, meditation, breakfast & lunch. |
| **7-Day Yoga Wellness**  | `yoga-wellness-7`  | 7 Days / 6 Nights   | **Sunday Only**         | Following Saturday   | Full-week holistic yoga & meditation immersion.                     |
| **28-Day Yoga Wellness** | `yoga-wellness-28` | 28 Days / 27 Nights | **Sunday Only**         | 4th Saturday         | Month-long deep transformation retreat.                             |
| **7-Day Yoga Spanish**   | `yoga-spanish-7`   | 7 Days / 6 Nights   | **Sunday Only**         | Following Saturday   | Combined Yoga Wellness + 3 hours/day Spanish lessons.               |
| **14-Day Yoga Spanish**  | `yoga-spanish-14`  | 14 Days / 13 Nights | **Sunday Only**         | 2nd Saturday         | 2-week intensive Yoga + Spanish immersion.                          |

---

## 🛏️ Accommodation Types & Occupancy Logic

| Accommodation Name                     | Slug                   | Type         | Occupancy / Guest Handling                                              |
| :------------------------------------- | :--------------------- | :----------- | :---------------------------------------------------------------------- |
| **Dorm with Shared Bathroom**          | `dorm-shared-bath`     | Shared Dorm  | 1 Guest per spot booked.                                                |
| **Private Room with Shared Bathroom**  | `private-shared-bath`  | Private Room | 1 Guest.                                                                |
| **Private Room with Private Bathroom** | `private-private-bath` | Private Room | 1 Guest.                                                                |
| **Shared Room with Shared Bathroom**   | `shared-shared-bath`   | Shared Room  | **2 Guests required** (Primary + Guest 2 fields collected at checkout). |
| **Shared Room with Private Bathroom**  | `shared-private-bath`  | Shared Room  | **2 Guests required** (Primary + Guest 2 fields collected at checkout). |

---

## 🔗 Single-Page Routing & Pre-filling

Rather than hosting multiple checkout pages, the app operates on a **single dynamic page** (`app/page.tsx`):

- **URL Pattern:** `https://book.atitlanecoretreat.com/?retreat={retreat-slug}&room={room-slug}`
- **Fallback behavior:** If query parameters are missing or invalid, the interface presents intuitive selection dropdowns for the guest to pick their retreat package and room type before choosing dates.
- **Dynamic UX Adaptation:**
  1. Reading parameters updates the calendar rule engine (**Sunday-only** for 7/14/28-day vs. **Flexible** for 4-day).
  2. Rooms marked as double occupancy (`shared-shared-bath`, `shared-private-bath`) dynamically expand the form to require **Guest 1** and **Guest 2** contact information.

---

## 💳 Payment & Checkout Workflow

1. **URL Parameter Parsing & Availability Check:** Next.js parses query params, fetches the matching retreat/room configurations from Payload CMS, and verifies live date capacity.
2. **Date Selection & Guest Info Collection:** The guest selects a valid start date (which automatically computes the departure date) and fills out contact details.
3. **Full Upfront Payment via Stripe:** 100% of the retreat cost is collected upfront via **Stripe Checkout / Payment Intents API**.
4. **Post-Payment Webhook Execution:**
   - Stripe triggers a `checkout.session.completed` webhook.
   - A new `Bookings` record is created in Payload CMS with guest information, payment references, and stay dates.
   - Room/capacity availability counters in Payload are decremented for the selected date range.
   - A confirmation email with booking summary and onboarding instructions is sent via **Resend**.
5. **Success Page & Guest Onboarding:**
   - Redirects to `/success?booking_id={id}` displaying a full summary.
   - Grants direct access to view/download **"The Welcome Pack"** (PDF guide with arrival instructions, site location, packing lists, house guidelines, and dress codes).

---

## 🧱 Payload CMS Collections

1. **`Users`**
   - Fields: `email`, `name`, `roles` (`admin`)

2. **`Retreats`**
   - Fields: `title`, `slug`, `durationDays`, `startDayRestriction` (`any` or `sunday_only`), `description`, `active`

3. **`Accommodations`**
   - Fields: `title`, `slug`, `occupancyType` (`single` or `double`), `totalCapacityUnits`, `active`

4. **`Bookings`**
   - Fields: `bookingNumber`, `primaryGuestName`, `primaryGuestEmail`, `primaryGuestPhone`, `secondaryGuestName` (optional), `secondaryGuestEmail` (optional), `retreat` (Relationship to `Retreats`), `accommodation` (Relationship to `Accommodations`), `startDate`, `endDate`, `totalAmountPaid`, `currency` (`USD`), `stripePaymentIntentId`, `stripeCustomerId`, `paymentStatus` (`paid`, `refunded`, `failed`), `dietaryNeeds`, `specialRequests`, `welcomePackSent` (Boolean)

5. **`Availability` / `WeeklyInventory`**
   - Fields: `startDate` (Date), `accommodation` (Relationship to `Accommodations`), `spotsBooked` (Number), `spotsRemaining` (Number)

6. **`Resources`**
   - Fields: `title`, `documentFile` (PDF upload via Cloudflare R2), `version`, `instructionsText`

7. **`Media`**
   - Cloudflare R2 storage for assets and PDF documents.

---

## 🧱 Tech Stack

| Layer                    | Technology                      |
| :----------------------- | :------------------------------ |
| **Framework**            | Next.js (App Router, React 19)  |
| **Language**             | TypeScript                      |
| **CMS & Database**       | Payload CMS 3.x + MongoDB Atlas |
| **Payments**             | Stripe Checkout API / Webhooks  |
| **Storage**              | Vercel Blob                     |
| **Transactional Emails** | Resend                          |
| **UI & Styling**         | Custom Global CSS               |

---

## 🎨 UI / UX & Responsive Breakpoints

- **Theme & Branding:** Calming, earthy, eco-luxury aesthetic aligned with Atitlan Eco Retreat's physical site (warm neutral tones, clean typography, responsive layout).
- **Language:** **English Only** across the entire booking portal and success screen.
- **Custom Breakpoints (Strict Rule):**
  - **Tablet:** `@media (max-width: 1180px)`
  - **Mobile / Phone:** `@media (max-width: 680px)`
  - _(Do NOT use standard framework breakpoints like 768px, 1024px, or 1280px)._

---
