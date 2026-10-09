"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BusyLabel } from "@/components/ActionStatus";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(token ? null : "Missing reset token");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/v1/auth/password/reset", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error?.message ?? "Could not reset password");
      return;
    }
    router.replace("/account");
  };

  return (
    <div className="page page-narrow">
      <p className="kicker">Account</p>
      <h1 className="text-4xl mb-3">Choose a new password</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          New password
          <input
            className="block w-full mt-1"
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="block">
          Confirm password
          <input
            className="block w-full mt-1"
            type="password"
            required
            minLength={10}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button className="btn" type="submit" disabled={busy || !token}>
          <BusyLabel busy={busy} idle="Save password" working="Saving…" />
        </button>
      </form>
      {msg ? (
        <p className="mt-4" role="alert">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<p className="page">Loading…</p>}>
      <ResetForm />
    </Suspense>
  );
}
