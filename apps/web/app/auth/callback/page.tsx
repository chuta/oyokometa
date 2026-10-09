"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Spinner } from "@/components/ActionStatus";

function Consume() {
  const params = useSearchParams();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setErr("Missing token");
      return;
    }
    fetch("/api/v1/auth/consume", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error?.message ?? "Sign-in failed");
        router.replace("/account");
      })
      .catch((e) => setErr(e.message));
  }, [params, router]);

  if (err) return <p className="page" role="alert">{err}</p>;
  return (
    <p className="page">
      <Spinner label="Confirming your email and signing you in…" />
    </p>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <p>
          <Spinner label="Signing you in…" />
        </p>
      }
    >
      <Consume />
    </Suspense>
  );
}
