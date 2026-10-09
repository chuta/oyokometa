"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error?.message ?? "Could not create account");
      return;
    }
    router.replace("/account");
  };

  return (
    <div className="page page-narrow">
      <p className="kicker">Account</p>
      <h1 className="text-4xl mb-3">Create an account</h1>
      <p className="text-muted mb-8">
        Choose a username and password. New accounts start with 10 credits. We will email a confirmation
        link so you can buy more credits and register files.
      </p>
      <form onSubmit={submit} className="space-y-4">
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
        <label className="block">
          Username
          <input
            className="block w-full mt-1"
            type="text"
            required
            minLength={3}
            maxLength={30}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block">
          Password
          <input
            className="block w-full mt-1"
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="block">
          Confirm password
          <input
            className="block w-full mt-1"
            type="password"
            required
            minLength={10}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          Create account
        </button>
      </form>
      <p className="mt-6 text-sm">
        Already registered? <a href="/sign-in">Sign in</a>
      </p>
      {msg ? (
        <p className="mt-4" role="alert">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
