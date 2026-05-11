"use client";

import { useState } from "react";

type Contact = "matt" | "chuck";

type ActionState = {
  loading: boolean;
  message: string | null;
};

const testContacts: { id: Contact; name: string; phone: string; label: string }[] = [
  { id: "matt", name: "Matt", phone: "+1 604 313 8398", label: "Call Matt" },
  { id: "chuck", name: "Chuck", phone: "+1 306 880 2055", label: "Call Chuck" },
];

export function DashboardActions({ contact }: { contact?: Contact }) {
  const visibleContacts = contact ? testContacts.filter((item) => item.id === contact) : testContacts;
  const [callState, setCallState] = useState<Record<Contact, ActionState>>({
    matt: { loading: false, message: null },
    chuck: { loading: false, message: null },
  });
  const [syncState, setSyncState] = useState<ActionState>({ loading: false, message: null });

  async function startCall(contact: Contact) {
    setCallState((current) => ({
      ...current,
      [contact]: { loading: true, message: null },
    }));

    try {
      const response = await fetch("/api/calls/example-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; reused?: boolean; error?: string; callAttempt?: { providerConversationId?: string | null } } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Call failed to start.");
      }

      setCallState((current) => ({
        ...current,
        [contact]: {
          loading: false,
          message: `${payload.reused ? "Already in progress" : "Started"}. Conversation ${payload.callAttempt?.providerConversationId ?? "pending"}.`,
        },
      }));
    } catch (error) {
      setCallState((current) => ({
        ...current,
        [contact]: {
          loading: false,
          message: error instanceof Error ? error.message : "Call failed to start.",
        },
      }));
    }
  }

  async function syncTranscripts() {
    setSyncState({ loading: true, message: null });

    try {
      const response = await fetch("/api/calls/sync-transcripts", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; synced?: number; error?: string } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Transcript sync failed.");
      }

      setSyncState({
        loading: false,
        message: `Checked ${payload.synced ?? 0} conversation${payload.synced === 1 ? "" : "s"}. Refresh the page to see newly stored transcripts.`,
      });
    } catch (error) {
      setSyncState({
        loading: false,
        message: error instanceof Error ? error.message : "Transcript sync failed.",
      });
    }
  }

  return (
    <div className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sage">Example test calls</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Start calls and store conversations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {contact ? "This page starts and tracks this member's example calls. Refresh transcripts after a call finishes processing." : "Each number has its own call button. Calls are saved to the dashboard by conversation id; refresh transcripts after a call finishes processing."}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <button
            type="button"
            disabled={syncState.loading}
            onClick={syncTranscripts}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/10 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncState.loading ? "Refreshing..." : "Refresh transcripts"}
          </button>
          {syncState.message ? <p className="max-w-xs text-sm leading-5 text-slate-500">{syncState.message}</p> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visibleContacts.map((contact) => (
          <article key={contact.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sage">{contact.name}</p>
              <p className="mt-2 text-lg font-bold text-ink">{contact.phone}</p>
            </div>
            <button
              type="button"
              disabled={callState[contact.id].loading}
              onClick={() => startCall(contact.id)}
              className="mt-4 w-full rounded-full bg-brandButtonBlue px-5 py-3 text-center font-semibold text-cream shadow-sm hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {callState[contact.id].loading ? `Calling ${contact.name}...` : contact.label}
            </button>
            {callState[contact.id].message ? (
              <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-600">{callState[contact.id].message}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
