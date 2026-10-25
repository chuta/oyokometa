"use client";

import { useRef, useState } from "react";

export type PublicCase = {
  reference: string;
  version_number: number;
  current: boolean;
  published_at: string;
  first_published_at: string | null;
  assessment_label: string;
  assessment_line: string;
  rationale: string;
  change_reason: string;
  claim_text: string;
  conclusion: string;
  evidence_summary: string;
  limitations: string;
  methodology: string;
  location_text: string | null;
  conflict_note: string | null;
  sources: Array<{ title: string; url: string | null; context: string | null }>;
  technical: Array<{ tier: string; statement: string }>;
  technical_note: string | null;
  versions: Array<{
    version_number: number;
    published_at: string;
    change_reason: string;
    assessment_label: string;
  }>;
};

function when(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" });
}

export function CivicCase({ page }: { page: PublicCase }) {
  const idempotencyKey = useRef(crypto.randomUUID());
  const [reason, setReason] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [hp, setHp] = useState("");

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/civic/public/${encodeURIComponent(page.reference)}/appeals`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          supporting_url: url,
          idempotency_key: idempotencyKey.current,
          website_confirm: hp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message ?? "The appeal could not be sent.");
        return;
      }
      idempotencyKey.current = crypto.randomUUID();
      setReason("");
      setUrl("");
      setDone(true);
    } catch {
      setError("The appeal could not be sent. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <p className="mono">{page.reference}</p>
      <p>
        Published {when(page.first_published_at ?? page.published_at)} UTC
        {page.version_number > 1 ? ` · this version ${when(page.published_at)} UTC` : ""}.
      </p>
      {!page.current ? <p>This is an earlier version. The current page is the one an editor last approved.</p> : null}
      <h2>Claim</h2>
      <p>{page.claim_text}</p>
      <h2>{page.assessment_label}</h2>
      <p>{page.assessment_line}</p>
      <p>{page.conclusion}</p>
      <h2>Why</h2>
      <p>{page.rationale}</p>
      <h2>Evidence examined</h2>
      <p>{page.evidence_summary}</p>
      {page.technical.length ? (
        <>
          <h2>What the records show</h2>
          {page.technical_note ? <p>{page.technical_note}</p> : null}
          <ul>
            {page.technical.map((item) => (
              <li key={`${item.tier}-${item.statement}`}>
                {item.tier}: {item.statement}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {page.sources.length ? (
        <>
          <h2>Sources</h2>
          <ul>
            {page.sources.map((item) => (
              <li key={`${item.title}-${item.url ?? ""}`}>
                {item.url ? (
                  <a href={item.url} rel="noopener noreferrer">
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
                {item.context ? ` · ${item.context}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {page.location_text ? <p>Broad location named in the finding: {page.location_text}.</p> : null}
      <h2>What this does not show</h2>
      <p>{page.limitations}</p>
      <h2>How it was reviewed</h2>
      <p>{page.methodology}</p>
      {page.conflict_note ? (
        <>
          <h2>Limits on this case</h2>
          <p>{page.conflict_note}</p>
        </>
      ) : null}
      {page.versions.length > 1 ? (
        <>
          <h2>Versions</h2>
          <ul>
            {page.versions.map((item) => (
              <li key={item.version_number}>
                <a href={item.version_number === page.version_number && page.current ? `/civic/p/${page.reference}` : `/civic/p/${page.reference}/v/${item.version_number}`}>
                  Version {item.version_number}
                </a>{" "}
                · {item.assessment_label} · {when(item.published_at)} UTC · {item.change_reason}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Change recorded: {page.change_reason}.</p>
      )}
      {page.current ? (
        <form className="intake" onSubmit={(event) => void send(event)}>
          <h2>Appeal or report an error</h2>
          <p>The earlier page stays available when a correction is published. An appeal is read by an editor.</p>
          <label>
            What should be checked
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} required rows={4} maxLength={4000} minLength={20} />
          </label>
          <label>
            Supporting link, if you have one
            <input value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} />
          </label>
          <label className="sr-only">
            Leave blank
            <input value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          {done ? <p role="status">The appeal was received. It is not published.</p> : null}
          <p className="intake-actions">
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Sending" : "Send appeal"}
            </button>
          </p>
        </form>
      ) : null}
    </div>
  );
}
