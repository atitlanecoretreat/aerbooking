# Current Feature

# Current Feature: Step 6 — Stripe Checkout Integration & Webhooks

## 🎯 Goal
Implement server-side price lookup (Retreat + Room combination), generate Stripe Checkout sessions with embedded booking metadata, and handle `checkout.session.completed` webhooks to create Payload CMS `Bookings` records and update inventory.

---

## 📄 `src/app/api/checkout-session/route.ts` (Stripe Checkout Session Generator)

```typescript
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import config from '@payload-config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-28.acacia' as any,
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      retreatId,
      roomId,
      startDate,
      endDate,
      primaryGuestName,
      primaryGuestEmail,
      primaryGuestPhone,
      secondaryGuestName,
      secondaryGuestEmail,
    } = body

    if (!retreatId || !roomId || !startDate || !endDate || !primaryGuestEmail) {
      return NextResponse.json({ error: 'Missing required booking parameters' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // 1. Fetch Retreat and Room records server-side
    const retreat = await payload.findByID({ collection: 'retreats', id: retreatId })
    const room = await payload.findByID({ collection: 'accommodations', id: roomId })

    if (!retreat || !room) {
      return NextResponse.json({ error: 'Invalid retreat or room selection' }, { status: 404 })
    }

    // 2. Fetch or Calculate Price (Server-side to prevent tampering)
    // Example lookup strategy: query Payload or use calculated base rate
    const calculatedAmountUSD = 1250 // Replace with your Payload Pricing lookup logic

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${retreat.title} — ${room.title}`,
              description: `Check-in: ${startDate} | Check-out: ${endDate}`,
            },
            unit_amount: Math.round(calculatedAmountUSD * 100), // convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/?retreat=${retreat.slug}&room=${room.slug}`,
      customer_email: primaryGuestEmail,
      metadata: {
        retreatId,
        roomId,
        startDate,
        endDate,
        primaryGuestName,
        primaryGuestEmail,
        primaryGuestPhone,
        secondaryGuestName: secondaryGuestName || '',
        secondaryGuestEmail: secondaryGuestEmail || '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}



📄 src/app/api/webhooks/stripe/route.ts (Stripe Webhook Handler & Payload Record Creation)

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import config from '@payload-config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-28.acacia' as any,
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Handle successful checkout completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    try {
      const bookingNumber = `AER-${Math.floor(100000 + Math.random() * 900000)}`
      const totalAmountPaid = session.amount_total ? session.amount_total / 100 : 0

      // 1. Create Payload Booking Record
      await payload.create({
        collection: 'bookings',
        data: {
          bookingNumber,
          primaryGuestName: metadata.primaryGuestName,
          primaryGuestEmail: metadata.primaryGuestEmail,
          primaryGuestPhone: metadata.primaryGuestPhone,
          secondaryGuestName: metadata.secondaryGuestName || undefined,
          secondaryGuestEmail: metadata.secondaryGuestEmail || undefined,
          retreat: metadata.retreatId,
          accommodation: metadata.roomId,
          startDate: metadata.startDate,
          endDate: metadata.endDate,
          totalAmountPaid,
          currency: 'USD',
          stripePaymentIntentId: session.payment_intent as string,
          stripeCustomerId: session.customer as string,
          paymentStatus: 'paid',
          welcomePackSent: false,
        },
      })

      // 2. Update Availability Inventory Record
      const existingAvailability = await payload.find({
        collection: 'availability',
        where: {
          and: [
            { accommodation: { equals: metadata.roomId } },
            { startDate: { equals: metadata.startDate } },
          ],
        },
      })

      if (existingAvailability.docs.length > 0) {
        const record = existingAvailability.docs[0]
        const newSpotsBooked = record.spotsBooked + 1
        const roomDoc = await payload.findByID({
          collection: 'accommodations',
          id: metadata.roomId,
        })
        const spotsRemaining = Math.max(0, roomDoc.totalCapacityUnits - newSpotsBooked)

        await payload.update({
          collection: 'availability',
          id: record.id,
          data: {
            spotsBooked: newSpotsBooked,
            spotsRemaining,
          },
        })
      } else {
        const roomDoc = await payload.findByID({
          collection: 'accommodations',
          id: metadata.roomId,
        })
        await payload.create({
          collection: 'availability',
          data: {
            startDate: metadata.startDate,
            accommodation: metadata.roomId,
            spotsBooked: 1,
            spotsRemaining: Math.max(0, roomDoc.totalCapacityUnits - 1),
          },
        })
      }

      console.log(`Successfully created booking ${bookingNumber} for ${metadata.primaryGuestEmail}`)
    } catch (dbError) {
      console.error('Error recording booking in Payload CMS:', dbError)
      return NextResponse.json({ error: 'Database insertion error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

```

### References

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interactions.md
- @context/all-features.md
