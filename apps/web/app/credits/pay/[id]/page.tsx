"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Pay = {
  payment_id: string;
  status: string;
  reference: string;
  credits: number;
  amount_label: string;
  bank: {
    bank_name: string;
    account_name: string;
    account_number: string;
    currency: string;
  };
};

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const [pay, setPay] = useState<Pay | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/v1/payments/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error.message);
        else setPay(j);
      });
  }, [id]);

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/v1/payments/${id}/confirm`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error?.message ?? "Could not confirm");
      setBusy(false);
      return;
    }
    router.push("/account");
  };

  if (err && !pay) return <p role="alert">{err}</p>;
  if (!pay) return <p>Loading payment…</p>;

  return (
    <div>
      <h1 className="text-3xl mb-4">Bank transfer</h1>
      <p className="mb-4">
        Transfer <strong>{pay.amount_label}</strong> for <strong>{pay.credits} credits</strong>. Put
        this exact reference in the narration / description:
      </p>
      <p className="mono text-xl border border-line p-4 bg-white mb-6">{pay.reference}</p>
      <dl className="space-y-2">
        <div>
          <dt className="text-muted text-sm">Bank</dt>
          <dd>{pay.bank.bank_name || "Set BANK_NAME in environment"}</dd>
        </div>
        <div>
          <dt className="text-muted text-sm">Account name</dt>
          <dd>{pay.bank.account_name || "Set BANK_ACCOUNT_NAME"}</dd>
        </div>
        <div>
          <dt className="text-muted text-sm">Account number</dt>
          <dd className="mono">{pay.bank.account_number || "Set BANK_ACCOUNT_NUMBER"}</dd>
        </div>
      </dl>
      {pay.status === "paid" ? (
        <p className="mt-6">This transfer is already matched. Credits are on your account.</p>
      ) : (
        <button className="btn mt-8" type="button" onClick={confirm} disabled={busy}>
          I have paid
        </button>
      )}
      {err ? (
        <p className="mt-4" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
