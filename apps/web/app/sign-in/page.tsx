"use client";

import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/v1/auth/magic-link", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error?.message ?? "Could not send link");
      return;
    }
    setMsg("Check your email for a sign-in link. No password is used.");
    if (json.dev_link) setLink(json.dev_link);
  };

  return (
    <div className="page page-narrow">
      <p className="kicker">Account</p>
      <h1 className="text-4xl mb-3">Sign in</h1>
      <p className="text-muted mb-8">Email magic link. No passwords in the MVP.</p>
      <form onSubmit={send} className="space-y-4">
        <label className="block">
          Email
          <input
            className="block w-full mt-1"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <button className="btn" type="submit">
          Email me a link
        </button>
      </form>
      {msg ? <p className="mt-4">{msg}</p> : null}
      {link ? (
        <p className="mt-2 text-sm">
          Development link: <a href={link}>{link}</a>
        </p>
      ) : null}
    </div>
  );
}
