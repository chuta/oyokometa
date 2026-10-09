"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConfirmInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [msg, setMsg] = useState("Confirming…");

  useEffect(() => {
    if (!token) {
      setMsg("Missing token");
      return;
    }
    fetch("/api/v1/disputes/confirm", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((j) => setMsg(j.message ?? j.error?.message ?? "Done"))
      .catch(() => setMsg("Could not confirm"));
  }, [token]);

  return (
    <div className="page page-narrow">
      <h1 className="text-3xl mb-4">Dispute confirmation</h1>
      <p>{msg}</p>
    </div>
  );
}

export default function DisputeConfirmPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ConfirmInner />
    </Suspense>
  );
}
