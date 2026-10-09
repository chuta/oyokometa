"use client";

import { useRef, useState } from "react";
import { BusyLabel, Spinner } from "./ActionStatus";

async function sha256Hex(file: File) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function VerifyForm({ publicId }: { publicId?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    headline?: string;
    sub_line?: string;
    match_type?: string;
    public_id?: string;
    hashed_on?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [similar, setSimilar] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      if (similar) {
        const res = await fetch(
          `/api/v1/verify/file${publicId ? `?public_id=${encodeURIComponent(publicId)}` : ""}`,
          { method: "POST", credentials: "include", body: await file.arrayBuffer() },
        );
        const j = await res.json();
        if (!res.ok) throw new Error(j.error?.message ?? "Check failed");
        setResult(j);
      } else {
        const sha = await sha256Hex(file);
        const res = await fetch("/api/v1/verify", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sha256: sha, public_id: publicId }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error?.message ?? "Check failed");
        setResult({ ...j, hashed_on: "browser" });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-4 max-w-prose">
        Exact-match hashing runs in this browser. The file does not leave your device for that
        check. Visual similarity needs the file to be sent to Oyokometa.
      </p>
      <div className="drop">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.tif,.tiff"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="button" className="btn" onClick={() => input.current?.click()}>
          Choose a file
        </button>
        {file ? <p className="mt-3">{file.name}</p> : null}
      </div>
      <label className="block mt-4">
        <input type="checkbox" checked={similar} onChange={(e) => setSimilar(e.target.checked)} /> Send
        the file to check visual similarity
      </label>
      {busy ? (
        <p className="mt-4">
          <Spinner label={similar ? "Sending file for a similarity check" : "Hashing in this browser"} />
        </p>
      ) : null}
      <p className="mt-4">
        <button className="btn" type="button" disabled={!file || busy} onClick={run}>
          <BusyLabel busy={busy} idle="Check this file" working="Checking…" />
        </button>
      </p>
      {result?.headline ? (
        <div className="mt-8">
          <h2 className="text-2xl">{result.headline}</h2>
          <p className="mt-2">{result.sub_line}</p>
          {result.hashed_on === "browser" ? (
            <p className="text-sm text-muted mt-2">SHA-256 computed in this browser.</p>
          ) : null}
          {result.public_id && result.match_type !== "no_match" ? (
            <p className="mt-3">
              <a href={`/verify/${result.public_id}`}>Open the record</a>
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="mt-4" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
