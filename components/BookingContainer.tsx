"use client";

import { useState } from "react";
import { DatePicker, type SelectedDates } from "@/components/DatePicker";
import { GuestForm, type GuestFormData } from "@/components/GuestForm";
import type { Accommodation, Retreat } from "@/payload-types";

interface BookingContainerProps {
  selectedRetreat: Retreat;
  selectedRoom: Accommodation;
  price: number | null;
}

export function BookingContainer({
  selectedRetreat,
  selectedRoom,
  price,
}: BookingContainerProps) {
  const [selectedDates, setSelectedDates] = useState<SelectedDates | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleSubmitGuestInfo = async (guestInfo: GuestFormData) => {
    if (!selectedDates) return;

    const { startDate } = selectedDates;
    const month = String(startDate.getMonth() + 1).padStart(2, "0");
    const day = String(startDate.getDate()).padStart(2, "0");

    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...guestInfo,
          retreatId: String(selectedRetreat.id),
          roomId: String(selectedRoom.id),
          startDate: `${startDate.getFullYear()}-${month}-${day}`,
        }),
      });
      const data: { url?: string; error?: string } = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Unable to start checkout.");
      }

      window.location.assign(data.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="booking-workflow">
      <section className="booking-selection" aria-live="polite">
        <div>
          <p className="booking-eyebrow">Your selected experience</p>
          <h2>{selectedRetreat.title}</h2>
          {selectedRetreat.description && <p>{selectedRetreat.description}</p>}
        </div>
        <dl className="booking-details">
          <div>
            <dt>Duration</dt>
            <dd>{selectedRetreat.durationDays} days</dd>
          </div>
          <div>
            <dt>Amount to pay</dt>
            <dd>
              {price == null
                ? "Price unavailable"
                : new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(price)}
            </dd>
          </div>
          <div>
            <dt>Stay</dt>
            <dd>{selectedRoom.title}</dd>
          </div>
          <div>
            <dt>Occupancy</dt>
            <dd>
              {selectedRoom.occupancyType === "double" ? "2 guests" : "1 guest"}
            </dd>
          </div>
        </dl>
        <DatePicker
          key={`${selectedRetreat.id}-${selectedRoom.id}`}
          accommodationId={String(selectedRoom.id)}
          durationDays={selectedRetreat.durationDays}
          startDayRestriction={selectedRetreat.startDayRestriction}
          onDateSelect={setSelectedDates}
        />
        {selectedDates && (
          <GuestForm
            occupancyType={selectedRoom.occupancyType}
            onSubmitGuestInfo={handleSubmitGuestInfo}
            isSubmitting={isSubmitting}
          />
        )}
        {checkoutError && (
          <p className="form-error" role="alert">
            {checkoutError}
          </p>
        )}
      </section>
    </div>
  );
}
