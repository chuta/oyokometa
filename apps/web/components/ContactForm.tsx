"use client";

import { useRef, useState } from "react";

type Result = { reference: string; email_sent: boolean };

export function ContactForm() {
  const idempotencyKey = useRef(crypto.randomUUID());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (form: HTMLFormElement) => {
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Write a short message, at least a sentence.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotency_key: idempotencyKey.current,
          name,
          email,
          message,
          website_confirm: String(new FormData(form).get("website_confirm") ?? ""),
        }),
      });
      const data = (await res.json()) as { reference?: string; email_sent?: boolean; error?: { message?: string } };
      if (!res.ok || !data.reference) {
        setError(data.error?.message ?? "The message could not be sent. Try again.");
        return;
      }
      setResult({ reference: data.reference, email_sent: data.email_sent === true });
    } catch {
      setError("The message could not be sent. Try again.");
    } finally {
      setPending(false);
    }
  };

  if (result) {
    return (
      <div>
        <h2>Message received.</h2>
        <p>
          Reference <span className="mono">{result.reference}</span>.
          {result.email_sent ? " A confirmation was sent to your email." : " We saved your message."}
        </p>
      </div>
    );
  }

  return (
    <form
      className="intake"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}
    >
      <div className="intake-grid">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" maxLength={120} />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            maxLength={200}
          />
        </label>
      </div>
      <label>
        Message
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={6} maxLength={2000} />
      </label>
      <div className="sr-only" aria-hidden="true">
        <label>
          Leave this blank
          <input tabIndex={-1} autoComplete="off" name="website_confirm" defaultValue="" />
        </label>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <p>We read every note. This form is for feedback, not a service request.</p>
      )}
      <p className="intake-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Sending" : "Send message"}
        </button>
      </p>
    </form>
  );
}
