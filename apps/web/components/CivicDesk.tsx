"use client";

import { useEffect, useRef, useState } from "react";

type CaseRow = {
  reference: string;
  case_type: string;
  title: string;
  workflow_status: string;
  status_label: string;
};

type CaptureRow = {
  id: string;
  reference: string;
  prompt: string;
  address: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  record_public_id: string | null;
};

type AppealRow = {
  id: string;
  status: string;
  reason: string;
  supporting_url: string | null;
  created_at: string;
  resolution: string | null;
};

type DeskCase = {
  reference: string;
  title: string;
  claim_text: string;
  status_label: string;
  publication_state?: string;
  can_publish?: boolean;
  can_correct?: boolean;
  can_unpublish?: boolean;
  current_version_number?: number | null;
  captures: CaptureRow[];
  appeals?: AppealRow[];
};

type Created = { id: string; reference: string; link: string | null; duplicate?: boolean };

export function CivicDeskList() {
  const [state, setState] = useState<"loading" | "signed-out" | "ready" | "hidden">("loading");
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/civic/desk", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          setState("signed-out");
          return;
        }
        if (res.status === 404) {
          setState("hidden");
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setError(data.error?.message ?? "The case list could not be loaded.");
          setState("ready");
          return;
        }
        setRows(data.cases ?? []);
        setState("ready");
      })
      .catch(() => {
        setError("The case list could not be loaded.");
        setState("ready");
      });
  }, []);

  if (state === "loading") return <p>Loading…</p>;
  if (state === "signed-out") {
    return (
      <p>
        <a href="/sign-in">Sign in</a> with a reviewer account to request a photo.
      </p>
    );
  }
  if (state === "hidden") return <p>Not found.</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!rows.length) return <p>No cases are waiting for a photo request.</p>;

  return (
    <div className="capture-list">
      {rows.map((row) => (
        <article key={row.reference}>
          <p className="mono">{row.reference}</p>
          <p>{row.title}</p>
          <p>{row.status_label}</p>
          <p>
            <a href={`/civic/desk/${row.reference}`}>Request a photo</a>
          </p>
        </article>
      ))}
    </div>
  );
}

