"use client";

import { useEffect, useState } from "react";

type Row = { reference: string; title: string; status_label: string };

export function CivicMine() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let gone = false;
    fetch("/api/v1/civic/cases", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { cases?: Row[] }) => {
        if (!gone) setRows(data.cases ?? []);
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, []);

  if (!rows.length) return null;
  return (
    <section className="about-section" aria-labelledby="your-cases">
      <h2 id="your-cases">Your submissions</h2>
      <ul>
        {rows.map((row) => (
          <li key={row.reference}>
            <a href={`/civic/c/${row.reference}`}>{row.reference}</a> · {row.status_label}
          </li>
        ))}
      </ul>
    </section>
  );
}
