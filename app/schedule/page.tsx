export const metadata = {
  title: "Scheduling portal — Knocklyon Badminton Club",
};

export default function SchedulePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold text-forest mb-4">
        Fixture scheduling portal
      </h1>
      <p className="text-zinc-700">
        Access to this portal is by invitation only. If you&rsquo;re a club
        secretary scheduling a fixture against Knocklyon, please use the link
        we&rsquo;ve emailed you.
      </p>
      <p className="text-zinc-500 text-sm mt-8">
        Knocklyon admins:{" "}
        <a href="/schedule/admin" className="text-forest hover:underline">
          admin sign in →
        </a>
      </p>
    </main>
  );
}
