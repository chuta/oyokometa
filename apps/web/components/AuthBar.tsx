"use client";

import { useEffect, useState } from "react";

type Me = { user: { email: string; role: string } | null };

export function AuthBar() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null }));
  }, []);
  if (!me) return null;
  if (!me.user) {
    return (
      <a href="/sign-in" className="text-sm">
        Sign in
      </a>
    );
  }
  return (
    <span className="text-sm flex gap-3">
      <a href="/account">{me.user.email}</a>
      {me.user.role === "admin" ? <a href="/admin">Admin</a> : null}
    </span>
  );
}
