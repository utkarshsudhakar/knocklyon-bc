"use client";

import { useTina } from "tinacms/dist/react";
import PageHero from "../components/page-hero";
import ContactForm from "./contact-form";

type Props = { data: any; query: string; variables: object; settings: any };

export default function ContactClient({ data, query, variables, settings }: Props) {
  const { data: live } = useTina({ query, variables, data });
  const page = live.page;

  const contacts = [
    {
      label: "Email",
      value: settings?.club_email,
      href: settings?.club_email ? `mailto:${settings.club_email}` : null,
    },
    {
      label: "Phone",
      value: settings?.phone,
      href: settings?.phone ? `tel:${settings.phone.replace(/\s+/g, "")}` : null,
    },
    {
      label: "Address",
      value: settings?.address,
      multiline: true,
    },
  ].filter((r) => r.value);

  return (
    <>
      <PageHero eyebrow="Reach out" title={page.title} subtitle={page.hero_subtitle} />

      {/* ── Form + contact card ───────────────────────── */}
      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-10 md:grid-cols-[1fr_300px]">

        {/* Left: contact form */}
        <div>
          <h2 className="text-lg font-bold text-stone-900">Send us a message</h2>
          <p className="mt-1 mb-6 text-sm text-stone-500">
            Fill in the form below and we'll get back to you as soon as possible.
          </p>
          <ContactForm />
        </div>

        {/* Right: contact details + social */}
        <aside className="h-fit space-y-6">
          {contacts.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-green-50 overflow-hidden">
              <div className="p-6">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-mid">
                  Club contacts
                </p>
                <dl className="mt-4 divide-y divide-stone-200">
                  {contacts.map((r) => (
                    <div key={r.label} className="py-3.5 first:pt-0 last:pb-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                        {r.label}
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-stone-900">
                        {r.href ? (
                          <a href={r.href} className="text-forest hover:underline">
                            {r.value}
                          </a>
                        ) : r.multiline ? (
                          <span className="whitespace-pre-line text-stone-700">{r.value}</span>
                        ) : (
                          r.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Compact map — sits flush inside the card */}
              <div className="border-t border-stone-200">
                <iframe
                  src="https://maps.google.com/maps?q=Knocklyon+Community+Centre,+Knocklyon+Road,+Dublin+16,+Ireland&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="180"
                  className="block border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Knocklyon Community Centre map"
                />
                <a
                  href="https://maps.google.com/?q=Knocklyon+Community+Centre+Dublin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 py-2.5 text-xs font-semibold text-forest hover:underline"
                >
                  Open in Google Maps →
                </a>
              </div>
            </div>
          )}

          {(settings?.facebook_url || settings?.instagram_url) && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Follow us
              </p>
              <div className="mt-3 flex gap-3">
                {settings?.facebook_url && (
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-[#1877F2] hover:text-[#1877F2]"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                )}
                {settings?.instagram_url && (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-[#E1306C] hover:text-[#E1306C]"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                    </svg>
                    Instagram
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </section>

    </>
  );
}
