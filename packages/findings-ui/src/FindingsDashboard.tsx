"use client";

import { useState } from "react";
import type { EvidenceItem, FindingsObject } from "@oyokometa/evidence";
import { AI_SECTION_UNAVAILABLE, C2PA_NOT_DETECTED_LINE } from "@oyokometa/config";
import { LimitationsBlock } from "./LimitationsBlock.js";
import { TierTag } from "./TierTag.js";

export function FindingsDashboard({
  findings,
  previewUrl,
  onDelete,
  onShare,
  onReport,
  onRevealGps,
}: {
  findings: FindingsObject;
  previewUrl?: string | null;
  onDelete?: () => void;
  onShare?: () => void;
  onReport?: () => void;
  onRevealGps?: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const item = (id: string) => findings.evidence.find((e) => e.id === id);

  return (
    <article className="dashboard">
      <header className="exec">
        <p className="kicker">Executive finding</p>
        <h1>{findings.executive.classification}</h1>
        <p className="confidence">Confidence: {findings.executive.confidence}</p>
        <p>{findings.executive.summary}</p>
      </header>

      <section>
        <h2>Quick findings</h2>
        <ul className="finding-list">
          {Object.values(findings.categories).map((f) => (
            <li key={f.category}>
              <button type="button" onClick={() => setOpen(f.category)}>
                <strong>{f.classification}</strong>
                <span>{f.category}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {open ? (
        <FindingDrawer
          title={findings.categories[open as keyof typeof findings.categories]?.classification ?? open}
          finding={findings.categories[open as keyof typeof findings.categories]}
          evidence={findings.evidence}
          onClose={() => setOpen(null)}
          item={item}
        />
      ) : null}

      <section>
        <h2>Timeline</h2>
        <p>No single original date is shown.</p>
        <ol className="timeline">
          <li>
            <span className="mono">acquisition_time</span> {findings.acquisition_time_utc}{" "}
            <TierTag tier="detected" />
          </li>
          {findings.timeline.map((t) => (
            <li key={t.field + t.value}>
              <span className="mono">{t.field}</span> {t.value} ({t.zone})
              {t.anomaly ? ` — ${t.anomaly}` : ""}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Why we think this</h2>
        <p>Rule {findings.executive.rule_id} · ruleset {findings.ruleset_version}</p>
        <ul>
          {findings.executive.evidence_ids.map((id) => {
            const e = item(id);
            if (!e) return null;
            return (
              <li key={id}>
                <TierTag tier={e.tier} /> {e.signal}: {e.value}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2>Provenance</h2>
        <p>Content Credentials state: {findings.c2pa.state.replaceAll("_", " ")}</p>
        {findings.c2pa.state === "not_detected" ? <p>{C2PA_NOT_DETECTED_LINE}</p> : null}
        {findings.c2pa.signer ? <p>Signer: {findings.c2pa.signer}</p> : null}
      </section>

      <section>
        <h2>AI analysis</h2>
        {findings.ai_labels_enabled ? (
          <p>{findings.categories.ai.summary}</p>
        ) : (
          <p>{AI_SECTION_UNAVAILABLE}</p>
        )}
      </section>

      <section>
        <h2>File identity</h2>
        <dl className="mono">
          <dt>Evidence ID (SHA-256)</dt>
          <dd>{findings.identity.sha256}</dd>
          <dt>Type</dt>
          <dd>{findings.identity.detected_type}</dd>
          <dt>Size</dt>
          <dd>{findings.identity.byte_size} bytes</dd>
          <dt>Dimensions</dt>
          <dd>
            {findings.identity.width}×{findings.identity.height}
          </dd>
        </dl>
        {previewUrl ? (
          // Preview is re-encoded and metadata-stripped (SE-4)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Metadata-stripped preview of the submitted file" />
        ) : null}
      </section>

      <section>
        <h2>Full metadata</h2>
        {findings.gps_present ? (
          <p>
            Location metadata detected.{" "}
            {onRevealGps ? (
              <button type="button" onClick={onRevealGps}>
                Reveal coordinates
              </button>
            ) : null}
          </p>
        ) : null}
        <ul>
          {findings.evidence
            .filter((e) => e.category === "metadata")
            .map((e) => (
              <li key={e.id}>
                <TierTag tier={e.tier} /> {e.signal}: {e.value} ({e.source})
              </li>
            ))}
        </ul>
      </section>

      <LimitationsBlock extra={findings.what_this_does_not_establish} />

      <nav className="actions">
        {onReport ? (
          <button type="button" onClick={onReport}>
            Download report
          </button>
        ) : null}
        {onShare ? (
          <button type="button" onClick={onShare}>
            Share
          </button>
        ) : null}
        {onDelete ? (
          <button type="button" onClick={onDelete}>
            Delete now
          </button>
        ) : null}
        <a href="/analyze">Analyze another</a>
      </nav>
    </article>
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
        {ev.map((e) => (
          <li key={e.id}>
            {e.source} · {e.producer}
          </li>
        ))}
      </ul>
      <h3>Interpretation</h3>
      <p>{finding.classification}</p>
      <h3>Caution</h3>
      <p>
        Lower-tier signals never override higher-tier ones. Absence of a signal proves nothing.
      </p>
      <p className="sr-only">{evidence.length} evidence items in this analysis.</p>
    </div>
  );
}
