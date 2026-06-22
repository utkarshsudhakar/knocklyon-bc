type Props = {
  title: string;
  subtitle?: string | null;
  eyebrow?: string;
};

export default function PageHero({ title, subtitle, eyebrow }: Props) {
  return (
    <section className="bg-[#065F46]">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
        {eyebrow && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-green-300">
            {eyebrow}
          </p>
        )}
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
