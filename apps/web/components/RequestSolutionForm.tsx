"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SOLUTION_BUDGETS,
  SOLUTION_CONTACT_METHODS,
  SOLUTION_CURRENCIES,
  SOLUTION_DECISIONS,
  SOLUTION_ENGAGEMENTS,
  SOLUTION_MEDIA_SOURCES,
  SOLUTION_MEDIA_TYPES,
  SOLUTION_NEEDS,
  SOLUTION_ORGANIZATIONS,
  SOLUTION_SERVICE_IDS,
  SOLUTION_SERVICES,
  SOLUTION_STARTS,
  SOLUTION_VOLUMES,
  CUSTOM_SERVICE,
  type SolutionServiceId,
} from "@oyokometa/config";

const STEPS = ["Contact", "Organisation", "Services", "Problem", "Media", "Commercial", "Review"] as const;

type Details = Record<string, string>;

type Draft = {
  contact_name: string;
  email: string;
  organization_name: string;
  job_title: string;
  country: string;
  contact_method: string;
  phone: string;
  website: string;
  profile_url: string;
  preferred_time: string;
  organization_type: string;
  organization_context: string;
  services: string[];
  needs: string[];
  problem: string;
  media_types: string[];
  media_sources: string[];
  volume: string;
  engagement: string;
  budget_range: string;
  currency: string;
  expected_start: string;
  decision_status: string;
  details: Details;
  privacy_ack: boolean;
  marketing_consent: boolean;
  contact_consent: boolean;
  more: boolean;
};

