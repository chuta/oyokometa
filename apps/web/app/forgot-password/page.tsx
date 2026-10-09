"use client";

import { useState } from "react";
import { BusyLabel } from "@/components/ActionStatus";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/v1/auth/password/forgot", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error?.message ?? "Could not send reset email");
      return;
    }
    setMsg("If that address has an account, a reset link is on its way.");
  };

  return (
    <div className="page page-narrow">
      <p className="kicker">Account</p>
      <h1 className="text-4xl mb-3">Reset password</h1>
      <p className="text-muted mb-8">Enter the email on the account. The link expires in 30 minutes.</p>
      <form onSubmit={send} className="space-y-4">
        <label className="block">
          Email
          <input
            className="block w-full mt-1"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          <BusyLabel busy={busy} idle="Email a reset link" working="Sending link…" />
        </button>
      </form>
      <p className="mt-6 text-sm">
        <a href="/sign-in">Back to sign in</a>
      </p>
      {msg ? <p className="mt-4">{msg}</p> : null}
    </div>
  );
}
