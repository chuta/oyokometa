"use client";

import { useEffect, useState } from "react";
import { SOLUTION_STATUSES } from "@oyokometa/config";

function PaymentLine({ p }: { p: Record<string, unknown> }) {
  return (
    <>
      <span className="mono">{String(p.referenceCode)}</span> · {String(p.provider ?? "bank_transfer")} ·{" "}
      {String(p.status)} ·{" "}
      {(Number(p.amountMinor) / 100).toLocaleString()} {String(p.currency)} · {String(p.packName ?? "")}{" "}
      ({String(p.packCredits ?? "")} credits) · {String(p.userEmail ?? "")}
    </>
  );
}

export default function AdminPage() {
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [disputes, setDisputes] = useState<Array<Record<string, unknown>>>([]);
  const [solutions, setSolutions] = useState<Array<Record<string, unknown>>>([]);
  const [solutionCounts, setSolutionCounts] = useState<{ by_status?: Record<string, number>; by_service?: Record<string, number> }>({});

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
    fetch("/api/v1/admin/solutions", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        setSolutions(j.requests ?? []);
        setSolutionCounts(j.counts ?? {});
      });
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

  const settle = async (p: Record<string, unknown>, action: "confirm" | "reject") => {
    const expected = Number(p.amountMinor) / 100;
    let amountReceivedMinor: number | undefined;
    if (action === "confirm") {
      const typed = prompt(
        `Amount received for ${String(p.referenceCode)} (${String(p.currency)}). Expected ${expected}.`,
      );
      if (!typed) return;
      amountReceivedMinor = Math.round(Number(typed.replace(/,/g, "")) * 100);
    }
    const reason = prompt(action === "confirm" ? "Where did you see the deposit?" : "Why is it rejected?");
    if (!reason) return;
    const res = await fetch(`/api/v1/admin/payments/${String(p.id)}/${action}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, amount_received_minor: amountReceivedMinor }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error?.message ?? "Could not update payment");
    }
    load();
  };

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/v1/admin/lookup?q=${encodeURIComponent(q)}`, { credentials: "include" });
    const j = await r.json();
    setUsers(j.users ?? []);
  };

  if (err) {
    return (
      <p className="page" role="alert">
        {err}
      </p>
    );
  }

  return (
    <div className="page">
      <h1 className="text-3xl mb-4">Admin</h1>
      <h2 className="text-xl mb-2">Solution requests</h2>
      <p className="text-muted text-sm mb-3">
        Status counts: {Object.entries(solutionCounts.by_status ?? {}).map(([status, n]) => `${status} ${n}`).join(" · ") || "none yet"}
        . By service: {Object.entries(solutionCounts.by_service ?? {}).map(([service, n]) => `${service} ${n}`).join(" · ") || "none yet"}.
      </p>
      <ul className="space-y-2 text-sm mb-8">
        {solutions.map((row) => (
          <li key={String(row.id)} className="border border-line p-3">
            <p>
              <span className="mono">{String(row.reference)}</span> · {String(row.organization_name)} · {String(row.contact_name)} ·{" "}
              {String(row.email)}
            </p>
            <p>{Array.isArray(row.services) ? row.services.join(", ") : ""}</p>
            <p>{String(row.problem).slice(0, 280)}</p>
            <p className="text-muted">
              Contact about this request: {row.contact_consent ? "yes" : "no"}. Marketing: {row.marketing_consent ? "yes" : "no"}.
            </p>
            <form
              className="intake-grid"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                const res = await fetch(`/api/v1/admin/solutions/${String(row.id)}`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: String(data.get("status") ?? ""),
                    note: String(data.get("note") ?? ""),
                    internal_notes: String(data.get("internal_notes") ?? ""),
                  }),
                });
                if (!res.ok) {
                  const body = await res.json().catch(() => null);
                  alert(body?.error?.message ?? "Could not update the request");
                }
                load();
              }}
            >
              <label>
                Status
                <select name="status" defaultValue={String(row.status)}>
                  {SOLUTION_STATUSES.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Follow-up note
                <input name="note" defaultValue="" />
              </label>
              <label>
                Internal notes
                <textarea name="internal_notes" defaultValue={String(row.internal_notes ?? "")} rows={3} />
              </label>
              <button className="btn" type="submit">
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form onSubmit={lookup} className="lookup-row">
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
            <p>
              {String(d.email)} · {String(d.status)} · {String(d.reason).slice(0, 80)}
            </p>
            <button
              className="btn-secondary btn"
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
      <h2 className="text-xl mb-2">Transfers to match</h2>
      <p className="text-muted text-sm mb-3">
        Check the bank statement for the reference and exact amount. Credits are granted only when you
        confirm.
      </p>
      <ul className="space-y-2 text-sm mb-8">
        {payments
          .filter(
            (p) =>
              (p.status === "awaiting_match" || p.status === "awaiting_transfer") && p.provider !== "bachs",
          )
          .map((p) => (
            <li key={String(p.id)} className="border border-line p-3">
              <p>
                <PaymentLine p={p} />
              </p>
              <p className="action-row">
                <button className="btn" type="button" onClick={() => settle(p, "confirm")}>
                  Confirm deposit
                </button>
                <button className="btn-secondary btn" type="button" onClick={() => settle(p, "reject")}>
                  Reject
                </button>
              </p>
            </li>
          ))}
      </ul>
      <h2 className="text-xl mb-2">All payments</h2>
      <ul className="space-y-2 text-sm">
        {payments.map((p) => (
          <li key={String(p.id)} className="border border-line p-3">
            <p>
              <PaymentLine p={p} />
            </p>
            {p.status === "paid" ? (
              <p className="action-row">
                <button className="btn-secondary btn" type="button" onClick={() => reverse(String(p.id))}>
                  Reverse
                </button>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
