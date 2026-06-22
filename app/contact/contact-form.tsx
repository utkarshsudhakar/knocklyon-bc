"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "../actions/contact";

const initial: ContactState = { status: "idle" };

const labelCls = "block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5";
const inputCls =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20";
const textareaCls =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none";

export default function ContactForm() {
  const [state, action, isPending] = useActionState(submitContact, initial);

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-white text-xl">
          ✓
        </div>
        <h3 className="mt-4 text-lg font-bold text-stone-900">Message sent!</h3>
        <p className="mt-1 text-sm text-stone-600">
          Thanks for getting in touch. We'll get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-4">
      {/* Name row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelCls}>
            First name <span className="text-red-400">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Aoife"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelCls}>
            Last name <span className="text-red-400">*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Murphy"
            required
            className={inputCls}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className={labelCls}>
          Email <span className="text-red-400">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="aoife@example.com"
          required
          className={inputCls}
        />
      </div>

      {/* Mobile + BI Number row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mobile" className={labelCls}>Mobile</label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            autoComplete="tel"
            placeholder="+353 87 000 0000"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="biNumber" className={labelCls}>
            BI Number{" "}
            <span className="text-stone-400 normal-case font-normal tracking-normal">
              (if available)
            </span>
          </label>
          <input
            id="biNumber"
            name="biNumber"
            type="text"
            placeholder="e.g. 123456"
            className={inputCls}
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className={labelCls}>
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Tell us a bit about yourself — experience level, what nights suit you, any questions..."
          required
          className={textareaCls}
        />
      </div>

      {/* Error */}
      {state.status === "error" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-forest py-3 text-sm font-semibold text-white transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {isPending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
