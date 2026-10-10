"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BusyLabel } from "@/components/ActionStatus";

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
    setBusy(false);
    if (!res.ok) {
      setErr(json.error?.message ?? "Could not record your transfer");
      return;
    }
    setPay((p) => (p ? { ...p, status: json.status ?? "awaiting_match" } : p));
  };

  if (err && !pay) {
    return (
      <p className="page" role="alert">
        {err}
      </p>
    );
  }
  if (!pay) return <p className="page">Loading payment…</p>;

  return (
    <div className="page page-narrow">
      <h1 className="text-3xl mb-4">Bank transfer</h1>
      <p className="mb-4">
        Transfer <strong>{pay.amount_label}</strong> for <strong>{pay.credits} credits</strong>. Put
        this exact reference in the narration / description:
      </p>
      <p className="mono text-xl border border-line p-4 mb-6">{pay.reference}</p>
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
        <p className="mt-6">This transfer is matched. Credits are on your account.</p>
      ) : pay.status === "awaiting_match" ? (
        <div className="mt-6" role="status">
          <p>
            <strong>We&apos;re checking for your transfer.</strong> Credits are added once the deposit
            is matched to reference <span className="mono">{pay.reference}</span>. We&apos;ll email you
            when that happens.
          </p>
          <button className="btn-secondary btn mt-4" type="button" onClick={() => router.push("/account")}>
            Back to account
          </button>
        </div>
      ) : pay.status === "rejected" ? (
        <p className="mt-6" role="status">
          We could not match a deposit to this reference, so no credits were added. If you did send the
          money, reply to the email we sent with your bank receipt.
        </p>
      ) : (
        <>
          <p className="text-muted text-sm mt-6">
            Credits are added after we match your deposit, usually within one business day.
          </p>
          <button className="btn mt-4" type="button" onClick={confirm} disabled={busy}>
            <BusyLabel busy={busy} idle="I have sent the transfer" working="Saving…" />
          </button>
        </>
      )}
      {err ? (
        <p className="mt-4" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
