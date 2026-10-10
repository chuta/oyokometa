"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ActionStatus";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";

function DeleteAccount() {
  const token = useSearchParams().get("token") ?? "";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setSignedIn(Boolean(j.user)));
  }, []);

  return (
    <div className="page page-narrow">
      <p className="kicker">Account</p>
      <h1 className="text-4xl mb-4">Delete your account</h1>
      {signedIn === null ? (
        <Spinner label="Loading…" />
      ) : !signedIn ? (
        <p>
          <a href="/sign-in">Sign in</a> on this device first, then open the link from your email again.
        </p>
      ) : !token ? (
        <p role="alert">This confirmation link is missing its token. Start again from your account page.</p>
      ) : (
        <DeleteAccountForm token={token} hasPassword={false} />
      )}
    </div>
  );
}

export default function DeleteAccountPage() {
  return (
    <Suspense fallback={<p className="page">Loading…</p>}>
      <DeleteAccount />
    </Suspense>
  );
}
