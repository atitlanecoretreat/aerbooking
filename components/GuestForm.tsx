"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { z } from "zod";

export interface GuestFormData {
  primaryGuestName: string;
  primaryGuestEmail: string;
  primaryGuestPhone: string;
  secondaryGuestName?: string;
  secondaryGuestEmail?: string;
}

interface GuestFormProps {
  occupancyType: "single" | "double";
  onSubmitGuestInfo: (formData: GuestFormData) => void;
  isSubmitting?: boolean;
}

const baseSchema = z.object({
  primaryGuestName: z.string().trim().min(1, "Primary guest name is required."),
  primaryGuestEmail: z.string().trim().email("Enter a valid email address."),
  primaryGuestPhone: z.string().trim().min(1, "Phone number is required."),
  secondaryGuestName: z.string().trim().optional(),
  secondaryGuestEmail: z.string().trim().optional(),
});

const doubleSchema = baseSchema.extend({
  secondaryGuestName: z.string().trim().min(1, "Second guest name is required."),
  secondaryGuestEmail: z.string().trim().email("Enter a valid email for the second guest."),
});

const initialData: GuestFormData = {
  primaryGuestName: "",
  primaryGuestEmail: "",
  primaryGuestPhone: "",
  secondaryGuestName: "",
  secondaryGuestEmail: "",
};

export function GuestForm({
  occupancyType,
  onSubmitGuestInfo,
  isSubmitting = false,
}: GuestFormProps) {
  const [formData, setFormData] = useState<GuestFormData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const isDouble = occupancyType === "double";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = (isDouble ? doubleSchema : baseSchema).safeParse(formData);

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setError(null);
    const data: GuestFormData = isDouble
      ? result.data
      : { ...result.data, secondaryGuestName: undefined, secondaryGuestEmail: undefined };
    onSubmitGuestInfo(data);
  };

  return (
    <form onSubmit={handleSubmit} className="guest-form" noValidate>
      <h3>Guest Information</h3>

      <div className="booking-field">
        <label htmlFor="primaryGuestName">Primary Guest Full Name *</label>
        <input
          type="text"
          id="primaryGuestName"
          name="primaryGuestName"
          required
          value={formData.primaryGuestName}
          onChange={handleChange}
        />
      </div>

      <div className="booking-fields">
        <div className="booking-field">
          <label htmlFor="primaryGuestEmail">Email Address *</label>
          <input
            type="email"
            id="primaryGuestEmail"
            name="primaryGuestEmail"
            required
            value={formData.primaryGuestEmail}
            onChange={handleChange}
          />
        </div>
        <div className="booking-field">
          <label htmlFor="primaryGuestPhone">Phone Number *</label>
          <input
            type="tel"
            id="primaryGuestPhone"
            name="primaryGuestPhone"
            required
            value={formData.primaryGuestPhone}
            onChange={handleChange}
          />
        </div>
      </div>

      {isDouble && (
        <div className="double-occupancy-section">
          <h4>Second Guest Details (Double Occupancy Room)</h4>

          <div className="booking-field">
            <label htmlFor="secondaryGuestName">Second Guest Full Name *</label>
            <input
              type="text"
              id="secondaryGuestName"
              name="secondaryGuestName"
              required
              value={formData.secondaryGuestName}
              onChange={handleChange}
            />
          </div>

          <div className="booking-field">
            <label htmlFor="secondaryGuestEmail">Second Guest Email *</label>
            <input
              type="email"
              id="secondaryGuestEmail"
              name="secondaryGuestEmail"
              required
              value={formData.secondaryGuestEmail}
              onChange={handleChange}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="booking-submit" disabled={isSubmitting}>
        {isSubmitting ? "Redirecting to Stripe..." : "Proceed to Payment"}
      </button>
    </form>
  );
}
