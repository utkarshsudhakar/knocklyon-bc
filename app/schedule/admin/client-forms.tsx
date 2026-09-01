"use client";

import { useActionState } from "react";
import {
  login,
  addClub,
  addTeamSlot,
  addKnocklyonTeam,
  setTeamSlotTime,
  type LoginState,
  type FormState,
} from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );

  return (
    <form action={action} className="max-w-sm mx-auto mt-16 space-y-4">
      <h1 className="text-2xl font-semibold text-forest">Admin sign in</h1>
      <label className="block">
        <span className="text-sm text-zinc-700">Password</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-forest px-4 py-2 text-white hover:bg-forest-dark disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function AddKnocklyonTeamForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    addKnocklyonTeam,
    {}
  );

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:gap-2">
      <input
        name="name"
        placeholder="Short name (e.g. M1)"
        required
        className="rounded border border-zinc-300 px-3 py-2"
      />
      <input
        name="display_name"
        placeholder="Display name (e.g. Men's 1)"
        title="Long name as it should appear in TinaCMS export. Falls back to short name if empty."
        className="rounded border border-zinc-300 px-3 py-2"
      />
      <input
        name="division"
        placeholder="Division (e.g. Div 5)"
        className="rounded border border-zinc-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-forest px-4 py-2 text-white hover:bg-forest-dark disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add team"}
      </button>
      {state.error && (
        <p className="sm:col-span-4 text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}

export function AddClubForm({
  teamId,
}: {
  teamId: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    addClub,
    {}
  );

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:gap-2">
      <input type="hidden" name="knocklyon_team_id" value={teamId} />
      <input
        name="name"
        placeholder="Club name (e.g. ABC)"
        required
        className="rounded border border-zinc-300 px-3 py-2"
      />
      <input
        name="team_name"
        placeholder="Their team (e.g. M2)"
        className="rounded border border-zinc-300 px-3 py-2"
      />
      <input
        name="email"
        type="email"
        placeholder="Secretary email"
        required
        className="rounded border border-zinc-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-forest px-4 py-2 text-white hover:bg-forest-dark disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add club"}
      </button>
      {state.error && (
        <p className="sm:col-span-4 text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}

const HOME_TIME_OPTIONS = [
  ["12:00", "12:00 PM (noon)"],
  ["12:30", "12:30 PM"],
  ["13:00", "1:00 PM"],
  ["13:30", "1:30 PM"],
  ["14:00", "2:00 PM"],
  ["14:30", "2:30 PM"],
  ["15:00", "3:00 PM"],
  ["15:30", "3:30 PM"],
  ["16:00", "4:00 PM"],
  ["16:30", "4:30 PM"],
  ["17:00", "5:00 PM"],
  ["17:30", "5:30 PM"],
  ["18:00", "6:00 PM"],
  ["18:30", "6:30 PM"],
  ["19:00", "7:00 PM"],
  ["19:30", "7:30 PM"],
  ["20:00", "8:00 PM"],
  ["20:30", "8:30 PM"],
  ["21:00", "9:00 PM"],
  ["21:30", "9:30 PM"],
  ["22:00", "10:00 PM"],
] as const;

export function AddTeamSlotForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    addTeamSlot,
    {}
  );

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:gap-2">
      <input type="hidden" name="knocklyon_team_id" value={teamId} />
      <input
        type="date"
        name="slot_date"
        required
        className="rounded border border-zinc-300 px-3 py-2"
      />
      <input
        type="number"
        name="capacity"
        min={1}
        defaultValue={1}
        placeholder="Venue capacity"
        required
        className="rounded border border-zinc-300 px-3 py-2"
      />
      <select
        name="match_time"
        defaultValue="20:00"
        className="rounded border border-zinc-300 px-3 py-2 bg-white"
        title="Start time offered for matches on this date"
      >
        {HOME_TIME_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-forest px-4 py-2 text-white hover:bg-forest-dark disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add date"}
      </button>
      {state.error && (
        <p className="sm:col-span-4 text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}

export function TeamSlotTimeEditor({
  teamId,
  slotId,
  currentTime,
}: {
  teamId: string;
  slotId: string;
  currentTime: string;
}) {
  return (
    <form action={setTeamSlotTime} className="flex items-center gap-2">
      <input type="hidden" name="knocklyon_team_id" value={teamId} />
      <input type="hidden" name="home_slot_id" value={slotId} />
      <select
        name="match_time"
        defaultValue={currentTime}
        className="rounded border border-zinc-300 px-2 py-1 text-xs bg-white"
      >
        {HOME_TIME_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button type="submit" className="text-xs text-forest hover:underline">
        Save
      </button>
    </form>
  );
}
