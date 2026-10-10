"use client";

import { useEffect, useState } from "react";
import { BusyLabel, Spinner } from "@/components/ActionStatus";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";

type MeUser = {
  email: string;
  username: string | null;
  emailVerified?: boolean;
  hasPassword?: boolean;
};

export default function AccountPage() {
  const [me, setMe] = useState<{ user: MeUser | null } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [records, setRecords] = useState<Array<{ public_id: string; status: string; created_at: string }>>([]);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        setMe(j);
        if (j.user) {
          return Promise.all([
            fetch("/api/v1/credits", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/v1/provenance", { credentials: "include" }).then((r) => r.json()),
          ]);
        }
        return null;
      })
      .then((pair) => {
        if (!pair) return;
        const [c, rec] = pair;
        if (c && typeof c.balance === "number") setBalance(c.balance);
        if (rec?.records) setRecords(rec.records);
      });
  }, []);

  if (!me) {
    return (
      <p className="page">
        <Spinner label="Loading account…" />
      </p>
    );
  }
  if (!me.user) {
    return (
      <div className="page">
        <h1 className="text-3xl mb-4">Account</h1>
        <p>
          <a href="/sign-in">Sign in</a> or <a href="/sign-up">create an account</a> to keep analyses, buy credits, and
          generate reports.
        </p>
      </div>
    );
  }

  const logout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };
  const everywhere = async () => {
    await fetch("/api/v1/auth/sign-out-everywhere", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwBusy(true);
    try {
      const res = await fetch("/api/v1/auth/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPwMsg(json.error?.message ?? "Could not update password");
        return;
      }
      setCurrent("");
      setNext("");
      setPwMsg("Password saved.");
      setMe((prev) => (prev?.user ? { ...prev, user: { ...prev.user, hasPassword: true } } : prev));
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="page">
      <h1 className="text-3xl mb-4">Account</h1>
      <p>{me.user.username ? `@${me.user.username}` : null}</p>
      <p>{me.user.email}</p>
      {me.user.emailVerified === false ? (
        <p className="mt-2 text-muted">Confirm your email before buying credits or registering a file.</p>
      ) : null}
      <p className="mt-2">Credit balance: {balance ?? "…"}</p>
      {records.length ? (
        <ul className="mt-6 text-sm">
          {records.map((r) => (
            <li key={r.public_id}>
              <a href={`/verify/${r.public_id}`}>{r.public_id}</a> · {r.status} ·{" "}
              {String(r.created_at).slice(0, 10)}
            </li>
          ))}
        </ul>
      ) : null}

      {me.user.hasPassword !== false ? (
        <details className="mt-10 max-w-md">
          <summary className="cursor-pointer">Change password</summary>
          <form onSubmit={savePassword} className="mt-4 space-y-3">
            <label className="block">
              Current password
              <input
                className="block w-full mt-1"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                disabled={pwBusy}
              />
            </label>
            <label className="block">
              New password
              <input
                className="block w-full mt-1"
                type="password"
                required
                minLength={10}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                disabled={pwBusy}
              />
            </label>
            <button className="btn" type="submit" disabled={pwBusy}>
              <BusyLabel busy={pwBusy} idle="Save password" working="Saving…" />
            </button>
            {pwMsg ? <p>{pwMsg}</p> : null}
          </form>
        </details>
      ) : (
        <form onSubmit={savePassword} className="mt-10 max-w-md space-y-3">
          <h2 className="text-xl">Set a password</h2>
          <p className="text-sm text-muted">
            You signed in with a link. Add a password if you want to use username or email next time.
          </p>
          <label className="block">
            Password
            <input
              className="block w-full mt-1"
              type="password"
              required
              minLength={10}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              disabled={pwBusy}
            />
          </label>
          <button className="btn" type="submit" disabled={pwBusy}>
            <BusyLabel busy={pwBusy} idle="Save password" working="Saving…" />
          </button>
          {pwMsg ? <p>{pwMsg}</p> : null}
        </form>
      )}

      <p className="mt-6 flex gap-3 flex-wrap">
        <a className="btn" href="/create">
          Create a record
        </a>
        <a className="btn-secondary btn" href="/account/reports">
          Reports
        </a>
        <a className="btn-secondary btn" href="/credits">
          Buy credits
        </a>
        <button className="btn-secondary btn" type="button" onClick={logout}>
          Sign out
        </button>
        <button className="btn-secondary btn" type="button" onClick={everywhere}>
          Sign out everywhere
        </button>
      </p>

      <details className="mt-12">
        <summary className="cursor-pointer">Delete account</summary>
        <div className="mt-4">
          <DeleteAccountForm hasPassword={me.user.hasPassword !== false} />
        </div>
      </details>
    </div>
  );
}
