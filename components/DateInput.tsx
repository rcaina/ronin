"use client";

import { forwardRef } from "react";

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Shared date picker used across the app.
 *
 * - `appearance-none` + `w-full` + `min-w-0` keep the native control from
 *   overflowing its container on mobile (iOS in particular).
 * - No forced `blur()` on change: browsers already close the calendar when a
 *   day is clicked, while month/year stepping keeps focus so you can re-pick a
 *   date without the picker slamming shut mid-edit.
 *
 * Extra `className` is appended for state variants (e.g. read-only styling).
 */
const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="date"
        className={`block w-full min-w-0 appearance-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary ${className}`}
        {...props}
      />
    );
  },
);

DateInput.displayName = "DateInput";

export default DateInput;
