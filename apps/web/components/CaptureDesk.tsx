"use client";

import { useEffect, useRef, useState } from "react";

type RequestRow = {
  id: string;
  reference: string;
  prompt: string;
  address: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  record_public_id: string | null;
  case_linked?: boolean;
  case_reference?: string | null;
};

type Created = RequestRow & { link: string | null; cost?: number; balance?: number; duplicate?: boolean };

export function CaptureDesk() {
  const idempotencyKey = useRef(crypto.randomUUID());
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("72");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const me = await fetch("/api/v1/me", { credentials: "include" }).then((r) => r.json());
    setSignedIn(Boolean(me.user));
    if (!me.user) return;
    const [actions, credits, list] = await Promise.all([
      fetch("/api/v1/credits/actions", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/credits", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/captures", { credentials: "include" }).then((r) => r.json()),
    ]);
    setCost(typeof actions.actions?.capture_request === "number" ? actions.actions.capture_request : null);
    setBalance(typeof credits.balance === "number" ? credits.balance : null);
    setRows(list.requests ?? []);
  };

  useEffect(() => {
    void load().catch(() => setError("The capture desk could not be loaded."));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (prompt.trim().length < 3) {
      setError("Describe the photo you need, in a short sentence.");
      return;
    }
    if (cost == null) {
      setError("The price could not be loaded. Refresh the page.");
      return;
    }
    setPending(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/v1/captures", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          address,
          expires_in_hours: Number(hours),
          expected_credits: cost,
          idempotency_key: idempotencyKey.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "The link could not be created.");
        if (data.cost != null) setCost(data.cost);
        return;
      }
      setCreated(data);
      if (typeof data.balance === "number") setBalance(data.balance);
      idempotencyKey.current = crypto.randomUUID();
      setPrompt("");
      setAddress("");
      const list = await fetch("/api/v1/captures", { credentials: "include" }).then((r) => r.json());
      setRows(list.requests ?? []);
    } catch {
      setError("The link could not be created. Try again.");
    } finally {
      setPending(false);
    }
  };

  const cancel = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/v1/captures/${id}/cancel`, { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error?.message ?? "This link could not be cancelled.");
      return;
    }
    const [credits, list] = await Promise.all([
      fetch("/api/v1/credits", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/captures", { credentials: "include" }).then((r) => r.json()),
    ]);
    if (typeof credits.balance === "number") setBalance(credits.balance);
    setRows(list.requests ?? []);
  };

  const copy = async () => {
    if (!created?.link) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (signedIn === null) return <p>Loading…</p>;
  if (!signedIn) {
    return (
      <p>
        <a href="/sign-in">Sign in</a> to create a capture link.
      </p>
    );
  }

  const after = balance != null && cost != null ? balance - cost : null;

  return (
    <div>
      <form className="intake" onSubmit={(event) => void submit(event)}>
        <label>
          What should they photograph?
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} required rows={4} maxLength={500} />
        </label>
        <label>
          Address, if the photo belongs to a place
          <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
        </label>
        <label>
          Link expires in hours
          <input
            type="number"
            min={1}
            max={168}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
        </label>
        <p>
          {cost == null
            ? "Loading the price."
            : `This link costs ${cost} credits.${balance != null ? ` Balance ${balance}.` : ""}${after != null ? ` Balance after ${after}.` : ""}`}
        </p>
        {error ? <p role="alert">{error}</p> : <p>The recipient takes the photo in the browser. A gallery upload is not offered.</p>}
        <p className="intake-actions">
          <button className="btn" type="submit" disabled={pending || cost == null || (balance != null && cost != null && balance < cost)}>
            {pending ? "Creating" : "Create link"}
          </button>
        </p>
      </form>
      {created?.link ? (
        <section className="mt-6">
          <h2>Copy this link now</h2>
          <p>It is shown once. Send it to the person who should take the photo.</p>
          <p>
            <input readOnly value={created.link} aria-label="Capture link" />
          </p>
          <p className="intake-actions">
            <button className="btn" type="button" onClick={() => void copy()}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </p>
          <p className="mono">{created.reference}</p>
        </section>
      ) : null}
      {rows.length ? (
        <div className="capture-list">
          {rows.map((row) => (
            <article key={row.id}>
              <p className="mono">{row.reference}</p>
              <p>{row.prompt}</p>
              <p>
                {row.status} · expires {new Date(row.expires_at).toLocaleString()}
              </p>
              {row.case_linked ? (
                <p>
                  Civic case link. No credits were held.
                  {row.case_reference ? (
                    <>
                      {" "}
                      <a href={`/civic/desk/${row.case_reference}`}>{row.case_reference}</a>
                    </>
                  ) : null}
                </p>
              ) : null}
              {row.record_public_id ? (
                <p>
                  <a href={`/verify/${row.record_public_id}`}>Open the signed record</a>
                </p>
              ) : null}
              {row.status === "open" || row.status === "capturing" ? (
                <p className="intake-actions">
                  <button className="btn" type="button" onClick={() => void cancel(row.id)}>
                    Cancel link
                  </button>
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
