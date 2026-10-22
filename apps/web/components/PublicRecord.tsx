"use client";

import { useEffect, useRef, useState } from "react";
import { VerifyForm } from "./VerifyForm";

type View = {
  public_id: string;
  asset_sha256?: string;
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
  visibility?: string;
  capture?: {
    statement: string;
    subline: string;
    camera_line: string | null;
    location_line: string | null;
    location_reported: boolean;
    latitude: number | null;
    longitude: number | null;
    accuracy_m: number | null;
    user_agent: string | null;
    place_label?: string | null;
  } | null;
};

const FIELD_LABEL: Record<string, string> = {
  creator_name: "Creator name",
  creation_date: "Creation date",
  device_or_source: "Device or source",
  description: "Description",
  ai_use: "AI-use disclosure",
  licence_note: "Licence note",
  capture_prompt: "Requested photo",
  stated_address: "Stated address",
};

export function PublicRecord({ publicId }: { publicId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [missing, setMissing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [details, setDetails] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);

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
      <div className="page">
        <h1 className="text-3xl mb-4">Record not found</h1>
        <p>
          <a href="/verify">Check your own image</a>
        </p>
      </div>
    );
  }
  if (!view) return <p className="page">Loading…</p>;

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
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNotice({
        title: "Complaint not filed",
        body:
          j.error?.code === "not_found"
            ? "Disputes can be filed on public records."
            : (j.error?.message ?? "The complaint could not be filed."),
      });
      return;
    }
    if (j.dev_link) window.location.href = j.dev_link;
    else {
      setNotice({
        title: "Check your email",
        body: "A confirmation link is on its way. Open it to file the complaint.",
      });
    }
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

  const declarations = Object.entries(view.declarations ?? {}).filter(([, v]) => v);
  const headline = view.record_problem?.headline ?? (view.mode === "capture" ? "Capture record" : "Registered record");
  const fileTitle = view.display_name || "Registered file";

  return (
    <div className="page report-page">
      <p className="report-crumb">
        <a href="/verify">Verify</a>
        <span aria-hidden="true"> / </span>
        Record
      </p>
      <article className="report">
        <header className="report-heading">
          <h1>{headline}</h1>
          <p>
            Registered {formatWhen(view.registered_at)}
            <span className="report-complete">{statusLabel(view)}</span>
          </p>
        </header>
        {view.record_problem ? <p className="mb-4">{view.record_problem.sub_line}</p> : null}
        {withdrawn ? (
          <p className="mb-4">
            Withdrawn on {formatWhen(view.events.find((e) => e.type === "WITHDRAWN")?.created_at ?? view.registered_at)}.
            The hash and event history remain. Thumbnail and declarations were removed.
          </p>
        ) : null}
        {view.duplicate_note ? <p className="mb-4">{view.duplicate_note}</p> : null}
        {view.capture ? (
          <section className="mb-6">
            <p>{view.capture.statement}</p>
            <p>{view.capture.subline}</p>
            {view.capture.camera_line ? <p>{view.capture.camera_line}</p> : null}
            {view.capture.location_line ? <p>{view.capture.location_line}</p> : null}
            {view.is_registrant && view.capture.location_reported && view.capture.latitude != null && view.capture.longitude != null ? (
              <>
                {view.capture.place_label ? <p>{view.capture.place_label}</p> : null}
                <p className="mono">
                  {view.capture.latitude.toFixed(5)}, {view.capture.longitude.toFixed(5)}
                  {view.capture.accuracy_m != null ? ` ± ${Math.round(view.capture.accuracy_m)} m` : ""}
                </p>
                {view.capture.place_label ? (
                  <p className="field-hint">
                    A map lookup of the reported coordinates. It names the surrounding area, not where the camera was pointed.
                  </p>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        <div className="report-grid">
          <aside className="report-file">
            {view.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="report-preview" src={view.thumbnail_url} alt="Metadata-stripped preview of the registered file" />
            ) : (
              <p className="report-preview report-preview-empty">No preview for this file.</p>
            )}
            <div className="report-file-id">
              <div>
                <strong>{fileTitle}</strong>
                <span>
                  {typeLabel(view.mime_type)} · {formatBytes(view.byte_size)}
                  {view.dimensions ? ` · ${view.dimensions}` : ""}
                </span>
              </div>
            </div>
            <dl className="report-props">
              <div>
                <dt>File type</dt>
                <dd>{typeLabel(view.mime_type)}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{formatBytes(view.byte_size)}</dd>
              </div>
              <div>
                <dt>Dimensions</dt>
                <dd>{view.dimensions ?? "Not recorded"}</dd>
              </div>
            </dl>
            <button className="btn report-details-btn" type="button" aria-expanded={details} onClick={() => setDetails((v) => !v)}>
              {details ? "Hide file details" : "View file details"}
            </button>
            {details ? (
              <dl className="report-more mono">
                <dt>Public id</dt>
                <dd>{view.public_id}</dd>
                {view.asset_sha256 ? (
                  <>
                    <dt>SHA-256</dt>
                    <dd>{view.asset_sha256}</dd>
                  </>
                ) : null}
                <dt>Signing key</dt>
                <dd>{view.signing_key_id}</dd>
              </dl>
            ) : null}
            <div className="record-qr" dangerouslySetInnerHTML={{ __html: view.qr_svg }} />
            {view.is_registrant && !withdrawn ? (
              <button className="report-delete" type="button" disabled={withdrawing} onClick={withdraw}>
                {withdrawing ? "Withdrawing…" : "Withdraw this record"}
              </button>
            ) : null}
          </aside>

          <div className="report-main">
            <div className="report-exec-row">
              <section className="report-exec" aria-labelledby="record-title">
                <h2 id="record-title">Registration time</h2>
                <p className="report-ai-status">{formatWhen(view.registered_at)}</p>
                <p>Set by the Oyokometa server. It is not a creation date declared by the registrant.</p>
              </section>
              <aside className="report-ai" aria-label="Declarations">
                <h2>Declarations</h2>
                <p className="report-ai-status">{declarations.length ? `${declarations.length} stated` : "None stated"}</p>
                <p>Statements by the registrant. They are not checked against the file.</p>
              </aside>
            </div>

            <div className="report-stats">
              <div>
                <span>Signature</span>
                <strong>{signatureLabel(view.signature_status)}</strong>
              </div>
              <div>
                <span>Timestamp</span>
                <strong>{view.timestamp_note.includes("independent") ? "Independent token" : "Platform clock"}</strong>
              </div>
              <div>
                <span>Credential</span>
                <strong>{credentialLabel(view.credential_type)}</strong>
              </div>
              <div>
                <span>Events</span>
                <strong>{view.events.length === 1 ? "1 recorded" : `${view.events.length} recorded`}</strong>
              </div>
            </div>

            <section className="report-panel">
              <div className="report-rows">
                <h3>Declared by the registrant</h3>
                {declarations.length === 0 ? <p>No declarations were stored with this record.</p> : null}
                {declarations.map(([key, value]) => (
                  <div className="report-row is-static" key={key}>
                    <span>
                      <strong>{FIELD_LABEL[key] ?? key}</strong>
                      <em>Declared</em>
                      <small>{declarationValue(key, value)}</small>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {view.contradictions?.length ? (
              <section className="report-panel">
                <h3>Declaration differs from detected evidence</h3>
                <ul className="report-evidence">
                  {view.contradictions.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="report-panel">
              <h3>Events</h3>
              <ul className="report-evidence">
                {view.events.map((e, i) => (
                  <li key={`${e.type}-${i}`}>
                    <strong>{eventLabel(e.type)}</strong> <span>{formatWhen(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="report-panel">
              <h3>Compare a file to this record</h3>
              <VerifyForm publicId={publicId} />
            </section>

            {!withdrawn && view.status !== "disputed" && view.visibility === "public" ? (
              <form className="report-panel" onSubmit={dispute}>
                <h3>Dispute</h3>
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
        </div>
      </article>
      <NoticeDialog notice={notice} onClose={() => setNotice(null)} />
    </div>
  );
}

function NoticeDialog({
  notice,
  onClose,
}: {
  notice: { title: string; body: string } | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const last = useRef(notice);
  if (notice) last.current = notice;
  const content = notice ?? last.current;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (notice && !el.open) {
      el.showModal();
      el.querySelector("button")?.focus();
    }
    if (!notice && el.open) el.close();
  }, [notice]);
  return (
    <dialog
      ref={ref}
      className="notice"
      aria-labelledby="notice-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {content ? (
        <>
          <p className="notice-mark">Oyokometa</p>
          <h2 id="notice-title">{content.title}</h2>
          <p>{content.body}</p>
          <button className="btn" type="button" onClick={onClose}>
            OK
          </button>
        </>
      ) : null}
    </dialog>
  );
}

function statusLabel(view: View) {
  if (view.status === "withdrawn") return "Withdrawn";
  if (view.status === "disputed") return "Disputed";
  if (view.signature_status === "valid") return "Signature valid";
  return "Check failed";
}

function signatureLabel(status: string) {
  if (status === "valid") return "Valid";
  if (status === "withdrawn") return "Withdrawn";
  if (status === "disputed") return "Disputed";
  return "Did not validate";
}

function credentialLabel(type: string) {
  if (type === "platform_signed_record") return "Platform-signed record";
  return type.replaceAll("_", " ");
}

function eventLabel(type: string) {
  if (type === "REGISTERED") return "Registered";
  if (type === "WITHDRAWN") return "Withdrawn";
  return type.replaceAll("_", " ");
}

function declarationValue(key: string, value: string) {
  if (key !== "ai_use") return value;
  if (value === "none") return "None";
  if (value === "ai_assisted") return "AI-assisted";
  if (value === "ai_generated") return "AI-generated";
  return value;
}

function typeLabel(mime: string | null) {
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WebP";
  if (mime === "image/tiff") return "TIFF";
  if (mime === "image/heic" || mime === "image/heif") return "HEIC";
  return mime ?? "Not recorded";
}

function formatBytes(bytes: number | null) {
  if (bytes == null) return "Not recorded";
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hourCycle: "h23",
  }).format(date);
  return `${formatted} UTC`;
}
