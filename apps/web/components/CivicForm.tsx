"use client";

import { useRef, useState } from "react";
import { putFile } from "@/lib/put-file";

type Kind = "viral_media" | "result_sheet" | "incident";

const INCIDENTS = [
  ["intimidation", "Intimidation or threats"],
  ["vote_buying", "Vote-buying allegation"],
  ["obstruction", "Obstruction"],
  ["violence", "Violence or a safety concern"],
  ["campaign_rule", "Campaign-rule concern"],
  ["access", "Access problem"],
  ["other", "Other"],
] as const;

export function CivicForm({ kind }: { kind: Kind }) {
  const idempotencyKey = useRef(crypto.randomUUID());
  const [claim, setClaim] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [context, setContext] = useState("");
  const [dateUnknown, setDateUnknown] = useState(true);
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [election, setElection] = useState(kind === "result_sheet" ? "" : "");
  const [stateName, setStateName] = useState("");
  const [lga, setLga] = useState("");
  const [pollingUnit, setPollingUnit] = useState("");
  const [category, setCategory] = useState("");
  const [basis, setBasis] = useState("");
  const [restricted, setRestricted] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: HTMLFormElement) => {
    if (claim.trim().length < 20) {
      setError("Describe the claim in at least a sentence.");
      return;
    }
    if (!consent) {
      setError("Confirm the privacy notice before submitting.");
      return;
    }
    if ((kind === "viral_media" || kind === "result_sheet") && !sourceUrl.trim() && !file) {
      setError("Add a still image or a link to the post.");
      return;
    }
    if (kind === "incident" && (!category || !basis)) {
      setError("Choose the kind of incident and how you know about it.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      let assetId: string | null = null;
      if (file) {
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
        const upJson = (await up.json()) as { asset_id?: string; upload_url?: string; headers?: Record<string, string>; error?: { message?: string } };
        if (!up.ok || !upJson.asset_id || !upJson.upload_url) {
          setError(upJson.error?.message ?? "The image could not be uploaded.");
          return;
        }
        const put = await putFile(upJson.upload_url, file, upJson.headers ?? { "Content-Type": file.type || "application/octet-stream" });
        if (!put.ok) {
          const failed = (await put.json().catch(() => ({}))) as { error?: { message?: string } };
          setError(failed.error?.message ?? "The image could not be stored.");
          return;
        }
        assetId = upJson.asset_id;
      }
      const res = await fetch("/api/v1/civic/cases", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotency_key: idempotencyKey.current,
          case_type: kind,
          claim_text: claim,
          source_url: sourceUrl,
          asset_id: assetId,
          context,
          claimed_event_on: dateUnknown ? "" : eventDate,
          claimed_location_text: location,
          election_or_event: election,
          state: stateName,
          lga,
          polling_unit_code: pollingUnit,
          incident_category: category,
          observation_basis: basis,
          restricted_handling: restricted,
          contributor_email: email,
          consent,
          website_confirm: String(new FormData(form).get("website_confirm") ?? ""),
        }),
      });
      const data = (await res.json()) as { reference?: string; receipt_token?: string; error?: { message?: string } };
      if (!res.ok || !data.reference) {
        setError(data.error?.message ?? "The submission could not be saved. Try again.");
        return;
      }
      if (data.receipt_token) sessionStorage.setItem(`okm-civic:${data.reference}`, data.receipt_token);
      window.location.assign(`/civic/c/${data.reference}`);
    } catch {
      setError("The submission could not be saved. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="intake"
      aria-describedby={error ? "civic-form-error" : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}
    >
      {kind === "incident" ? (
        <p>
          Do not put yourself at risk to gather evidence. If you or someone else is in immediate
          danger, contact local emergency services. Sending a report here does not dispatch help.
        </p>
      ) : null}
      {kind === "result_sheet" ? (
        <p>
          Figures you submit are not official results. A published finding, if there is one, comes
          only after a person compares the document with an official source.
        </p>
      ) : null}
      {kind === "viral_media" ? (
        <p>A file match does not show whether the caption is true. Still images only. For a video, send the link to the post.</p>
      ) : null}
      <label>
        {kind === "incident" ? "What was reported?" : "Claim to check"}
        <textarea value={claim} onChange={(e) => setClaim(e.target.value)} required rows={5} maxLength={4000} />
      </label>
      {kind === "incident" ? (
        <div className="intake-grid">
          <label>
            Kind of incident
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">Choose one</option>
              {INCIDENTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            How do you know?
            <select value={basis} onChange={(e) => setBasis(e.target.value)} required>
              <option value="">Choose one</option>
              <option value="witnessed">I witnessed this</option>
              <option value="told">Someone told me</option>
              <option value="online">I saw this online</option>
            </select>
          </label>
        </div>
      ) : null}
      <label>
        Link to the post or document
        <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} inputMode="url" maxLength={2000} placeholder="https://" />
      </label>
      <label>
        Still image, if you have one
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {kind === "result_sheet" ? (
        <>
          <label>
            Election
            <input value={election} onChange={(e) => setElection(e.target.value)} required maxLength={200} placeholder="Name it, or type Not sure" />
          </label>
          <div className="intake-grid">
            <label>
              State
              <input value={stateName} onChange={(e) => setStateName(e.target.value)} maxLength={120} />
            </label>
            <label>
              Local government
              <input value={lga} onChange={(e) => setLga(e.target.value)} maxLength={120} />
            </label>
          </div>
          <label>
            Polling unit, if you know it
            <input value={pollingUnit} onChange={(e) => setPollingUnit(e.target.value)} maxLength={120} />
          </label>
        </>
      ) : (
        <label>
          Election or event, if you know it
          <input value={election} onChange={(e) => setElection(e.target.value)} maxLength={200} placeholder="Or leave blank" />
        </label>
      )}
      <label>
        <input type="checkbox" checked={dateUnknown} onChange={(e) => setDateUnknown(e.target.checked)} /> Date unknown
      </label>
      {dateUnknown ? null : (
        <label>
          Claimed date
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
        </label>
      )}
      <label>
        Broad location, if it is safe to share
        <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="A town or state, not a precise address" />
      </label>
      <label>
        More context, optional
        <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} maxLength={2000} />
      </label>
      <label>
        Email, optional
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={200} />
      </label>
      {kind === "incident" ? (
        <label>
          <input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} /> Ask for restricted handling
        </label>
      ) : null}
      <label>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required /> I understand this stays private until a person reviews it, and I have read the{" "}
        <a href="/privacy">privacy notice</a>.
      </label>
      <div className="sr-only" aria-hidden="true">
        <label>
          Leave this blank
          <input tabIndex={-1} autoComplete="off" name="website_confirm" defaultValue="" />
        </label>
      </div>
      {error ? (
        <p id="civic-form-error" role="alert">
          {error}
        </p>
      ) : (
        <p>Nothing you send is published automatically.</p>
      )}
      <p className="intake-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Sending" : "Submit"}
        </button>
      </p>
    </form>
  );
}
