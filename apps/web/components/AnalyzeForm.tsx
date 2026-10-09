"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  "reading",
  "fingerprinting",
  "metadata",
  "credentials",
  "image_characteristics",
  "report",
] as const;

export function AnalyzeForm() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [deep, setDeep] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();

  const onFile = useCallback((f: File | null) => {
    setError(null);
    setFile(f);
  }, []);

  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setSignedIn(Boolean(j.user)));
  }, []);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
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
      const put = await fetch(upJson.upload_url, {
        method: "PUT",
        credentials: "include",
        headers: upJson.headers ?? { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        const j = await put.json().catch(() => ({}));
        throw new Error(j.error?.message ?? "Could not store the file");
      }
      const idem = crypto.randomUUID();
      const started = await fetch("/api/v1/analyses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idem },
        body: JSON.stringify({ asset_id: upJson.asset_id, tier: deep ? "deep" : "quick" }),
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
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        className="drop"
        tabIndex={0}
        role="button"
        aria-label="Choose an image to analyze"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") input.current?.click();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0] ?? null);
        }}
        onPaste={(e) => {
          const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
          const blob = item?.getAsFile();
          if (blob) onFile(blob);
        }}
      >
        <p>Drag and drop, paste, or choose a file</p>
        <p className="text-sm text-muted mt-2">
          {file ? file.name : "No file selected"}
        </p>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {busy ? (
        <div className="mt-6" aria-live="polite">
          <p>Working… {stage ? stage.replaceAll("_", " ") : "queued"}</p>
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
                onChange={(e) => setDeep(e.target.checked)}
              />
              Deep Analysis (runs extra forensics and detectors; spends credits)
            </label>
          ) : (
            <p className="text-sm text-muted mb-3">
              Sign in for Deep Analysis. Quick Scan stays free.
            </p>
          )}
          <button className="btn" type="button" onClick={run} disabled={!file}>
            Analyze
          </button>
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
