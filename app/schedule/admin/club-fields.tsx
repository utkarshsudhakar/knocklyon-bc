"use client";

import { useRef, useState, useTransition } from "react";
import { deleteContact } from "./actions";

export type ClubSuggestion = { id: string; name: string; email: string };

export default function ClubNameEmailFields({
  suggestions,
  nameWrapClass,
  emailWrapClass,
  inputClass,
}: {
  suggestions: ClubSuggestion[];
  nameWrapClass?: string;
  emailWrapClass?: string;
  inputClass: string;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [removed, setRemoved] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  function remove(s: ClubSuggestion) {
    if (!window.confirm(`Remove ${s.name} (${s.email}) from suggestions?`)) return;
    setRemoved((r) => [...r, s.id]);
    startTransition(() => deleteContact(s.id));
  }

  const q = query.trim().toLowerCase();
  const matches = q
    ? suggestions
        .filter((s) => !removed.includes(s.id) && s.name.toLowerCase().includes(q))
        .sort((a, b) => {
          const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
          const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
          return ap - bp || a.name.localeCompare(b.name);
        })
        .slice(0, 8)
    : [];
  const showList = open && matches.length > 0;

  function pick(s: ClubSuggestion) {
    if (nameRef.current) nameRef.current.value = s.name;
    if (emailRef.current) emailRef.current.value = s.email;
    setQuery(s.name);
    setOpen(false);
  }

  return (
    <>
      <div className={`relative ${nameWrapClass ?? ""}`}>
        <input
          ref={nameRef}
          name="name"
          placeholder="Club name (e.g. ABC)"
          required
          autoComplete="off"
          className={`w-full ${inputClass}`}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % matches.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + matches.length) % matches.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(matches[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {showList && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded border border-zinc-300 bg-white shadow-lg">
            {matches.map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center ${i === active ? "bg-forest/10" : "hover:bg-zinc-50"}`}
              >
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  className="block min-w-0 flex-1 px-3 py-2 text-left"
                >
                  <span className="block text-sm font-medium text-zinc-900">
                    {s.name}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {s.email}
                  </span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    remove(s);
                  }}
                  className="mr-2 shrink-0 rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={emailWrapClass}>
        <input
          ref={emailRef}
          name="email"
          type="email"
          placeholder="Secretary email"
          required
          className={`w-full ${inputClass}`}
        />
      </div>
    </>
  );
}
