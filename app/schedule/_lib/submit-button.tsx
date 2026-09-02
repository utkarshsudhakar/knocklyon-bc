"use client";

import { useFormStatus } from "react-dom";
import { ReactNode } from "react";

/**
 * A submit button that automatically shows a pending state (spinner + label)
 * while the parent <form>'s server action is in flight. Prevents the "did my
 * click even register?" problem and disables itself so users can't double-fire.
 *
 * Drop this in place of `<button type="submit">` inside any form using a
 * server action. No prop drilling needed — `useFormStatus` reads from context.
 */
export default function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-2 transition-opacity ${
        pending ? "opacity-80 cursor-wait" : ""
      } ${className ?? ""}`}
    >
      {pending && <Spinner />}
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
