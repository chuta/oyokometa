"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FindingsDashboard } from "@oyokometa/findings-ui";
import type { FindingsObject } from "@oyokometa/evidence";

export function ResultView({ id }: { id: string }) {
  const [data, setData] = useState<{
    status: string;
    stage: string;
    findings: FindingsObject | null;
    preview_url: string | null;
    error_message: string | null;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const res = await fetch(`/api/v1/analyses/${id}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error?.message ?? "Not found");
        return;
      }
      if (stop) return;
      setData(json);
      if (json.status === "queued" || json.status === "running") {
        setTimeout(tick, 700);
      }
    };
    tick();
    return () => {
      stop = true;
    };
  }, [id]);

  if (err) return <p className="page" role="alert">{err}</p>;
  if (!data || (data.status !== "completed" && data.status !== "failed")) {
    return (
      <p className="page" aria-live="polite">
        {data ? `Working… ${data.stage.replaceAll("_", " ")}` : "Loading analysis"}
      </p>
    );
  }
  if (data.status === "failed") {
    return (
      <div className="page">
        <h1 className="text-3xl">Could not complete this analysis</h1>
        <p className="mt-4">{data.error_message}</p>
        <a className="btn mt-6" href="/analyze">
          Analyze another
        </a>
      </div>
    );
  }
  if (!data.findings) return <p>No findings object.</p>;

  const del = async () => {
    await fetch(`/api/v1/analyses/${id}`, { method: "DELETE", credentials: "include" });
    router.push("/");
  };

  const gps = async () => {
    const res = await fetch(`/api/v1/analyses/${id}/gps`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    alert(
      json.gps
        ? `${json.warning}\n\n${json.gps.lat}, ${json.gps.lng}`
        : json.warning ?? "No coordinates",
    );
  };

  const [wrong, setWrong] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const share = async () => {
    const res = await fetch(`/api/v1/analyses/${id}/share-links`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ include_image: false }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json.error?.message ?? "Could not create share link");
      return;
    }
    setNotice(`${window.location.origin}${json.url}`);
  };

  const report = async () => {
    const res = await fetch(`/api/v1/analyses/${id}/reports`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ include_gps: false }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json.error?.message ?? "Could not generate report");
      return;
    }
    const jsonRep = json.reports?.find((r: { format: string }) => r.format === "json");
    if (jsonRep) window.location.href = `/api/v1/reports/${jsonRep.id}`;
  };

  const upgrade = async () => {
    const res = await fetch(`/api/v1/analyses/${id}/upgrade`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json.error?.message ?? "Could not upgrade");
      return;
    }
    router.push(`/a/${json.id}`);
  };

  return (
    <div className="page">
      <FindingsDashboard>
        findings={data.findings}
        previewUrl={data.preview_url}
        onDelete={del}
        onShare={share}
        onReport={report}
        onRevealGps={data.findings.gps_present ? gps : undefined}
      />
      <p className="mt-4">
        <button className="btn-secondary btn" type="button" onClick={upgrade}>
          Upgrade to Deep Analysis
        </button>
      </p>
      {notice ? <p className="mt-3">{notice}</p> : null}
      <form
        className="mt-8 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setWrong(true);
        }}
      >
        <p>This looks wrong</p>
        <label className="block mt-2">
          <input type="checkbox" className="mr-2" />
          I consent to retain this image for review. Without consent, only the evidence record is reviewed.
        </label>
        <button className="btn-secondary btn mt-3" type="submit">
          Submit feedback
        </button>
        {wrong ? <p className="mt-2">Recorded. Thank you.</p> : null}
      </form>
    </div>
  );
}
