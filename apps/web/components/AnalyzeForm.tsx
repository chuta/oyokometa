"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BusyLabel, ProgressTrack, Spinner } from "./ActionStatus";
import { ChargeConfirm } from "./ChargeConfirm";
import { putFile } from "@/lib/put-file";

const STAGES = [
  "reading",
  "fingerprinting",
  "metadata",
  "credentials",
  "image_characteristics",
  "report",
] as const;

type Phase = "idle" | "uploading" | "analyzing";

export function AnalyzeForm() {
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const inflight = useRef<Promise<string> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [deep, setDeep] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  const onFile = (f: File | null) => {
    abort.current?.abort();
    abort.current = null;
    inflight.current = null;
    setError(null);
    setFile(f);
    setAssetId(null);
    setPhase("idle");
    setUploadPct(null);
    setStage(null);
    if (f) {
      void upload(f).catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Upload failed");
        setPhase("idle");
      });
    }
  };

  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setSignedIn(Boolean(j.user)));
  }, []);

  const upload = async (chosen: File) => {
    if (inflight.current) return inflight.current;
    const controller = new AbortController();
    abort.current = controller;
    const work = (async () => {
      setPhase("uploading");
      setUploadPct(0);
      const up = await fetch("/api/v1/uploads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: chosen.name,
          content_type: chosen.type || "application/octet-stream",
          byte_size: chosen.size,
        }),
        signal: controller.signal,
      });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error?.message ?? "Upload failed");
      const put = await putFile(
        upJson.upload_url,
        chosen,
        upJson.headers ?? { "Content-Type": chosen.type },
        setUploadPct,
        controller.signal,
      );
    if (!put.ok) {
      const j = await put.json().catch(() => ({}) as Record<string, unknown>);
      const err = j.error as { message?: string } | undefined;
      throw new Error(err?.message ?? "Could not store the file");
    }
      setAssetId(upJson.asset_id);
      setUploadPct(100);
      setPhase((current) => (current === "analyzing" ? current : "idle"));
      return upJson.asset_id as string;
    })();
    inflight.current = work;
    try {
      return await work;
    } finally {
      if (inflight.current === work) inflight.current = null;
    }
  };

  const run = async (expectedCredits?: number) => {
    if (!file) return;
    setError(null);
    setConfirming(false);
    try {
      const id = assetId ?? (await upload(file));
      setPhase("analyzing");
      const idem = crypto.randomUUID();
      const started = await fetch("/api/v1/analyses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idem },
        body: JSON.stringify({
          asset_id: id,
          tier: deep ? "deep" : "quick",
          ...(deep ? { expected_credits: expectedCredits } : {}),
        }),
      });
      const job = await started.json();
      if (!started.ok) throw new Error(job.error?.message ?? "Could not start analysis");
      for (;;) {
        const s = await fetch(`/api/v1/analyses/${job.id}`, { credentials: "include" });
        const data = await s.json();
        if (!s.ok) throw new Error(data.error?.message ?? "Lost the job");
        setStage(data.stage);
        if (data.status === "completed") {
          router.push(`/a/${job.id}`);
          return;
        }
        if (data.status === "failed") {
          throw new Error(data.error_message ?? "Analysis failed");
        }
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("idle");
    }
  };

  const busy = phase !== "idle";

  return (
    <div>
      <div
        className="drop"
        tabIndex={0}
        role="button"
        aria-label="Choose an image to analyze"
        aria-busy={busy}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => {
          if (busy) return;
          if (e.key === "Enter" || e.key === " ") input.current?.click();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) onFile(e.dataTransfer.files[0] ?? null);
        }}
        onPaste={(e) => {
          if (busy) return;
          const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
          const blob = item?.getAsFile();
          if (blob) onFile(blob);
        }}
      >
        <p className="text-lg font-medium">Drop, paste, or choose a file</p>
        <p className="text-sm text-muted mt-2">
          {file ? file.name : "JPEG, PNG, WebP, HEIC/HEIF, TIFF · 25 MB"}
        </p>
        <input
          ref={input}
          className="sr-only"
          type="file"
          disabled={busy}
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {phase === "uploading" ? <ProgressTrack value={uploadPct} label="Uploading" /> : null}
      {phase === "analyzing" ? (
        <div className="mt-6" aria-live="polite">
          <p>
            <Spinner label={stage ? `Analyzing — ${stage.replaceAll("_", " ")}` : "Starting analysis"} />
          </p>
          <ol className="timeline mt-3">
            {STAGES.map((s) => (
              <li key={s} aria-current={s === stage ? "step" : undefined}>
                {s.replaceAll("_", " ")}
                {s === stage ? " — in progress" : ""}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="mt-6">
          {signedIn ? (
            <label className="block mb-3">
              <input
                type="checkbox"
                className="mr-2"
                checked={deep}
                disabled={phase === "uploading"}
                onChange={(e) => {
                  setDeep(e.target.checked);
                  setConfirming(false);
                }}
              />
              Deep Analysis (runs extra forensics and detectors; spends credits)
            </label>
          ) : (
            <p className="text-sm text-muted mb-3">
              Sign in for Deep Analysis. Quick Scan stays free.
            </p>
          )}
          {confirming ? (
            <ChargeConfirm
              action="deep_analysis"
              confirmLabel="Run Deep Analysis"
              onConfirm={(cost) => void run(cost)}
              onCancel={() => setConfirming(false)}
            />
          ) : (
            <button
              className="btn"
              type="button"
              onClick={() => (deep ? setConfirming(true) : void run())}
              disabled={!file || busy}
            >
              <BusyLabel
                busy={phase === "uploading"}
                idle={deep ? "Review price" : "Analyze"}
                working="Uploading…"
              />
            </button>
          )}
        </div>
      )}
      {error ? (
        <p className="mt-4" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
