"use client";

import { useState } from "react";
import Image from "next/image";

export interface SelectedDates {
  startDate: Date;
  endDate: Date;
}

interface DatePickerProps {
  durationDays: number;
  startDayRestriction: "sunday_only" | "sunday_to_thursday" | "any";
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
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(
    null,
  );
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  ).getDay();
  const calendarDays: (Date | null)[] = [
    ...Array<Date | null>(firstWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) =>
        new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth(),
          index + 1,
        ),
    ),
  ];

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

  const changeMonth = (monthOffset: number) => {
    setVisibleMonth(
      (month) =>
        new Date(month.getFullYear(), month.getMonth() + monthOffset, 1),
    );
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
      setAvailabilityMessage(
        "This retreat requires a Sunday check-in. Please select a Sunday.",
      );
      onDateSelect(null);
      return;
    }

    if (startDayRestriction === "sunday_to_thursday" && startDate.getDay() > 4) {
      setEndDate(null);
      setIsAvailable(false);
      setAvailabilityMessage(
        "This retreat requires a check-in from Sunday to Thursday. Please select another day.",
      );
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
      const data: { available?: boolean; spotsRemaining?: number } =
        await res.json();

      if (res.ok && data.available) {
        setIsAvailable(true);
        setAvailabilityMessage(
          `Available! (${data.spotsRemaining} spots remaining)`,
        );
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
      setAvailabilityMessage(
        "Unable to verify availability. Please try again.",
      );
      onDateSelect(null);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="date-picker">
      <div className="date-picker-left">
        <h3>Select Your Check-in Date</h3>
        <p className="date-picker-note">
          {startDayRestriction === "sunday_only"
            ? "Check-ins for this retreat are strictly on Sundays."
            : startDayRestriction === "sunday_to_thursday"
              ? "Check-ins for this retreat are from Sunday to Thursday."
              : "You can check in on any day of the week."}
        </p>

        <div className="date-calendar">
          <div className="calendar-heading">
            <span id="checkin-date-label">
              Choose an available check-in date to book your stay.
            </span>
            <div className="calendar-navigation">
              <button
                type="button"
                aria-label="Previous month"
                disabled={
                  visibleMonth.getFullYear() === today.getFullYear() &&
                  visibleMonth.getMonth() <= today.getMonth()
                }
                onClick={() => changeMonth(-1)}
              >
                <span aria-hidden="true">&lsaquo;</span>
              </button>
              <h4 aria-live="polite">
                {visibleMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h4>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
              >
                <span aria-hidden="true">&rsaquo;</span>
              </button>
            </div>
          </div>
          <div
            className="calendar-grid"
            role="group"
            aria-labelledby="checkin-date-label"
            aria-busy={isChecking}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (weekday) => (
                <span
                  className="calendar-weekday"
                  key={weekday}
                  aria-hidden="true"
                >
                  {weekday}
                </span>
              ),
            )}
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <span
                    className="calendar-day-spacer"
                    key={`empty-${index}`}
                    aria-hidden="true"
                  />
                );
              }

              const dateValue = toDateInputValue(date);
              const isRestrictedDay =
                (startDayRestriction === "sunday_only" && date.getDay() !== 0) ||
                (startDayRestriction === "sunday_to_thursday" && date.getDay() > 4);

              return (
                <button
                  className={`calendar-day${selectedStartDate === dateValue ? " is-selected" : ""}`}
                  key={dateValue}
                  type="button"
                  aria-label={date.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  aria-pressed={selectedStartDate === dateValue}
                  disabled={isChecking || date < todayStart || isRestrictedDay}
                  onClick={() => handleDateChange(dateValue)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
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
              isAvailable === true
                ? " is-available"
                : isAvailable === false
                  ? " is-unavailable"
                  : ""
            }`}
            role="status"
          >
            {availabilityMessage}
          </p>
        )}
      </div>
      <div className="date-picker-right">
        <div className="date-picker-image">
          <Image
            src="/view.jpg"
            alt="View from Atitlan Eco Retreat"
            fill
            sizes="(max-width: 680px) 40vw, 22vw"
          />
        </div>
        <div className="date-picker-image">
          <Image
            src="/food.jpg"
            alt="Food served at the retreat"
            fill
            sizes="(max-width: 680px) 40vw, 22vw"
          />
        </div>
        <div className="date-picker-image">
          <Image
            src="/cafe.jpg"
            alt="Cafe at Atitlan Eco Retreat"
            fill
            sizes="(max-width: 680px) 40vw, 22vw"
          />
        </div>
        <div className="date-picker-image">
          <Image
            src="/cafe-inside.jpg"
            alt="Inside the retreat cafe"
            fill
            sizes="(max-width: 680px) 40vw, 22vw"
          />
        </div>
      </div>
    </div>
  );
}
