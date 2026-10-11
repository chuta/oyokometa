"use client";

import { useEffect, useState } from "react";

type Me = { user: { role: string } | null };

export function AuthBar() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null }));
  }, []);
  if (!me) return <span className="auth-slot" aria-hidden="true" />;
  if (!me.user) {
    return (
      <span className="auth-user">
        <a href="/sign-up" className="btn btn-ghost btn-compact">
          Sign up
        </a>
        <a href="/sign-in" className="btn btn-ghost btn-compact">
          Sign in
        </a>
      </span>
    );
  }
  if (me.user.role !== "admin") return null;
  return (
    <span className="auth-user">
      <a href="/admin" className="btn btn-ghost btn-compact">
        Admin
      </a>
    </span>
  );
}
