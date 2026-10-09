"use client";

import { useEffect, useState } from "react";
import { TierTag } from "@oyokometa/findings-ui";
import { VerifyForm } from "./VerifyForm";

type View = {
  public_id: string;
  status: string;
  mime_type: string | null;
  dimensions: string | null;
  byte_size: number | null;
  registered_at: string;
  display_name: string | null;
  declarations: Record<string, string>;
  events: Array<{ type: string; created_at: string }>;
  signing_key_id: string;
  signature_status: string;
  timestamp_note: string;
  show_thumbnail: boolean;
  thumbnail_url: string | null;
  qr_svg: string;
  duplicate_note: string | null;
  contradictions: string[];
  is_registrant: boolean;
  record_problem: { headline: string; sub_line: string } | null;
  standing_line: string;
  credential_type: string;
  mode: string;
};

const FIELD_LABEL: Record<string, string> = {
  creator_name: "Creator name",
  creation_date: "Creation date",
  device_or_source: "Device or source",
  description: "Description",
  ai_use: "AI-use disclosure",
  licence_note: "Licence note",
};

export function PublicRecord({ publicId }: { publicId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [missing, setMissing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/verify/${publicId}`, { credentials: "include" })
      .then(async (r) => {
        if (r.status === 404) setMissing(true);
        else setView(await r.json());
      })
      .catch(() => setMissing(true));
  }, [publicId]);

  if (missing) {
    return (
      <div>
        <h1 className="text-3xl mb-4">Record not found</h1>
        <p>
          <a href="/verify">Check your own image</a>
        </p>
      </div>
    );
  }
  if (!view) return <p>Loading…</p>;

  const withdrawn = view.status === "withdrawn";
  const dispute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/disputes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_id: publicId,
        email: fd.get("email"),
        reason: fd.get("reason"),
      }),
    });
    const j = await res.json();
    if (j.dev_link) window.location.href = j.dev_link;
    else alert(j.error?.message ?? "Check your email to confirm the complaint.");
  };

  const withdraw = async () => {
    if (!view.is_registrant) return;
    const rec = await fetch("/api/v1/provenance", { credentials: "include" }).then((r) => r.json());
    const mine = (rec.records ?? []).find((r: { public_id: string }) => r.public_id === publicId);
    if (!mine) return;
    setWithdrawing(true);
    await fetch(`/api/v1/provenance/${mine.id}/events`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "WITHDRAWN" }),
    });
    window.location.reload();
  };

  return (
    <div>
      {view.record_problem ? (
        <>
          <h1 className="text-3xl mb-2">{view.record_problem.headline}</h1>
          <p className="mb-6">{view.record_problem.sub_line}</p>
        </>
      ) : (
        <h1 className="text-3xl mb-2">Registered record</h1>
      )}
      {withdrawn ? (
        <p className="mb-4">
          Withdrawn on{" "}
          {(view.events.find((e) => e.type === "WITHDRAWN")?.created_at ?? view.registered_at).slice(0, 10)}.
          The hash and event history remain. Thumbnail and declarations were removed.
        </p>
      ) : null}
      {view.duplicate_note ? <p className="mb-4">{view.duplicate_note}</p> : null}
      {view.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={view.thumbnail_url} alt="" className="max-w-xs mb-6" />
      ) : null}
      <dl className="text-sm space-y-2 mb-6">
        <div>
          <dt className="text-muted">Format</dt>
          <dd>{view.mime_type ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Dimensions</dt>
          <dd>{view.dimensions ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Size</dt>
          <dd>{view.byte_size ?? "—"} bytes</dd>
        </div>
        <div>
          <dt className="text-muted">Registration time (UTC)</dt>
          <dd>{view.registered_at}</dd>
        </div>
        {view.display_name ? (
          <div>
            <dt className="text-muted">Registrant display name</dt>
            <dd>{view.display_name}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted">Signature</dt>
          <dd>
            {view.signature_status} · key {view.signing_key_id}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Timestamp</dt>
          <dd>{view.timestamp_note}</dd>
        </div>
        <div>
          <dt className="text-muted">Credential type</dt>
          <dd>{view.credential_type}</dd>
        </div>
      </dl>
      {Object.keys(view.declarations ?? {}).length ? (
        <section className="mb-6">
          <h2 className="text-xl mb-2">Declarations</h2>
          <ul>
            {Object.entries(view.declarations).map(([k, v]) =>
              v ? (
                <li key={k} className="mb-2">
                  <TierTag tier="declared" /> {FIELD_LABEL[k] ?? k}: {v}
                </li>
              ) : null,
            )}
          </ul>
        </section>
      ) : null}
      {view.contradictions?.length ? (
        <section className="mb-6">
          <h2 className="text-xl mb-2">Declaration differs from detected evidence</h2>
          <ul>
            {view.contradictions.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="mb-6">
        <h2 className="text-xl mb-2">Events</h2>
        <ol className="timeline">
          {view.events.map((e, i) => (
            <li key={i}>
              {e.type} · {e.created_at}
            </li>
          ))}
        </ol>
      </section>
      <div
        className="mb-6 max-w-[10rem]"
        dangerouslySetInnerHTML={{ __html: view.qr_svg }}
      />
      <p className="mb-8">
        <a className="btn" href="/verify">
          Check your own image
        </a>
      </p>
      <h2 className="text-xl mb-2">Compare a file to this record</h2>
      <VerifyForm publicId={publicId} />
      {view.is_registrant && !withdrawn ? (
        <p className="mt-8">
          <button className="btn-secondary btn" type="button" disabled={withdrawing} onClick={withdraw}>
            Withdraw this record
          </button>
        </p>
      ) : null}
      {!withdrawn && view.status !== "disputed" ? (
        <form className="mt-10" onSubmit={dispute}>
          <h2 className="text-xl mb-2">Dispute</h2>
          <p className="text-sm text-muted mb-2">
            Email-verified complaints on public records. This is not a determination of ownership.
          </p>
          <input className="block w-full border border-line p-2 mb-2" name="email" type="email" required placeholder="Email" />
          <textarea
            className="block w-full border border-line p-2 mb-2"
            name="reason"
            required
            minLength={20}
            placeholder="Why this registration should be reviewed"
          />
          <button className="btn" type="submit">
            File a dispute
          </button>
        </form>
      ) : null}
      <p className="mt-8 text-sm">{view.standing_line}</p>
      <p className="text-sm">
        <a href="/abuse">Report abuse</a>
      </p>
    </div>
  );
}
