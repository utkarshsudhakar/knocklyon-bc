const SLOTS: string[] = [];
for (let h = 12; h <= 22; h++) {
  SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 22) SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

export default function TimeSlotSelect({
  name,
  defaultValue,
  className,
  blankLabel,
}: {
  name: string;
  defaultValue?: string | null;
  className?: string;
  blankLabel?: string;
}) {
  const current = defaultValue ? defaultValue.slice(0, 5) : "";
  const options =
    current && !SLOTS.includes(current)
      ? [...SLOTS, current].sort()
      : SLOTS;
  return (
    <select name={name} defaultValue={current} className={className}>
      {blankLabel !== undefined && <option value="">{blankLabel}</option>}
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
