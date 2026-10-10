"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { REGISTRATION_ATTESTATION, RECORD_STATES } from "@oyokometa/config";
import { TierTag } from "@oyokometa/findings-ui";
import { BusyLabel, ProgressTrack, Spinner } from "./ActionStatus";
import { ChargeConfirm } from "./ChargeConfirm";
import { putFile } from "@/lib/put-file";

type Findings = {
  executive?: { summary?: string; classification?: string };
  categories?: Record<string, { summary?: string; classification?: string }>;
  identity?: { sha256?: string; detected_type?: string; width?: number; height?: number; byte_size?: number };
  c2pa?: { state?: string; ai_assertion?: string | null };
};

export function CreateForm() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Findings | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [mode, setMode] = useState("file_registration");
  const [visibility, setVisibility] = useState("private");
  const [thumb, setThumb] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [attested, setAttested] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [creationDate, setCreationDate] = useState("");
  const [device, setDevice] = useState("");
  const [description, setDescription] = useState("");
  const [aiUse, setAiUse] = useState("");
  const [licence, setLicence] = useState("");
  const [me, setMe] = useState<{ user: { email: string; emailVerified: boolean } | null } | null>(null);

  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => r.json())
      .then(setMe);
  }, []);

  const onFile = useCallback((f: File | null) => {
    setError(null);
    setFile(f);
    setFindings(null);
    setJobId(null);
    setAssetId(null);
    setUploadPct(null);
    setUploading(false);
  }, []);

  const analyze = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setUploading(true);
      setUploadPct(0);
      const up = await fetch("/api/v1/uploads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          byte_size: file.size,
        }),
      });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error?.message ?? "Upload failed");
      setAssetId(upJson.asset_id);
      const put = await putFile(
        upJson.upload_url,
        file,
        upJson.headers ?? { "Content-Type": file.type },
        setUploadPct,
      );
      if (!put.ok) throw new Error("Could not store the file");
      setUploading(false);
      setUploadPct(100);
      const started = await fetch("/api/v1/analyses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ asset_id: upJson.asset_id, tier: "quick" }),
      });
      const job = await started.json();
      if (!started.ok) throw new Error(job.error?.message ?? "Could not start analysis");
      setJobId(job.id);
      for (;;) {
        const s = await fetch(`/api/v1/analyses/${job.id}`, { credentials: "include" });
        const data = await s.json();
        if (!s.ok) throw new Error(data.error?.message ?? "Lost the job");
        setStage(data.stage);
        if (data.status === "completed") {
          setFindings(data.findings);
          setBusy(false);
          return;
        }
        if (data.status === "failed") throw new Error(data.error_message ?? "Analysis failed");
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setUploading(false);
    }
  };

  const register = async (expectedCredits: number) => {
    if (!assetId || !attested) return;
    setBusy(true);
    setError(null);
    try {
      const declarations: Record<string, string> = {};
      if (creatorName) declarations.creator_name = creatorName;
      if (creationDate) declarations.creation_date = creationDate;
      if (device) declarations.device_or_source = device;
      if (description) declarations.description = description;
      if (aiUse) declarations.ai_use = aiUse;
      if (licence) declarations.licence_note = licence;
      const res = await fetch("/api/v1/provenance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          asset_id: assetId,
          mode,
          visibility,
          show_thumbnail: thumb,
          display_name: displayName || null,
          declarations,
          attestation: true,
          expected_credits: expectedCredits,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error?.message ?? "Registration failed");
      window.location.href = `/verify/${j.public_id}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!me) return <p>Loading…</p>;
  if (!me.user) {
    return (
      <p>
        <a href="/sign-in">Sign in</a> with a verified email to register a file. Registration does
        not prove authorship.
      </p>
    );
  }
  if (!me.user.emailVerified) {
    return <p>Verify your email before registering a provenance record.</p>;
  }

  return (
    <div>
      <p className="mb-6 max-w-prose">{RECORD_STATES}</p>
      {!findings ? (
        <>
          <div
            className="drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0] ?? null);
            }}
          >
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.tif,.tiff"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <button type="button" className="btn" onClick={() => input.current?.click()}>
              Choose a file
            </button>
            {file ? <p className="mt-3">{file.name}</p> : <p className="mt-3 text-muted">or drop it here</p>}
          </div>
          {uploading ? <ProgressTrack value={uploadPct} label="Uploading" /> : null}
          {busy && !uploading ? (
            <p className="mt-4">
              <Spinner label={stage ? `Analyzing — ${stage.replaceAll("_", " ")}` : "Starting analysis"} />
            </p>
          ) : null}
          <p className="mt-4">
            <button className="btn" type="button" disabled={!file || busy} onClick={analyze}>
              <BusyLabel busy={busy} idle="Run baseline analysis" working={uploading ? "Uploading…" : "Analyzing…"} />
            </button>
          </p>
        </>
      ) : (
        <>
          <div className="create-cols">
            <section>
              <h2 className="text-xl mb-2">Detected by Oyokometa</h2>
              <p className="text-sm text-muted mb-3">Read-only. Tagged from the file.</p>
              <p>
                <TierTag tier="detected" /> {findings.executive?.summary}
              </p>
              {findings.identity?.sha256 ? (
                <p className="mono mt-3">{findings.identity.sha256}</p>
              ) : null}
              <ul className="mt-3 text-sm space-y-2">
                {Object.entries(findings.categories ?? {}).map(([k, v]) => (
                  <li key={k}>
                    <strong className="capitalize">{k}</strong>: {v.classification} — {v.summary}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-xl mb-2">Declared by you</h2>
              <p className="text-sm text-muted mb-3">
                Optional. Shown with a <TierTag tier="declared" /> tag everywhere.
              </p>
              <label className="block text-sm mb-2">
                Mode
                <select className="block w-full border border-line p-2 mt-1" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="file_registration">File registration (no creator claim)</option>
                  <option value="creator_declaration">Creator declaration (“I created this”)</option>
                  <option value="organization_declaration">Organization declaration (schema only)</option>
                </select>
              </label>
              {mode === "organization_declaration" ? (
                <p className="text-sm text-muted mb-2">
                  Organization verification is not available yet. This is stored as a declaration.
                </p>
              ) : null}
              <label className="block text-sm mb-2">
                Creator name
                <input className="block w-full border border-line p-2 mt-1" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} />
              </label>
              <label className="block text-sm mb-2">
                Creation date
                <input className="block w-full border border-line p-2 mt-1" type="date" value={creationDate} onChange={(e) => setCreationDate(e.target.value)} />
              </label>
              <label className="block text-sm mb-2">
                Device or source
                <input className="block w-full border border-line p-2 mt-1" value={device} onChange={(e) => setDevice(e.target.value)} />
              </label>
              <label className="block text-sm mb-2">
                Description
                <textarea className="block w-full border border-line p-2 mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="block text-sm mb-2">
                AI-use disclosure
                <select className="block w-full border border-line p-2 mt-1" value={aiUse} onChange={(e) => setAiUse(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  <option value="none">None</option>
                  <option value="ai_assisted">AI-assisted</option>
                  <option value="ai_generated">AI-generated</option>
                </select>
              </label>
              <label className="block text-sm mb-2">
                Licence note
                <input className="block w-full border border-line p-2 mt-1" value={licence} onChange={(e) => setLicence(e.target.value)} />
              </label>
            </section>
          </div>
          <fieldset className="mt-6">
            <legend className="font-medium mb-2">Visibility</legend>
            <label className="mr-4">
              <input type="radio" name="vis" checked={visibility === "private"} onChange={() => setVisibility("private")} />{" "}
              Private
            </label>
            <label>
              <input type="radio" name="vis" checked={visibility === "public"} onChange={() => setVisibility("public")} />{" "}
              Public verify page
            </label>
          </fieldset>
          <label className="block mt-3">
            <input type="checkbox" checked={thumb} onChange={(e) => setThumb(e.target.checked)} disabled={visibility !== "public"} />{" "}
            Show a metadata-stripped thumbnail on the public page
          </label>
          <label className="block text-sm mt-3">
            Display name on the public page (optional)
            <input className="block w-full border border-line p-2 mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className="block mt-6">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => {
                setAttested(e.target.checked);
                if (!e.target.checked) setConfirming(false);
              }}
            />{" "}
            {REGISTRATION_ATTESTATION}
          </label>
          {confirming ? (
            <ChargeConfirm
              action="provenance_registration"
              confirmLabel="Register this file"
              busy={busy}
              onConfirm={(cost) => void register(cost)}
              onCancel={() => setConfirming(false)}
            />
          ) : (
            <p className="mt-4">
              <button className="btn" type="button" disabled={!attested || busy} onClick={() => setConfirming(true)}>
                Review price and register
              </button>
            </p>
          )}
          {jobId ? (
            <p className="text-sm mt-2">
              Baseline analysis: <a href={`/a/${jobId}`}>{jobId}</a>
            </p>
          ) : null}
        </>
      )}
      {error ? (
        <p className="mt-4" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
