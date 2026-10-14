import { getPayload } from 'payload'
import config from '@payload-config'
import { BookingContainer } from '@/components/BookingContainer'

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ retreat?: string; room?: string }>;
}) {
  const { retreat: retreatSlug, room: roomSlug } = await searchParams;

  // If query parameters are missing, block access and instruct them to use the main site
  if (!retreatSlug || !roomSlug) {
    return (
      <main className="booking-main-wrapper">
        <div className="booking-error-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h1>Session Missing</h1>
          <p>Please select your retreat package and accommodation directly from the main website to begin your booking.</p>
          <a 
            href="https://atitlanecoretreat.com" 
            style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}
          >
            Return to Atitlan Eco Retreat
          </a>
        </div>
      </main>
    );
  }

  const payload = await getPayload({ config })

  // Directly fetch the specific retreat and room requested via URL slugs
  const retreats = await payload.find({
    collection: 'retreats',
    where: { 
      slug: { equals: retreatSlug },
      active: { equals: true } 
    },
  })

  const accommodations = await payload.find({
    collection: 'accommodations',
    where: { 
      slug: { equals: roomSlug },
      active: { equals: true } 
    },
  })

  const selectedRetreat = retreats.docs[0] || null;
  const selectedRoom = accommodations.docs[0] || null;

  // Handle invalid/inactive slugs passed in URL
  if (!selectedRetreat || !selectedRoom) {
    return (
      <main className="booking-main-wrapper">
        <div className="booking-error-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h1>Invalid Selection</h1>
          <p>The retreat package or accommodation specified in your link is invalid or no longer available.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="booking-main-wrapper">
      <div className="booking-container">
        <h1>Complete Your Reservation</h1>
        <BookingContainer selectedRetreat={selectedRetreat} selectedRoom={selectedRoom} />
      </div>
    </main>
  )
}