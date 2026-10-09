"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [disputes, setDisputes] = useState<Array<Record<string, unknown>>>([]);

  const load = () => {
    fetch("/api/v1/admin/payments", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error.message);
        else setPayments(j.payments ?? []);
      });
    fetch("/api/v1/admin/disputes", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setDisputes(j.disputes ?? []));
  };
  useEffect(load, []);

  const reverse = async (id: string) => {
    const reason = prompt("Reason for reversal?");
    if (!reason) return;
    await fetch(`/api/v1/admin/payments/${id}/reverse`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    load();
  };

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/v1/admin/lookup?q=${encodeURIComponent(q)}`, { credentials: "include" });
    const j = await r.json();
    setUsers(j.users ?? []);
  };

  if (err) return <p role="alert">{err}</p>;

  return (
    <div className="page">
      <h1 className="text-3xl mb-4">Admin</h1>
      <form onSubmit={lookup} className="mb-8 flex gap-2">
        <input
          className="border border-line p-2 flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="User email or id"
        />
        <button className="btn" type="submit">
          Lookup
        </button>
      </form>
      {users.length ? (
        <ul className="mb-8">
          {users.map((u) => (
            <li key={String(u.id)}>
              {String(u.email)} · {String(u.role)} · {String(u.id)}
            </li>
          ))}
        </ul>
      ) : null}
      <h2 className="text-xl mb-2">Disputes</h2>
      <ul className="space-y-2 text-sm mb-8">
        {disputes.map((d) => (
          <li key={String(d.id)} className="border border-line p-3">
            {String(d.email)} · {String(d.status)} · {String(d.reason).slice(0, 80)}
            <button
              className="btn-secondary btn ml-3"
              type="button"
              onClick={async () => {
                const reason = prompt("Resolution reason?");
                if (!reason) return;
                const outcome = prompt("Outcome: removed | withdrawn | thumbnail_removed", "removed");
                if (!outcome) return;
                await fetch(`/api/v1/admin/disputes/${d.id}`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ outcome, reason }),
                });
                load();
              }}
            >
              Resolve
            </button>
          </li>
        ))}
      </ul>
      <h2 className="text-xl mb-2">Payments</h2>
      <ul className="space-y-2 text-sm">
        {payments.map((p) => (
          <li key={String(p.id)} className="border border-line p-3">
            <span className="mono">{String(p.referenceCode)}</span> · {String(p.status)} ·{" "}
            {String(p.amountMinor)} {String(p.currency)}
            {p.status === "paid" ? (
              <button className="btn-secondary btn ml-3" type="button" onClick={() => reverse(String(p.id))}>
                Reverse
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
