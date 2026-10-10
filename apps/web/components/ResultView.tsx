"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FindingsDashboard } from "@oyokometa/findings-ui";
import { Spinner } from "./ActionStatus";
import { ChargeConfirm } from "./ChargeConfirm";
import type { FindingsObject } from "@oyokometa/evidence";

export function ResultView({ id }: { id: string }) {
  const [data, setData] = useState<{
    status: string;
    stage: string;
    tier?: string;
    findings: FindingsObject | null;
    preview_url: string | null;
    error_message: string | null;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailReport, setEmailReport] = useState(true);
  const [pending, setPending] = useState<"report" | "upgrade" | null>(null);
  const [charging, setCharging] = useState(false);
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
        <Spinner label={data ? `Working… ${data.stage.replaceAll("_", " ")}` : "Loading analysis"} />
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
  if (!data.findings) return <p className="page">No findings object.</p>;

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

  const report = async (expectedCredits: number) => {
    const res = await fetch(`/api/v1/analyses/${id}/reports`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ include_gps: false, email: emailReport, expected_credits: expectedCredits }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json.error?.message ?? "Could not generate report");
      return;
    }
    const jsonRep = json.reports?.find((r: { format: string }) => r.format === "json");
    if (emailReport) {
      setNotice(
        json.email_sent
          ? "Report ready. A signed-in link was emailed; the PDF is not attached. Open Account → Reports."
          : "Report ready. The email could not be sent — open it from Account → Reports.",
      );
      return;
    }
    if (jsonRep) window.location.href = `/api/v1/reports/${jsonRep.id}`;
  };

  const upgrade = async (expectedCredits: number) => {
    const res = await fetch(`/api/v1/analyses/${id}/upgrade`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ expected_credits: expectedCredits }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json.error?.message ?? "Could not upgrade");
      return;
    }
    router.push(`/a/${json.id}`);
  };

  const charge = async (cost: number) => {
    setCharging(true);
    setNotice(null);
    try {
      if (pending === "report") await report(cost);
      if (pending === "upgrade") await upgrade(cost);
    } finally {
      setCharging(false);
      setPending(null);
    }
  };

  return (
    <div className="page report-page">
      <p className="report-crumb">
        <a href="/analyze">Analyze</a>
        <span aria-hidden="true"> / </span>
        Report
      </p>
      <FindingsDashboard
        findings={data.findings}
        previewUrl={data.preview_url}
        onDelete={del}
        onShare={share}
        onReport={() => setPending("report")}
        onRevealGps={data.findings.gps_present ? gps : undefined}
        footer={
          <div className="report-options">
            <label>
              <input
                type="checkbox"
                checked={emailReport}
                onChange={(e) => setEmailReport(e.target.checked)}
              />
              Email a signed-in link when a report is generated
            </label>
            {data.tier !== "deep" ? (
              <button className="btn btn-secondary" type="button" onClick={() => setPending("upgrade")}>
                Upgrade to Deep Analysis
              </button>
            ) : null}
          </div>
        }
      />
      {pending ? (
        <ChargeConfirm
          key={pending}
          action={pending === "report" ? "report" : "deep_analysis"}
          confirmLabel={pending === "report" ? "Generate report" : "Run Deep Analysis"}
          busy={charging}
          onConfirm={(cost) => void charge(cost)}
          onCancel={() => setPending(null)}
        />
      ) : null}
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
