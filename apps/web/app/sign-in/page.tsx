"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BusyLabel } from "@/components/ActionStatus";

export default function SignInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"password" | "link">("password");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error?.message ?? "Could not sign in");
        return;
      }
      router.replace("/account");
    } catch {
      setMsg("Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
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
      setMsg("Check your email for a sign-in link.");
      if (json.dev_link) setLink(json.dev_link);
    } catch {
      setMsg("Could not send link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-narrow">
      <p className="kicker">Account</p>
      <h1 className="text-4xl mb-3">Sign in</h1>
      <p className="text-muted mb-8">Use your username or email, and a password. A magic link is also available.</p>

      {mode === "password" ? (
        <form onSubmit={login} className="space-y-4">
          <label className="block">
            Username or email
            <input
              className="block w-full mt-1"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              disabled={busy}
            />
          </label>
          <label className="block">
            Password
            <input
              className="block w-full mt-1"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
            />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            <BusyLabel busy={busy} idle="Sign in" working="Signing in…" />
          </button>
        </form>
      ) : (
        <form onSubmit={sendLink} className="space-y-4">
          <label className="block">
            Email
            <input
              className="block w-full mt-1"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
            />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            <BusyLabel busy={busy} idle="Email me a link" working="Sending link…" />
          </button>
        </form>
      )}

      <p className="mt-6 text-sm">
        <button
          className="btn-ghost btn btn-compact"
          type="button"
          onClick={() => {
            setMode(mode === "password" ? "link" : "password");
            setMsg(null);
          }}
        >
          {mode === "password" ? "Use a magic link instead" : "Use username or password"}
        </button>
      </p>
      <p className="mt-4 text-sm">
        <a href="/forgot-password">Forgot password</a>
        {" · "}
        <a href="/sign-up">Create an account</a>
      </p>
      {msg ? <p className="mt-4">{msg}</p> : null}
      {link ? (
        <p className="mt-2 text-sm">
          Development link: <a href={link}>{link}</a>
        </p>
      ) : null}
    </div>
  );
}
