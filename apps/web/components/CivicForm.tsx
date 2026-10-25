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
  const [explanation, setExplanation] = useState("");
  const [specificCheck, setSpecificCheck] = useState("");
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
      setError("Describe the claim being checked in at least a sentence.");
      return;
    }
    if (explanation.trim() && explanation.trim() === claim.trim()) {
      setError("Put the circulating claim in the claim field. Use explanation for your own comment.");
      return;
    }
    if (kind === "result_sheet") {
      if (specificCheck.trim().length < 10) {
        setError("Say what specifically you would like checked.");
        return;
      }
      if (specificCheck.trim() === claim.trim()) {
        setError("Keep the general claim and the specific check as separate answers.");
        return;
      }
    }
    if (!consent) {
      setError("Confirm the privacy notice before submitting.");
      return;
    }
    if ((kind === "viral_media" || kind === "result_sheet") && !sourceUrl.trim() && !file) {
      setError("Add a still image or a link to the post.");
      return;
    }
    if (kind === "incident" && !category) {
      setError("Choose the kind of incident.");
      return;
    }
    if (kind === "incident" && !basis) {
      setError("Say whether you witnessed this directly, received it from someone else, or found it online.");
      return;
    }
    if (file && (file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi)$/i.test(file.name))) {
      setError("This form accepts a still image, not a video file. Paste the link to the post instead.");
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
          contributor_explanation: explanation,
          specific_check: specificCheck,
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
        <p>A file match does not show whether the caption is true. Attach a still image, or a still frame from a video. Paste the link for the video itself.</p>
      ) : null}
      <label>
        {kind === "incident" ? "What was reported?" : "Claim being checked"}
        <span className="field-hint">
          {kind === "incident"
            ? "What you witnessed, were told, or saw. This is the report, not your later comment on it."
            : kind === "result_sheet"
              ? "What is being said about this sheet. You do not have to say that fraud occurred."
              : "The caption or allegation as it is circulating. This is the claim Oyokometa will assess, not your own view of it."}
        </span>
        <textarea value={claim} onChange={(e) => setClaim(e.target.value)} required rows={5} maxLength={4000} />
      </label>
      {kind === "result_sheet" ? (
        <label>
          What specifically would you like checked?
          <span className="field-hint">
            For example a polling-unit identifier, a particular figure, a missing signature, or a
            difference between two documents.
          </span>
          <textarea
            value={specificCheck}
            onChange={(e) => setSpecificCheck(e.target.value)}
            required
            rows={4}
            maxLength={2000}
          />
        </label>
      ) : null}
      {kind === "incident" ? (
        <>
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
          <fieldset className="intake-fieldset">
            <legend>How do you know?</legend>
            <p className="field-hint">
              Choose the closest match. Reviewers treat a direct witness report, a second-hand
              report, and an online find as different kinds of evidence.
            </p>
            <div className="choice-grid">
              <label className="choice">
                <input
                  type="radio"
                  name="observation_basis"
                  value="witnessed"
                  checked={basis === "witnessed"}
                  onChange={() => setBasis("witnessed")}
                  required
                />
                <span>
                  I witnessed this directly
                  <span className="field-hint">You were there and saw or heard it yourself.</span>
                </span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="observation_basis"
                  value="told"
                  checked={basis === "told"}
                  onChange={() => setBasis("told")}
                />
                <span>
                  I am reporting information received from someone else
                  <span className="field-hint">Someone told you. You did not see it yourself.</span>
                </span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="observation_basis"
                  value="online"
                  checked={basis === "online"}
                  onChange={() => setBasis("online")}
                />
                <span>
                  I found this online
                  <span className="field-hint">You saw a post, message, or broadcast. Send the link if you have one.</span>
                </span>
              </label>
            </div>
          </fieldset>
        </>
      ) : null}
      <label>
        Link to the post or document
        <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} inputMode="url" maxLength={2000} placeholder="https://" />
      </label>
      <label>
        Still image, if you have one
        <span className="field-hint">JPEG, PNG, WebP, HEIC or TIFF. Video files are not accepted.</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            if (next && (next.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi)$/i.test(next.name))) {
              e.target.value = "";
              setFile(null);
              setError("This form accepts a still image, not a video file. Paste the link to the post instead.");
              return;
            }
            setError(null);
            setFile(next);
          }}
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
        Your explanation, optional
        <span className="field-hint">
          Why you think this needs checking, or what you noticed. Stored separately from the claim.
        </span>
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} maxLength={2000} />
      </label>
      <label>
        Email, optional
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={200} />
      </label>
      {kind === "incident" ? (
        <fieldset className="intake-fieldset">
          <legend>Restricted handling</legend>
          <label>
            <input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} />
            <span>Ask for restricted access</span>
          </label>
          <p className="field-hint">
            This asks Oyokometa to limit who can open the case to an assigned reviewer, an assigned
            editor, and trust-and-safety. It does not guarantee absolute anonymity or confidentiality
            beyond the <a href="/privacy">privacy notice</a>. An optional email, if you give one, is
            still stored with the case.
          </p>
        </fieldset>
      ) : null}
      <label>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>
          I understand this stays private until a person reviews it, and I have read the{" "}
          <a href="/privacy">privacy notice</a>.
        </span>
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
