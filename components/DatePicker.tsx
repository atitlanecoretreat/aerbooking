"use client";

import { useState } from "react";

export interface SelectedDates {
  startDate: Date;
  endDate: Date;
}

interface DatePickerProps {
  durationDays: number;
  startDayRestriction: "sunday_only" | "any";
  accommodationId: string;
  onDateSelect: (dates: SelectedDates | null) => void;
}

function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function DatePicker({
  durationDays,
  startDayRestriction,
  accommodationId,
  onDateSelect,
}: DatePickerProps) {
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const calculateEndDate = (start: Date): Date => {
    const end = new Date(start);
    end.setDate(start.getDate() + (durationDays - 1));
    return end;
  };

  const reset = () => {
    setEndDate(null);
    setIsAvailable(null);
    setAvailabilityMessage(null);
    onDateSelect(null);
  };

  const handleDateChange = async (dateStr: string) => {
    setSelectedStartDate(dateStr);

    if (!dateStr) {
      reset();
      return;
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const startDate = new Date(year, month - 1, day);

    if (startDayRestriction === "sunday_only" && startDate.getDay() !== 0) {
      setEndDate(null);
      setIsAvailable(false);
      setAvailabilityMessage("This retreat requires a Sunday check-in. Please select a Sunday.");
      onDateSelect(null);
      return;
    }

    const calculatedEnd = calculateEndDate(startDate);
    setEndDate(calculatedEnd);
    setIsChecking(true);
    setIsAvailable(null);
    setAvailabilityMessage("Checking room availability...");
    onDateSelect(null);

    try {
      const res = await fetch(
        `/api/check-availability?accommodationId=${encodeURIComponent(accommodationId)}&startDate=${dateStr}`,
      );
      const data: { available?: boolean; spotsRemaining?: number } = await res.json();

      if (res.ok && data.available) {
        setIsAvailable(true);
        setAvailabilityMessage(`Available! (${data.spotsRemaining} spots remaining)`);
        onDateSelect({ startDate, endDate: calculatedEnd });
      } else {
        setIsAvailable(false);
        setAvailabilityMessage(
          res.ok
            ? "Sorry, this accommodation is fully booked for the selected dates."
            : "Unable to verify availability. Please try again.",
        );
        onDateSelect(null);
      }
    } catch {
      setIsAvailable(false);
      setAvailabilityMessage("Unable to verify availability. Please try again.");
      onDateSelect(null);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="date-picker">
      <h3>Select Your Check-in Date</h3>
      <p className="date-picker-note">
        {startDayRestriction === "sunday_only"
          ? "Check-ins for this retreat are strictly on Sundays."
          : "You can check in on any day of the week."}
      </p>

      <div className="booking-field">
        <label htmlFor="checkin-date">Check-in Date</label>
        <input
          id="checkin-date"
          type="date"
          value={selectedStartDate}
          min={toDateInputValue(new Date())}
          disabled={isChecking}
          onChange={(event) => handleDateChange(event.target.value)}
        />
      </div>

      {endDate && (
        <div className="date-summary">
          <p>
            <strong>Check-out Date:</strong>{" "}
            {endDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      )}

      {availabilityMessage && (
        <p
          className={`availability-status${
            isAvailable === true ? " is-available" : isAvailable === false ? " is-unavailable" : ""
          }`}
          role="status"
        >
          {availabilityMessage}
        </p>
      )}
    </div>
  );
}
