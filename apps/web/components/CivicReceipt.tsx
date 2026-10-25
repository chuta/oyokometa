"use client";

import { useEffect, useState } from "react";

type Receipt = {
  reference: string;
  claim_text: string;
  contributor_explanation: string | null;
  specific_check: string | null;
  observation_label: string | null;
  restricted_handling: boolean;
  status_label: string;
  publication_label: string;
  created_at: string;
  what_happens_next: string;
  evidence: Array<{ kind: string; file_name: string | null }>;
  sources: Array<{ kind: string; url: string | null; notes: string | null }>;
};

export function CivicReceipt({ reference }: { reference: string }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteUrl, setNoteUrl] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteDone, setNoteDone] = useState(false);
  const [pending, setPending] = useState(false);

  const load = async () => {
    const token = sessionStorage.getItem(`okm-civic:${reference}`);
    const headers = new Headers();
    if (token) headers.set("x-civic-receipt", token);
    const res = await fetch(`/api/v1/civic/cases/${encodeURIComponent(reference)}`, { credentials: "include", headers });
    const data = (await res.json()) as Receipt & { error?: { message?: string } };
    if (!res.ok) {
      setError("This receipt was not found in this browser. Submit again, or sign in with the account you used.");
      return;
    }
    setReceipt(data);
  };

  useEffect(() => {
    let gone = false;
    void load().catch(() => {
      if (!gone) setError("The receipt could not be loaded. Try again.");
    });
    return () => {
      gone = true;
    };
    // The reference comes from the route. Reload only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  const sendNote = async (kind: "update" | "error") => {
    if (note.trim().length < 10) {
      setNoteError("Write at least a sentence.");
      return;
    }
    setPending(true);
    setNoteError(null);
    try {
      const token = sessionStorage.getItem(`okm-civic:${reference}`);
      const headers = new Headers({ "Content-Type": "application/json" });
      if (token) headers.set("x-civic-receipt", token);
      const res = await fetch(`/api/v1/civic/cases/${encodeURIComponent(reference)}/notes`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ text: note, source_url: noteUrl, kind }),
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setNoteError(data.error?.message ?? "The note could not be saved.");
        return;
      }
      setNote("");
      setNoteUrl("");
      setNoteDone(true);
      await load();
    } catch {
      setNoteError("The note could not be saved.");
    } finally {
      setPending(false);
    }
  };

  if (error) return <p role="alert">{error}</p>;
  if (!receipt) return <p>Loading…</p>;
  const received = new Date(receipt.created_at).toLocaleString(undefined, { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <p>
        Reference <span className="mono">{receipt.reference}</span>
      </p>
      <p>Received {received} UTC.</p>
      <p>
        Status: {receipt.status_label}. Visibility: {receipt.publication_label}.
      </p>
      {receipt.publication_label === "Published" ? (
        <p>
          <a href={`/civic/p/${receipt.reference}`}>Open the public case page</a>
        </p>
      ) : null}
      <h2>Claim being checked</h2>
      <p>{receipt.claim_text}</p>
      {receipt.specific_check ? (
        <>
          <h2>What to check</h2>
          <p>{receipt.specific_check}</p>
        </>
      ) : null}
      {receipt.observation_label ? (
        <>
          <h2>How you know</h2>
          <p>{receipt.observation_label}</p>
        </>
      ) : null}
      {receipt.restricted_handling ? (
        <p>Restricted access was requested. That request follows the privacy notice. It is not a promise of absolute anonymity.</p>
      ) : null}
      <h2>Your explanation</h2>
      <p>{receipt.contributor_explanation || "None given."}</p>
      {receipt.evidence.length ? (
        <>
          <h2>Image</h2>
          <ul>
            {receipt.evidence.map((item) => (
              <li key={item.file_name ?? item.kind}>{item.file_name ?? "Still image"}</li>
            ))}
          </ul>
        </>
      ) : null}
      {receipt.sources.length ? (
        <>
          <h2>What you sent with it</h2>
          <ul>
            {receipt.sources.map((item, index) => (
              <li key={`${item.kind}-${index}`}>
                {item.notes ? <span>{item.notes} </span> : null}
                {item.url ? <a href={item.url}>{item.url}</a> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h2>What happens next</h2>
      <p>{receipt.what_happens_next}</p>
      <h2>Add information or report an error</h2>
      <form
        className="intake"
        onSubmit={(event) => {
          event.preventDefault();
          void sendNote("update");
        }}
      >
        <label>
          Note
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={2000} />
        </label>
        <label>
          Another link, optional
          <input value={noteUrl} onChange={(e) => setNoteUrl(e.target.value)} inputMode="url" maxLength={2000} />
        </label>
        {noteError ? <p role="alert">{noteError}</p> : null}
        {noteDone ? <p>Saved.</p> : null}
        <p className="intake-actions">
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Saving" : "Add information"}
          </button>
          <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => void sendNote("error")}>
            Report an error
          </button>
        </p>
      </form>
    </div>
  );
}
