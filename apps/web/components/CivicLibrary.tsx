"use client";

import { useEffect, useState } from "react";

type Row = {
  reference: string;
  title: string;
  assessment_label: string;
  published_at: string;
};

export function CivicLibrary() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/v1/civic/public")
      .then((res) => res.json())
      .then((data: { cases?: Row[] }) => setRows(data.cases ?? []))
      .catch(() => setRows([]));
  }, []);

  if (rows == null) return <p role="status">Loading reviewed cases…</p>;
  if (!rows.length) return <p>No reviewed cases are public yet. There is no feed of unreviewed submissions.</p>;

  return (
    <ul>
      {rows.map((row) => (
        <li key={row.reference}>
          <a href={`/civic/p/${row.reference}`}>{row.reference}</a> · {row.assessment_label} · {row.title}
        </li>
      ))}
    </ul>
  );
}
