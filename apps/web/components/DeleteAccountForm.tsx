"use client";

import { useState } from "react";
import { BusyLabel } from "./ActionStatus";

const WORD = "DELETE";

export function DeleteAccountForm({ token, hasPassword }: { token?: string; hasPassword: boolean }) {
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  const sendLink = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/v1/account/delete/email-link", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error?.message ?? "Could not send the confirmation email");
        return;
      }
      setLinkSent(true);
      if (json.dev_link) setMsg(`Development link: ${json.dev_link}`);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/v1/account/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm, ...(token ? { token } : { password }) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error?.message ?? "Could not delete the account");
        return;
      }
      window.location.href = "/?account=deleted";
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md">
      <p className="text-sm">
        Deleting your account removes your images, analyses and reports, revokes share links, withdraws your
        provenance records (their public pages will say they were withdrawn), and forfeits unused credits.
        Payment and credit records are kept for accounting without your name or email. This cannot be undone.
      </p>
      {!token && !hasPassword ? (
        <div className="mt-4">
          <p className="text-sm">We&apos;ll email you a confirmation link first.</p>
          <button className="btn-secondary btn mt-3" type="button" onClick={sendLink} disabled={busy || linkSent}>
            <BusyLabel busy={busy} idle={linkSent ? "Check your email" : "Email me a confirmation link"} working="Sending…" />
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {!token ? (
            <label className="block">
              Current password
              <input
                className="block w-full mt-1"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
              />
            </label>
          ) : null}
          <label className="block">
            Type {WORD} to confirm
            <input
              className="block w-full mt-1"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </label>
          <button className="btn btn-danger" type="submit" disabled={busy || confirm !== WORD}>
            <BusyLabel busy={busy} idle="Delete my account" working="Deleting…" />
          </button>
        </form>
      )}
      {msg ? (
        <p className="mt-3" role="alert">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
