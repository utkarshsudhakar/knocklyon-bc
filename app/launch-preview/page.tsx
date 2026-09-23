// Prototype comparing launch-day reveal animations.
// Not linked from anywhere on the live site.

import AnimationSwitcher from "./switcher";

export const metadata = {
  title: "Launch preview — KBC",
  robots: { index: false, follow: false },
};

export default function LaunchPreviewPage() {
  return (
    <>
      <AnimationSwitcher />

      {/* Mock hero the animations reveal, matching the live home layout */}
      <section className="relative h-[75vh] min-h-[500px] max-h-[800px] overflow-hidden bg-forest">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-green-300">
            Welcome to
          </p>
          <h1 className="mt-3 max-w-4xl text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg sm:text-6xl md:text-7xl">
            Knocklyon Badminton Club
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Community badminton in South Dublin. New season, new team, same passion.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#"
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-forest shadow-lg transition hover:bg-white/90"
            >
              Know More →
            </a>
            <a
              href="#"
              className="rounded-full border border-white/50 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Join the Club
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-10 text-zinc-700">
        <div className="rounded-lg border border-forest/30 bg-forest/5 p-5 space-y-3">
          <p className="text-sm font-semibold text-forest uppercase tracking-wide">
            Preview only
          </p>
          <p className="text-sm">
            Each animation runs about 5 seconds. On the real site,{" "}
            <code>localStorage</code> will make sure a chosen animation only
            fires on a visitor&rsquo;s first ever visit &mdash; returning
            visitors go straight through. All four respect{" "}
            <code>prefers-reduced-motion</code>, so anyone with motion turned
            off in their OS gets a quick fade rather than the full sequence.
          </p>
          <p className="text-sm">
            When you pick your favourite, tell me and I&rsquo;ll wire it into
            the home page and delete the other three files.
          </p>
        </div>
      </div>
    </>
  );
}