const empty = (services: string[], organization: string): Draft => ({
  contact_name: "",
  email: "",
  organization_name: "",
  job_title: "",
  country: "",
  contact_method: "email",
  phone: "",
  website: "",
  profile_url: "",
  preferred_time: "",
  organization_type: organization,
  organization_context: "",
  services,
  needs: [],
  problem: "",
  media_types: [],
  media_sources: [],
  volume: "",
  engagement: "",
  budget_range: "",
  currency: "",
  expected_start: "",
  decision_status: "",
  details: {},
  privacy_ack: false,
  marketing_consent: false,
  contact_consent: true,
  more: false,
});

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function RequestSolutionForm() {
  const params = useSearchParams();
  const requested = params.get("service");
  const audience = params.get("audience");
  const initialServices =
    requested && (SOLUTION_SERVICE_IDS as readonly string[]).includes(requested) ? [requested] : [];
  const initialOrg = SOLUTION_ORGANIZATIONS.some((item) => item.id === audience) ? audience ?? "" : "";
  const [draft, setDraft] = useState<Draft>(() => empty(initialServices, initialOrg));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ reference: string; emailSent: boolean } | null>(null);
  const idempotencyKey = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `req-${Date.now()}`,
  );

  const selected = useMemo(() => new Set(draft.services), [draft.services]);
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const detail = (key: string, value: string) =>
    setDraft((current) => ({ ...current, details: { ...current.details, [key]: value } }));

  const validate = (index: number) => {
    if (index === 0) {
      if (!draft.contact_name.trim() || !draft.organization_name.trim() || !draft.job_title.trim() || !draft.country.trim()) {
        return "Enter your name, organisation, role, and country.";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return "Enter a valid email.";
      if (draft.contact_method === "phone" && !draft.phone.trim()) return "Enter a phone number, or choose email instead.";
    }
    if (index === 1 && !draft.organization_type) return "Choose an organisation type.";
    if (index === 2 && draft.services.length === 0) return "Select at least one service.";
    if (index === 3 && draft.problem.trim().length < 40) return "Describe the problem in at least a few sentences.";
    if (index === 6 && !draft.privacy_ack) return "Confirm that you have read the privacy notice.";
    return null;
  };

  const go = (next: number) => {
    if (next > step) {
      const message = validate(step);
      if (message) {
        setError(message);
        return;
      }
    }
    setError(null);
    setStep(next);
  };

  const submit = async (form: HTMLFormElement) => {
    const message = validate(6);
    if (message) {
      setError(message);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/solutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotency_key: idempotencyKey.current,
          contact_name: draft.contact_name,
          email: draft.email,
          organization_name: draft.organization_name,
          job_title: draft.job_title,
          country: draft.country,
          contact_method: draft.contact_method,
          phone: draft.phone,
          website: draft.website,
          profile_url: draft.profile_url,
          preferred_time: draft.preferred_time,
          organization_type: draft.organization_type,
          organization_context: draft.organization_context,
          services: draft.services,
          needs: draft.needs,
          problem: draft.problem,
          media_types: draft.media_types,
          media_sources: draft.media_sources,
          volume: draft.volume,
          engagement: draft.engagement,
          budget_range: draft.budget_range,
          currency: draft.currency,
          expected_start: draft.expected_start,
          decision_status: draft.decision_status,
          details: draft.details,
          privacy_ack: draft.privacy_ack,
          marketing_consent: draft.marketing_consent,
          contact_consent: draft.contact_consent,
          website_confirm: String(new FormData(form).get("website_confirm") ?? ""),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? "The request was not submitted. Try again.");
      setDone({ reference: String(json.reference), emailSent: Boolean(json.email_sent) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request was not submitted. Try again.");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <section className="about-section" aria-live="polite">
        <h2>Thank you. We&apos;ve received your request.</h2>
        <p>
          Your requirements have been submitted to Oyokometa for review. We&apos;ll assess the
          information provided and determine the appropriate next step.
        </p>
        <p>
          Depending on your request, that may involve a clarification, a discovery call, a technical
          assessment, a proposed pilot, or a scoped engagement. This is not yet a commitment to
          deliver a service, and no pricing or implementation timeline is confirmed until agreed.
        </p>
        <p className="copy-field-ref">
          Reference <strong className="mono">{done.reference}</strong>
        </p>
        {done.emailSent ? (
          <p>A confirmation email is on its way.</p>
        ) : (
          <p>Keep this reference. A confirmation email was not sent.</p>
        )}
        <p className="hero-actions">
          <a className="btn" href="/">
            Return to the platform
          </a>
          <a className="btn btn-secondary" href="/analyze">
            Analyze an image
          </a>
        </p>
      </section>
    );
  }

  return (
    <form
      className="intake"
      onSubmit={(event) => {
        event.preventDefault();
        if (step < STEPS.length - 1) go(step + 1);
        else void submit(event.currentTarget);
      }}
    >
      <ol className="stepper">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button type="button" aria-current={index === step ? "step" : undefined} onClick={() => go(index)} disabled={index > step}>
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>
      <p className="field-hint">
        Step {step + 1} of {STEPS.length}. Submitting a request does not commit you to a purchase.
      </p>

      {step === 0 ? (
        <fieldset>
          <legend>Contact information</legend>
          <div className="intake-grid">
            <label>
              Full name
              <input value={draft.contact_name} onChange={(e) => set({ contact_name: e.target.value })} required autoComplete="name" />
            </label>
            <label>
              Business email
              <input type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} required autoComplete="email" />
            </label>
            <label>
              Organisation
              <input value={draft.organization_name} onChange={(e) => set({ organization_name: e.target.value })} required autoComplete="organization" />
            </label>
            <label>
              Job title or role
              <input value={draft.job_title} onChange={(e) => set({ job_title: e.target.value })} required />
            </label>
            <label>
              Country of operation
              <input value={draft.country} onChange={(e) => set({ country: e.target.value })} required autoComplete="country-name" />
            </label>
            <label>
              Preferred contact method
              <select value={draft.contact_method} onChange={(e) => set({ contact_method: e.target.value })}>
                {SOLUTION_CONTACT_METHODS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Phone number <span className="field-hint">Optional unless phone is selected</span>
              <input value={draft.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="tel" />
            </label>
            <label>
              Organisation website <span className="field-hint">Optional</span>
              <input value={draft.website} onChange={(e) => set({ website: e.target.value })} autoComplete="url" />
            </label>
            <label>
              LinkedIn or professional profile <span className="field-hint">Optional</span>
              <input value={draft.profile_url} onChange={(e) => set({ profile_url: e.target.value })} />
            </label>
            <label>
              Preferred time for a conversation <span className="field-hint">Optional</span>
              <input value={draft.preferred_time} onChange={(e) => set({ preferred_time: e.target.value })} />
            </label>
          </div>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <fieldset>
          <legend>Organisation profile</legend>
          <div className="choice-grid">
            {SOLUTION_ORGANIZATIONS.map((item) => (
              <label className="choice" key={item.id}>
                <input
                  type="radio"
                  name="organization_type"
                  checked={draft.organization_type === item.id}
                  onChange={() => set({ organization_type: item.id })}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <label>
            Operating context <span className="field-hint">Optional</span>
            <textarea
              value={draft.organization_context}
              onChange={(e) => set({ organization_context: e.target.value })}
              rows={4}
            />
          </label>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <fieldset>
          <legend>What do you need help with?</legend>
          <p>Select every service that applies. You can change a preselected category.</p>
          <div className="choice-grid">
            {[...SOLUTION_SERVICES, CUSTOM_SERVICE].map((item) => (
              <label className="choice" key={item.id}>
                <input
                  type="checkbox"
                  checked={draft.services.includes(item.id)}
                  onChange={() => set({ services: toggle(draft.services, item.id) })}
                />
                <span>{item.title}</span>
              </label>
            ))}
          </div>
          <p>You can also name the specific work.</p>
          <div className="choice-grid">
            {SOLUTION_NEEDS.map((item) => (
              <label className="choice" key={item.id}>
                <input type="checkbox" checked={draft.needs.includes(item.id)} onChange={() => set({ needs: toggle(draft.needs, item.id) })} />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 3 ? (
        <fieldset>
          <legend>Describe the problem</legend>
          <label>
            What problem are you trying to solve?
            <textarea
              value={draft.problem}
              onChange={(e) => set({ problem: e.target.value })}
              rows={7}
              required
              placeholder="Describe the situation, what currently happens, why it is a problem, and what you would like to achieve."
            />
          </label>
          <button className="btn btn-secondary" type="button" onClick={() => set({ more: !draft.more })}>
            {draft.more ? "Hide extra questions" : "Add more detail"}
          </button>
          {draft.more ? (
            <div className="intake-grid">
              {(
                [
                  ["trigger", "What triggers the need for this solution?"],
                  ["if_unaddressed", "What happens if the problem is not addressed?"],
                  ["handled_today", "How is the problem handled today?"],
                  ["current_tools", "What tools or providers do you currently use?"],
                  ["success", "What would a successful outcome look like?"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label} <span className="field-hint">Optional</span>
                  <textarea rows={3} value={draft.details[key] ?? ""} onChange={(e) => detail(key, e.target.value)} />
                </label>
              ))}
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {step === 4 ? (
        <fieldset>
          <legend>Media and technical requirements</legend>
          <p>What kinds of media are involved?</p>
          <CheckList
            options={SOLUTION_MEDIA_TYPES}
            selected={draft.media_types}
            onChange={(id) => set({ media_types: toggle(draft.media_types, id) })}
          />
          <p>Where does the media originate?</p>
          <CheckList
            options={SOLUTION_MEDIA_SOURCES}
            selected={draft.media_sources}
            onChange={(id) => set({ media_sources: toggle(draft.media_sources, id) })}
          />
          <div className="intake-grid">
            <SelectField label="Approximate volume" value={draft.volume} options={SOLUTION_VOLUMES} onChange={(volume) => set({ volume })} />
            <SelectField
              label="Desired engagement"
              value={draft.engagement}
              options={SOLUTION_ENGAGEMENTS}
              onChange={(engagement) => set({ engagement })}
            />
          </div>
          <ConditionalFields selected={selected} details={draft.details} onChange={detail} />
          <div className="intake-grid">
            {(
              [
                ["systems", "Existing systems to integrate with"],
                ["output_format", "Required output format"],
                ["turnaround", "Expected turnaround time"],
                ["security", "Security, privacy, data residency, or retention requirements"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label} <span className="field-hint">Optional</span>
                <textarea rows={3} value={draft.details[key] ?? ""} onChange={(e) => detail(key, e.target.value)} />
              </label>
            ))}
          </div>
          <p className="field-hint">
            Do not upload sensitive images, personal data, confidential records, or evidentiary
            material here. Describe what you can share, and a secure method can be agreed later.
          </p>
        </fieldset>
      ) : null}

      {step === 5 ? (
        <fieldset>
          <legend>Commercial context</legend>
          <p>These bands are for qualification. They are not a price or a quotation. All of them are optional.</p>
          <div className="intake-grid">
            <SelectField label="Budget range" value={draft.budget_range} options={SOLUTION_BUDGETS} onChange={(budget_range) => set({ budget_range })} />
            <SelectField label="Preferred currency" value={draft.currency} options={SOLUTION_CURRENCIES} onChange={(currency) => set({ currency })} />
            <SelectField label="Expected start" value={draft.expected_start} options={SOLUTION_STARTS} onChange={(expected_start) => set({ expected_start })} />
            <SelectField
              label="Decision status"
              value={draft.decision_status}
              options={SOLUTION_DECISIONS}
              onChange={(decision_status) => set({ decision_status })}
            />
          </div>
        </fieldset>
      ) : null}

      {step === 6 ? (
        <fieldset>
          <legend>Consent and review</legend>
          <p>
            {draft.contact_name || "You"} at {draft.organization_name || "your organisation"} asked about{" "}
            {draft.services.map((id) => SOLUTION_SERVICES.find((item) => item.id === id)?.title ?? CUSTOM_SERVICE.title).join(", ") ||
              "a solution"}
            .
          </p>
          <label className="choice">
            <input type="checkbox" checked={draft.privacy_ack} onChange={(e) => set({ privacy_ack: e.target.checked })} />
            <span>
              I have read the <a href="/privacy">privacy notice</a> and the <a href="/terms">terms</a>.
            </span>
          </label>
          <label className="choice">
            <input type="checkbox" checked={draft.contact_consent} onChange={(e) => set({ contact_consent: e.target.checked })} />
            <span>Oyokometa may contact me about this request.</span>
          </label>
          <label className="choice">
            <input type="checkbox" checked={draft.marketing_consent} onChange={(e) => set({ marketing_consent: e.target.checked })} />
            <span>Send me occasional product and educational updates. This is separate from replies about this request.</span>
          </label>
        </fieldset>
      ) : null}

      <div className="sr-only" aria-hidden="true">
        <label>
          Leave this blank
          <input tabIndex={-1} autoComplete="off" name="website_confirm" defaultValue="" />
        </label>
      </div>

      {error ? (
        <p role="alert" className="field-hint">
          {error}
        </p>
      ) : null}
      <p className="intake-actions">
        {step > 0 ? (
          <button className="btn btn-secondary" type="button" onClick={() => go(step - 1)}>
            Back
          </button>
        ) : null}
        <button className="btn" type="submit" disabled={pending}>
          {step < STEPS.length - 1 ? "Continue" : pending ? "Submitting" : "Submit request"}
        </button>
      </p>
    </form>
  );
}

function CheckList({
  options,
  selected,
  onChange,
}: {
  options: readonly { id: string; label: string }[];
  selected: string[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="choice-grid">
      {options.map((item) => (
        <label className="choice" key={item.id}>
          <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onChange(item.id)} />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <label>
      {label} <span className="field-hint">Optional</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Not specified</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ConditionalFields({
  selected,
  details,
  onChange,
}: {
  selected: Set<string>;
  details: Details;
  onChange: (key: string, value: string) => void;
}) {
  const show = (id: SolutionServiceId) => selected.has(id);
  return (
    <>
      {show("ai-detection") ? (
        <div className="intake-grid">
          <TextAsk label="Is this a one-time assessment or production screening?" name="screening" details={details} onChange={onChange} />
          <TextAsk label="Do results require human review?" name="human_review" details={details} onChange={onChange} />
          <TextAsk label="Any note on false-positive or false-negative trade-offs?" name="tradeoff" details={details} onChange={onChange} />
        </div>
      ) : null}
      {show("provenance") ? (
        <div className="intake-grid">
          <TextAsk label="Are original files available?" name="originals" details={details} onChange={onChange} />
          <TextAsk label="Do multiple versions exist?" name="versions" details={details} onChange={onChange} />
          <TextAsk label="Do you need a technical report or a workflow assessment?" name="deliverable" details={details} onChange={onChange} />
          <TextAsk label="Is the matter time-sensitive?" name="time_sensitive" details={details} onChange={onChange} />
          <TextAsk
            label="Any evidence-handling constraint? Do not include case evidence."
            name="evidence_handling"
            details={details}
            onChange={onChange}
          />
        </div>
      ) : null}
      {show("claims") ? (
        <div className="intake-grid">
          <TextAsk label="What type of claim or transaction is this?" name="claim_type" details={details} onChange={onChange} />
          <TextAsk label="How are images reviewed today?" name="review_process" details={details} onChange={onChange} />
          <TextAsk label="Is there an existing claims or case system?" name="case_system" details={details} onChange={onChange} />
          <TextAsk label="Is the objective triage, duplicates, documentation, or automation?" name="objective" details={details} onChange={onChange} />
        </div>
      ) : null}
      {show("integration") ? (
        <div className="intake-grid">
          <TextAsk label="Is API documentation available?" name="docs_available" details={details} onChange={onChange} />
          <TextAsk label="What is the existing technology stack, if known?" name="stack" details={details} onChange={onChange} />
          <TextAsk label="Is the solution internal or customer-facing?" name="integration_audience" details={details} onChange={onChange} />
          <TextAsk label="What throughput do you expect?" name="throughput" details={details} onChange={onChange} />
          <TextAsk label="Any authentication or integration requirement?" name="auth_notes" details={details} onChange={onChange} />
          <TextAsk label="Is a test environment available?" name="test_env" details={details} onChange={onChange} />
        </div>
      ) : null}
      {show("advisory") ? (
        <div className="intake-grid">
          <TextAsk label="What outcome do you want?" name="desired_outcome" details={details} onChange={onChange} />
          <TextAsk label="Who is the work for?" name="training_audience" details={details} onChange={onChange} />
          <TextAsk label="Which teams would take part?" name="participants" details={details} onChange={onChange} />
          <TextAsk label="Preferred delivery format" name="delivery_format" details={details} onChange={onChange} />
          <TextAsk label="Is this exploratory, training, or implementation?" name="advisory_mode" details={details} onChange={onChange} />
        </div>
      ) : null}
    </>
  );
}

function TextAsk({
  label,
  name,
  details,
  onChange,
}: {
  label: string;
  name: string;
  details: Details;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <label>
      {label} <span className="field-hint">Optional</span>
      <textarea rows={3} value={details[name] ?? ""} onChange={(event) => onChange(name, event.target.value)} />
    </label>
  );
}