export function CivicCaptureDesk({ reference }: { reference: string }) {
  const idempotencyKey = useRef(crypto.randomUUID());
  const [state, setState] = useState<"loading" | "signed-out" | "missing" | "ready">("loading");
  const [desk, setDesk] = useState<DeskCase | null>(null);
  const [prompt, setPrompt] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("72");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/v1/civic/desk/${encodeURIComponent(reference)}`, { credentials: "include" });
    if (res.status === 401) {
      setState("signed-out");
      return;
    }
    if (res.status === 404) {
      setState("missing");
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.message ?? "This case could not be loaded.");
      setState("ready");
      return;
    }
    setDesk(data);
    setState("ready");
  };

  useEffect(() => {
    void load().catch(() => {
      setError("This case could not be loaded.");
      setState("ready");
    });
  }, [reference]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (prompt.trim().length < 3) {
      setError("Describe the photo you need, in a short sentence.");
      return;
    }
    setPending(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/v1/civic/desk/${encodeURIComponent(reference)}/captures`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          address,
          expires_in_hours: Number(hours),
          idempotency_key: idempotencyKey.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "The link could not be created.");
        return;
      }
      setCreated(data);
      idempotencyKey.current = crypto.randomUUID();
      setPrompt("");
      setAddress("");
      await load();
    } catch {
      setError("The link could not be created. Try again.");
    } finally {
      setPending(false);
    }
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

  const revoke = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/v1/civic/desk/${encodeURIComponent(reference)}/captures/${id}/revoke`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error?.message ?? "This link could not be cancelled.");
      return;
    }
    await load();
  };

  if (state === "loading") return <p>Loading…</p>;
  if (state === "signed-out") {
    return (
      <p>
        <a href="/sign-in">Sign in</a> with a reviewer account to request a photo.
      </p>
    );
  }
  if (state === "missing") return <p>Not found.</p>;

  return (
    <div>
      {desk ? (
        <>
          <p className="mono">{desk.reference}</p>
          <p>{desk.status_label}</p>
          <h2>Claim</h2>
          <p>{desk.claim_text}</p>
        </>
      ) : null}
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
          <input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(e.target.value)} required />
        </label>
        <p>This link does not use credits. The recipient consents before the camera opens. A gallery upload is not offered.</p>
        {error ? <p role="alert">{error}</p> : null}
        <p className="intake-actions">
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Creating" : "Create link"}
          </button>
        </p>
      </form>
      {created?.link ? (
        <section>
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
      {desk && (desk.can_publish || desk.can_correct || desk.can_unpublish || (desk.appeals && desk.appeals.length)) ? (
        <CivicPublishPanel desk={desk} onSaved={() => void load()} />
      ) : null}
      {desk?.captures.length ? (
        <div className="capture-list">
          {desk.captures.map((row) => (
            <article key={row.id}>
              <p className="mono">{row.reference}</p>
              <p>{row.prompt}</p>
              <p>
                {row.status} · expires {new Date(row.expires_at).toLocaleString()}
              </p>
              {row.record_public_id ? (
                <p>
                  <a href={`/verify/${row.record_public_id}`}>Open the signed record</a>
                </p>
              ) : null}
              {row.status === "open" || row.status === "capturing" ? (
                <p className="intake-actions">
                  <button className="btn" type="button" onClick={() => void revoke(row.id)}>
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

function CivicPublishPanel({ desk, onSaved }: { desk: DeskCase; onSaved: () => void }) {
  const publishKey = useRef(crypto.randomUUID());
  const correctKey = useRef(crypto.randomUUID());
  const [assessment, setAssessment] = useState("inconclusive");
  const [claim, setClaim] = useState(desk.claim_text);
  const [conclusion, setConclusion] = useState("");
  const [rationale, setRationale] = useState("");
  const [evidence, setEvidence] = useState("");
  const [limitations, setLimitations] = useState(
    "A matching file record does not show that the event happened as claimed.",
  );
  const [location, setLocation] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [tier, setTier] = useState("Declared");
  const [tech, setTech] = useState("");
  const [change, setChange] = useState("");
  const [unpublishReason, setUnpublishReason] = useState("");
  const [resolution, setResolution] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const payload = (mode: "publish" | "correct") => ({
    idempotency_key: mode === "publish" ? publishKey.current : correctKey.current,
    assessment,
    claim_text: claim,
    conclusion,
    rationale,
    evidence_summary: evidence,
    limitations,
    location_text: location,
    change_reason: change,
    sources: sourceTitle.trim()
      ? [{ title: sourceTitle.trim(), url: sourceUrl.trim() || null, context: null }]
      : [],
    technical: tech.trim() ? [{ tier, statement: tech.trim() }] : [],
  });

  const post = async (path: string, body: unknown) => {
    setPending(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message ?? "The update could not be saved.");
        return;
      }
      if (path.endsWith("/publish")) publishKey.current = crypto.randomUUID();
      if (path.endsWith("/correct")) correctKey.current = crypto.randomUUID();
      setDone(path.endsWith("/unpublish") ? "The public page is unpublished." : "The public page was saved.");
      onSaved();
    } catch {
      setError("The update could not be saved. Try again.");
    } finally {
      setPending(false);
    }
  };

  const resolve = async (id: string, status: "accepted" | "rejected") => {
    if (resolution.trim().length < 20) {
      setError("Write the decision in at least a sentence.");
      return;
    }
    await post(`/api/v1/civic/desk/${encodeURIComponent(desk.reference)}/appeals/${id}/resolve`, {
      status,
      resolution,
    });
  };

  return (
    <section className="intake">
      <h2>Public page</h2>
      {desk.current_version_number ? (
        <p>
          Current public version {desk.current_version_number}. Visibility: {desk.publication_state}.{" "}
          {desk.publication_state === "published" ? <a href={`/civic/p/${desk.reference}`}>Open the public page</a> : null}
        </p>
      ) : (
        <p>Nothing is public until an editor publishes an allowlisted page.</p>
      )}
      {desk.can_publish || desk.can_correct ? (
        <>
          <label>
            Assessment
            <select value={assessment} onChange={(e) => setAssessment(e.target.value)}>
              <option value="corroborated">Corroborated</option>
              <option value="contradicted">Contradicted</option>
              <option value="misleading_context">Misleading context</option>
              <option value="partly_supported">Partly supported</option>
              <option value="inconclusive">Inconclusive</option>
              <option value="unable_to_assess">Unable to assess</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </label>
          <label>
            Claim on the public page
            <textarea value={claim} onChange={(e) => setClaim(e.target.value)} rows={3} maxLength={4000} />
          </label>
          <label>
            Conclusion
            <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={3} maxLength={4000} />
          </label>
          <label>
            Rationale
            <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={4} maxLength={4000} />
          </label>
          <label>
            Evidence examined
            <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3} maxLength={4000} />
          </label>
          <label>
            What this does not show
            <textarea value={limitations} onChange={(e) => setLimitations(e.target.value)} rows={3} maxLength={4000} />
          </label>
          <label>
            Broad location, if named
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
          </label>
          <label>
            Source name
            <input value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} maxLength={200} />
          </label>
          <label>
            Source link
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} maxLength={2000} />
          </label>
          <label>
            Evidence label
            <select value={tier} onChange={(e) => setTier(e.target.value)}>
              <option>Verified</option>
              <option>Detected</option>
              <option>Inferred</option>
              <option>Declared</option>
            </select>
          </label>
          <label>
            Evidence line
            <input value={tech} onChange={(e) => setTech(e.target.value)} maxLength={500} />
          </label>
          {desk.can_correct ? (
            <label>
              What this correction changes
              <textarea value={change} onChange={(e) => setChange(e.target.value)} rows={2} maxLength={500} />
            </label>
          ) : null}
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {done ? <p role="status">{done}</p> : null}
      <p className="intake-actions">
        {desk.can_publish ? (
          <button className="btn" type="button" disabled={pending} onClick={() => void post(`/api/v1/civic/desk/${encodeURIComponent(desk.reference)}/publish`, payload("publish"))}>
            Publish
          </button>
        ) : null}
        {desk.can_correct ? (
          <button className="btn" type="button" disabled={pending} onClick={() => void post(`/api/v1/civic/desk/${encodeURIComponent(desk.reference)}/correct`, payload("correct"))}>
            Publish correction
          </button>
        ) : null}
      </p>
      {desk.can_unpublish ? (
        <>
          <label>
            Why the page should come down
            <input value={unpublishReason} onChange={(e) => setUnpublishReason(e.target.value)} maxLength={500} />
          </label>
          <p className="intake-actions">
            <button
              className="btn"
              type="button"
              disabled={pending}
              onClick={() =>
                void post(`/api/v1/civic/desk/${encodeURIComponent(desk.reference)}/unpublish`, { reason: unpublishReason })
              }
            >
              Unpublish
            </button>
          </p>
        </>
      ) : null}
      {desk.appeals?.length ? (
        <>
          <h2>Appeals</h2>
          {desk.appeals.map((item) => (
            <article key={item.id}>
              <p>{item.status}</p>
              <p>{item.reason}</p>
              {item.supporting_url ? (
                <p>
                  <a href={item.supporting_url}>{item.supporting_url}</a>
                </p>
              ) : null}
              {item.resolution ? <p>{item.resolution}</p> : null}
              {item.status === "open" ? (
                <>
                  <label>
                    Decision
                    <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} maxLength={4000} />
                  </label>
                  <p className="intake-actions">
                    <button className="btn" type="button" disabled={pending} onClick={() => void resolve(item.id, "accepted")}>
                      Accept
                    </button>
                    <button className="btn" type="button" disabled={pending} onClick={() => void resolve(item.id, "rejected")}>
                      Reject
                    </button>
                  </p>
                </>
              ) : null}
            </article>
          ))}
        </>
      ) : null}
    </section>
  );
}
