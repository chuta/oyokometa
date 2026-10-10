"use client";

import { useState, type ReactNode } from "react";
import type { EvidenceItem, FindingsObject } from "@oyokometa/evidence";
import { AI_SECTION_CHECK_FAILED, AI_SECTION_UNAVAILABLE, C2PA_NOT_DETECTED_LINE } from "@oyokometa/config";
import { LimitationsBlock } from "./LimitationsBlock.js";
import { TierTag } from "./TierTag.js";

type TabId = "overview" | "metadata" | "timeline" | "provenance" | "technical";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "metadata", label: "Metadata" },
  { id: "timeline", label: "Timeline" },
  { id: "provenance", label: "Provenance" },
  { id: "technical", label: "Technical details" },
];

export function FindingsDashboard({
  findings,
  previewUrl,
  onDelete,
  onShare,
  onReport,
  onRevealGps,
  title = "Image analysis",
  footer,
}: {
  findings: FindingsObject;
  previewUrl?: string | null;
  onDelete?: () => void;
  onShare?: () => void;
  onReport?: () => void;
  onRevealGps?: () => void;
  title?: string;
  footer?: ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const item = (id: string) => findings.evidence.find((e) => e.id === id);
  const camera = evidenceBySignal(findings, "camera_make_model");
  const software = evidenceBySignal(findings, "software_trace");
  const cameraCount = findings.evidence.filter((e) => e.signal.startsWith("camera_") || e.signal === "maker_notes").length;
  const timelineConflict = findings.timeline.some((t) => t.anomaly);
  const aiFailed = findings.categories.ai.rule_id === "AI-UNAVAILABLE";
  const aiTitle = aiFailed
    ? AI_SECTION_CHECK_FAILED
    : findings.ai_labels_enabled
      ? "AI analysis"
      : AI_SECTION_UNAVAILABLE;

  const openCategory = (category: string, nextTab?: TabId) => {
    setOpen(category);
    if (nextTab) setTab(nextTab);
  };

  return (
    <article className="report">
      <header className="report-heading">
        <h1>{title}</h1>
        <p>
          Analyzed {formatWhen(findings.acquisition_time_utc)}
          <span className="report-complete">Analysis complete</span>
        </p>
      </header>

      <div className="report-grid">
        <aside className="report-file">
          {previewUrl ? (
            // Preview is re-encoded and metadata-stripped (SE-4)
            // eslint-disable-next-line @next/next/no-img-element
            <img className="report-preview" src={previewUrl} alt="Metadata-stripped preview of the submitted file" />
          ) : (
            <p className="report-preview report-preview-empty">No preview for this file.</p>
          )}
          <div className="report-file-id">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" />
            ) : null}
            <div>
              <strong>{findings.identity.file_name ?? "Submitted file"}</strong>
              <span>
                {typeLabel(findings.identity.detected_type)} · {formatBytes(findings.identity.byte_size)}
                {findings.identity.width && findings.identity.height
                  ? ` · ${findings.identity.width}×${findings.identity.height}`
                  : ""}
              </span>
            </div>
          </div>
          <dl className="report-props">
            <div>
              <dt>File type</dt>
              <dd>{typeLabel(findings.identity.detected_type)}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{formatBytes(findings.identity.byte_size)}</dd>
            </div>
            <div>
              <dt>Dimensions</dt>
              <dd>
                {findings.identity.width && findings.identity.height
                  ? `${findings.identity.width} × ${findings.identity.height}`
                  : "Not recorded"}
              </dd>
            </div>
          </dl>
          <button className="btn report-details-btn" type="button" aria-expanded={details} onClick={() => setDetails((v) => !v)}>
            {details ? "Hide file details" : "View file details"}
          </button>
          {details ? (
            <dl className="report-more mono">
              <dt>SHA-256</dt>
              <dd>{findings.identity.sha256}</dd>
              {findings.identity.colour_space ? (
                <>
                  <dt>Colour space</dt>
                  <dd>{findings.identity.colour_space}</dd>
                </>
              ) : null}
              {findings.identity.orientation ? (
                <>
                  <dt>Orientation</dt>
                  <dd>{findings.identity.orientation}</dd>
                </>
              ) : null}
            </dl>
          ) : null}
          {onDelete ? (
            <button className="report-delete" type="button" onClick={onDelete}>
              Delete now
            </button>
          ) : null}
        </aside>

        <div className="report-main">
          <div className="report-exec-row">
            <section className="report-exec" aria-labelledby="exec-title">
              <h2 id="exec-title">{findings.executive.classification}</h2>
              <p className="report-confidence">
                Confidence: <strong>{findings.executive.confidence}</strong>
              </p>
              <p>{findings.executive.summary}</p>
            </section>
            <aside className="report-ai" aria-label="AI analysis">
              <h2>{aiTitle}</h2>
              <p>{findings.categories.ai.summary}</p>
            </aside>
          </div>

          <div className="report-stats">
            <button type="button" onClick={() => openCategory("origin", "metadata")}>
              <span>Origin signals</span>
              <strong>{cameraCount > 0 ? `${cameraCount} recorded` : findings.categories.origin.classification}</strong>
            </button>
            <button type="button" onClick={() => openCategory("editing", "metadata")}>
              <span>Editing trace</span>
              <strong>{software ? "Software recorded" : findings.categories.editing.classification}</strong>
            </button>
            <button type="button" onClick={() => openCategory("provenance", "provenance")}>
              <span>Content Credentials</span>
              <strong>{c2paShort(findings.c2pa.state)}</strong>
            </button>
            <button type="button" onClick={() => openCategory("timestamps", "timeline")}>
              <span>Timeline</span>
              <strong>{timelineConflict ? "Conflicting dates" : "Timestamps recorded"}</strong>
            </button>
          </div>

          <div className="report-tabs" role="tablist" aria-label="Analysis sections">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`tab-${entry.id}`}
                aria-selected={tab === entry.id}
                aria-controls={`panel-${entry.id}`}
                className={tab === entry.id ? "is-selected" : undefined}
                onClick={() => setTab(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="report-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "overview" ? (
              <div className="report-rows">
                <h3>Evidence summary</h3>
                <EvidenceRow
                  title="Camera evidence"
                  mark={camera ? "Detected" : "Not recorded"}
                  detail={camera ? "Camera make and model were read from the file." : findings.categories.origin.summary}
                  aside={camera?.value}
                  onOpen={() => setOpen("origin")}
                />
                <EvidenceRow
                  title="Software trace"
                  mark={software ? "Detected" : "Not recorded"}
                  detail={software?.value ?? findings.categories.editing.summary}
                  aside={software ? softwareName(software.value) : undefined}
                  onOpen={() => setOpen("editing")}
                />
                <EvidenceRow
                  title="Content Credentials"
                  mark={c2paShort(findings.c2pa.state)}
                  detail={
                    findings.c2pa.state === "not_detected"
                      ? C2PA_NOT_DETECTED_LINE
                      : findings.categories.provenance.summary
                  }
                  aside={findings.c2pa.state === "not_detected" ? "Not detected" : findings.c2pa.signer ?? undefined}
                  onOpen={() => setOpen("provenance")}
                />
                <EvidenceRow
                  title="Timeline"
                  mark={timelineConflict ? "Needs review" : "Recorded"}
                  detail={
                    timelineConflict
                      ? "Recorded timestamps do not agree. Each field is listed on its own."
                      : "No single capture date is shown. Each timestamp is labelled with its field."
                  }
                  aside={formatWhen(findings.acquisition_time_utc)}
                  onOpen={() => setOpen("timestamps")}
                />
              </div>
            ) : null}

            {tab === "metadata" ? (
              <div>
                {findings.gps_present ? (
                  <p>
                    Location metadata detected.{" "}
                    {onRevealGps ? (
                      <button className="btn btn-secondary" type="button" onClick={onRevealGps}>
                        Reveal coordinates
                      </button>
                    ) : null}
                  </p>
                ) : (
                  <p>No location metadata was read from this file.</p>
                )}
                <EvidenceList items={findings.evidence.filter((e) => e.category === "metadata")} />
              </div>
            ) : null}

            {tab === "timeline" ? (
              <div>
                <p>No single capture date is shown.</p>
                <ol className="timeline">
                  <li>
                    <span className="mono">acquisition time</span> {formatWhen(findings.acquisition_time_utc)}{" "}
                    <TierTag tier="detected" />
                  </li>
                  {findings.timeline.map((t) => (
                    <li key={t.field + t.value}>
                      <span className="mono">{t.field}</span> {t.value} ({t.zone})
                      {t.anomaly ? ` — ${t.anomaly}` : ""}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {tab === "provenance" ? (
              <div>
                <p>Content Credentials state: {findings.c2pa.state.replaceAll("_", " ")}</p>
                {findings.c2pa.state === "not_detected" ? <p>{C2PA_NOT_DETECTED_LINE}</p> : null}
                {findings.c2pa.signer ? <p>Signer: {findings.c2pa.signer}</p> : null}
                {findings.c2pa.claim_generator ? <p>Claim generator: {findings.c2pa.claim_generator}</p> : null}
                {findings.c2pa.signed_at ? <p>Signed at: {findings.c2pa.signed_at}</p> : null}
                {findings.c2pa.ai_assertion ? <p>Digital source type: {findings.c2pa.ai_assertion}</p> : null}
                {findings.c2pa.failure_reason ? <p>Validation: {findings.c2pa.failure_reason}</p> : null}
                {findings.c2pa.trust_list_version ? <p>Trust list: {findings.c2pa.trust_list_version}</p> : null}
                {Array.isArray(findings.c2pa.actions) && findings.c2pa.actions.length > 0 ? (
                  <ul>
                    {findings.c2pa.actions.map((action, i) => (
                      <li key={i}>{formatC2paAction(action)}</li>
                    ))}
                  </ul>
                ) : null}
                {Array.isArray(findings.c2pa.ingredients) && findings.c2pa.ingredients.length > 0 ? (
                  <ul>
                    {findings.c2pa.ingredients.map((ing, i) => (
                      <li key={i}>{formatC2paIngredient(ing)}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {tab === "technical" ? (
              <div>
                <p>
                  Rule {findings.executive.rule_id} · ruleset {findings.ruleset_version}
                </p>
                <ul className="report-versions">
                  {Object.entries(findings.analyzer_versions).map(([name, version]) => (
                    <li key={name}>
                      <span className="mono">{name}</span> {version}
                    </li>
                  ))}
                </ul>
                <EvidenceList items={findings.evidence} />
              </div>
            ) : null}
          </div>

          {open ? (
            <FindingDrawer
              title={findings.categories[open as keyof typeof findings.categories]?.classification ?? open}
              finding={findings.categories[open as keyof typeof findings.categories]}
              evidence={findings.evidence}
              onClose={() => setOpen(null)}
              item={item}
            />
          ) : null}
        </div>
      </div>

      <LimitationsBlock extra={findings.what_this_does_not_establish} />

      {footer}
      <nav className="report-actions" aria-label="Analysis actions">
        {onReport ? (
          <button className="btn" type="button" onClick={onReport}>
            Download report
          </button>
        ) : null}
        {onShare ? (
          <button className="btn btn-secondary" type="button" onClick={onShare}>
            Share report
          </button>
        ) : null}
        <a className="btn btn-secondary" href="/analyze">
          Analyze another
        </a>
      </nav>
    </article>
  );
}

function EvidenceRow({
  title,
  mark,
  detail,
  aside,
  onOpen,
}: {
  title: string;
  mark: string;
  detail: string;
  aside?: string;
  onOpen: () => void;
}) {
  return (
    <button className="report-row" type="button" onClick={onOpen}>
      <span>
        <strong>{title}</strong>
        <em>{mark}</em>
        <small>{detail}</small>
      </span>
      {aside ? <b>{aside}</b> : null}
    </button>
  );
}

function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (items.length === 0) return <p>Nothing was recorded in this section.</p>;
  return (
    <ul className="report-evidence">
      {items.map((e) => (
        <li key={e.id}>
          <TierTag tier={e.tier} /> {e.signal}: {e.value} <span>({e.source})</span>
        </li>
      ))}
    </ul>
  );
}

function FindingDrawer({
  title,
  finding,
  evidence,
  onClose,
  item,
}: {
  title: string;
  finding?: FindingsObject["executive"];
  evidence: EvidenceItem[];
  onClose: () => void;
  item: (id: string) => EvidenceItem | undefined;
}) {
  if (!finding) return null;
  const ev = finding.evidence_ids.map(item).filter(Boolean) as EvidenceItem[];
  return (
    <div className="drawer" role="dialog" aria-labelledby="drawer-title">
      <button type="button" onClick={onClose} aria-label="Close">
        Close
      </button>
      <h2 id="drawer-title">{title}</h2>
      <h3>What we found</h3>
      <p>{finding.summary}</p>
      <h3>Source</h3>
      <ul>
        {ev.length === 0 ? <li>No separate source item for this finding.</li> : null}
        {ev.map((e) => (
          <li key={e.id}>
            {e.source} · {e.producer}
          </li>
        ))}
      </ul>
      <h3>Interpretation</h3>
      <p>{finding.classification}</p>
      <h3>Caution</h3>
      <p>Lower-tier signals never override higher-tier ones. Absence of a signal proves nothing.</p>
      <p className="sr-only">{evidence.length} evidence items in this analysis.</p>
    </div>
  );
}

function evidenceBySignal(findings: FindingsObject, signal: string) {
  return findings.evidence.find((e) => e.signal === signal);
}

function softwareName(value: string) {
  const match = value.match(/^processed by (.+?);/i);
  return match?.[1] ?? value;
}

function c2paShort(state: FindingsObject["c2pa"]["state"]) {
  if (state === "not_detected") return "Not detected";
  if (state === "verified_and_trusted") return "Verified";
  if (state === "valid_signer_not_recognised") return "Signer not recognised";
  if (state === "invalid") return "Did not validate";
  return "Could not check";
}

function typeLabel(mime: string) {
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WebP";
  if (mime === "image/tiff") return "TIFF";
  if (mime === "image/heic" || mime === "image/heif") return "HEIC";
  return mime;
}

function formatBytes(bytes: number) {
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

function formatC2paAction(action: unknown): string {
  if (!action || typeof action !== "object") return String(action);
  const rec = action as { action?: string; softwareAgent?: string; digitalSourceType?: string };
  return [rec.action, rec.softwareAgent, rec.digitalSourceType].filter(Boolean).join(" · ") || JSON.stringify(action);
}

function formatC2paIngredient(ing: unknown): string {
  if (!ing || typeof ing !== "object") return String(ing);
  const rec = ing as { title?: string; format?: string; relationship?: string };
  return [rec.title, rec.format, rec.relationship].filter(Boolean).join(" · ") || JSON.stringify(ing);
}
