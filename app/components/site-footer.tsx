import Link from "next/link";

type Props = {
  settings?: {
    club_name?: string | null;
    club_email?: string | null;
    phone?: string | null;
    address?: string | null;
    facebook_url?: string | null;
    instagram_url?: string | null;
  } | null;
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/news", label: "News" },
  { href: "/gallery", label: "Gallery" },
  { href: "/useful-links", label: "Useful Links" },
];

export default function SiteFooter({ settings }: Props) {
  const name = settings?.club_name ?? "Knocklyon Badminton Club";

  return (
    <footer className="border-t border-stone-200 bg-stone-800 text-stone-300">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">

          <div>
            <div className="flex items-center gap-2.5">
              {settings?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo} alt={name} className="h-[68px] w-auto object-contain" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-400 text-[11px] font-black text-stone-900">
                  KBC
                </span>
              )}
              <span className="text-sm font-bold text-white">{name}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              A competitive badminton club based in Knocklyon, South Dublin.
              Division 7 and above welcome.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-500">
              Navigation
            </h3>
            <ul className="space-y-2.5">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-stone-400 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-500">
              Contact
            </h3>
            <ul className="space-y-2.5 text-sm">
              {settings?.club_email && (
                <li>
                  <a
                    href={`mailto:${settings.club_email}`}
                    className="text-stone-400 transition-colors hover:text-green-300"
                  >
                    {settings.club_email}
                  </a>
                </li>
              )}
              {settings?.phone && (
                <li>
                  <a
                    href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                    className="text-stone-400 transition-colors hover:text-white"
                  >
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings?.address && (
                <li className="whitespace-pre-line text-stone-400">{settings.address}</li>
              )}
              {(settings?.facebook_url || settings?.instagram_url) && (
                <li className="flex gap-3 pt-1">
                  {settings.facebook_url && (
                    <a
                      href={settings.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="grid h-9 w-9 place-items-center rounded-full border border-stone-700 text-stone-400 transition hover:border-[#1877F2] hover:text-[#1877F2]"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                      </svg>
                    </a>
                  )}
                  {settings.instagram_url && (
                    <a
                      href={settings.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="grid h-9 w-9 place-items-center rounded-full border border-stone-700 text-stone-400 transition hover:border-[#E1306C] hover:text-[#E1306C]"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                      </svg>
                    </a>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Sponsors + Affiliations */}
        <div className="mt-8 border-t border-stone-700 pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

            {/* Sponsors */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-500">
                Sponsored by
              </p>
              <a
                href="https://www.fiortech.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fíortech"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/fiortech-logo.png"
                  alt="Fíortech"
                  className="h-9 w-auto object-contain opacity-80 transition hover:opacity-100"
                />
              </a>
            </div>

            {/* Affiliations */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-500">
                Affiliated with
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <a
                  href="https://www.badmintonireland.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Badminton Ireland"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/bi-logo.png"
                    alt="Badminton Ireland"
                    className="h-8 w-auto object-contain opacity-70 transition hover:opacity-100"
                  />
                </a>
                <a
                  href="https://leinsterbadminton.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Leinster Badminton"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/leinster-logo.png"
                    alt="Leinster Badminton"
                    className="h-8 w-auto object-contain opacity-70 transition hover:opacity-100"
                  />
                </a>
              </div>
            </div>

          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-1.5 text-sm text-stone-600 text-center">
          <span>
            Made with ❤️ by{" "}
            <a
              href="https://www.fiortech.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 transition-colors hover:text-white"
            >
              Fíortech
            </a>
          </span>
          <span>&copy; {new Date().getFullYear()} {name}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
