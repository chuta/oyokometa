"use client";

import { useEffect, useState } from "react";

type ReportRow = {
  id: string;
  job_id: string;
  format: string;
  report_hash: string;
  created_at: string;
};

export default function AccountReportsPage() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/reports", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error.message);
        else setRows(j.reports ?? []);
      });
  }, []);

  if (err) {
    return (
      <div className="page">
        <h1 className="text-3xl mb-4">Reports</h1>
        <p>
          {err} <a href="/sign-in">Sign in</a> to open reports.
        </p>
      </div>
    );
  }
  if (!rows) return <p className="page">Loading reports…</p>;

  return (
    <div className="page">
      <p className="kicker">Account</p>
      <h1 className="text-3xl mb-4">Reports</h1>
      <p className="text-muted mb-6">
        These files are issued to your signed-in account. Email never attaches the PDF.
      </p>
      {rows.length === 0 ? (
        <p>No reports yet. Generate one from a completed Deep Analysis.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="border border-line p-4">
              <p className="uppercase text-sm text-muted">{r.format}</p>
              <p className="mono text-sm break-all mt-1">{r.report_hash}</p>
              <p className="action-row">
                <a className="btn" href={`/api/v1/reports/${r.id}`}>
                  Download
                </a>
                <a className="btn-secondary btn" href={`/a/${r.job_id}`}>
                  Open analysis
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
