"use client";

import { useEffect, useState } from "react";

export default function AccountPage() {
  const [me, setMe] = useState<{ user: { email: string } | null } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [records, setRecords] = useState<Array<{ public_id: string; status: string; created_at: string }>>([]);

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

  if (!me) return <p>Loading…</p>;
  if (!me.user) {
    return (
      <div>
        <h1 className="text-3xl mb-4">Account</h1>
        <p>
          <a href="/sign-in">Sign in</a> to keep analyses, buy credits, and generate reports.
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

  return (
    <div>
      <h1 className="text-3xl mb-4">Account</h1>
      <p>{me.user.email}</p>
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
      <p className="mt-6 flex gap-3">
        <a className="btn" href="/create">
          Create a record
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
    </div>
  );
}
