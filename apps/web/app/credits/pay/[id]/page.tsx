"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BusyLabel } from "@/components/ActionStatus";

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = value;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" className="btn-secondary btn copy-btn" onClick={copy} aria-label={`Copy ${label}`}>
      {copied ? "Copied" : "Copy"}
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </button>
  );
}

type Pay = {
  payment_id: string;
  provider?: string;
  status: string;
  reference: string;
  credits: number;
  amount_label: string;
  checkout_url?: string | null;
  bank: {
    bank_name: string;
    account_name: string;
    account_number: string;
    currency: string;
  } | null;
};

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const [pay, setPay] = useState<Pay | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let stop = false;
    const load = () => {
      fetch(`/api/v1/payments/${id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((j) => {
          if (stop) return;
          if (j.error) setErr(j.error.message);
          else setPay(j);
        });
    };
    load();
    return () => {
      stop = true;
    };
  }, [id]);

  useEffect(() => {
    if (!pay) return;
    const waiting =
      pay.status === "checkout_open" || pay.status === "awaiting_transfer" || pay.status === "awaiting_match";
    if (!waiting) return;
    const timer = window.setInterval(() => {
      fetch(`/api/v1/payments/${id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((j) => {
          if (!j.error) setPay(j);
        });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [id, pay?.status]);

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

  if (pay.provider === "bachs") {
    return (
      <div className="page page-narrow">
        <h1 className="text-3xl mb-4">Online payment</h1>
        <p className="mb-4">
          <strong>{pay.amount_label}</strong> for <strong>{pay.credits} credits</strong>.
        </p>
        {pay.status === "paid" ? (
          <p className="mt-6" role="status">
            Payment confirmed. Credits are on your account.
          </p>
        ) : pay.status === "expired" ? (
          <p className="mt-6" role="status">
            This checkout expired before payment. You can start again from the credits page.
          </p>
        ) : pay.status === "reversed" ? (
          <p className="mt-6" role="status">
            This payment was reversed, and the credits were removed.
          </p>
        ) : pay.status === "rejected" ? (
          <p className="mt-6" role="status">
            Online payment could not be started. No credits were added.
          </p>
        ) : (
          <div className="mt-6" role="status">
            <p>Credits are added after Bachs confirms the payment. You can leave this page.</p>
            {pay.checkout_url ? (
              <a className="btn mt-4" href={pay.checkout_url}>
                Continue to checkout
              </a>
            ) : (
              <p className="mt-4">Waiting for confirmation…</p>
            )}
          </div>
        )}
        <p className="mt-6">
          <a href="/credits">Back to credits</a>
        </p>
        {err ? (
          <p className="mt-4" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    );
  }

  const bank = pay.bank;

  return (
    <div className="page page-narrow">
      <h1 className="text-3xl mb-4">Bank transfer</h1>
      <p className="mb-4">
        Transfer <strong>{pay.amount_label}</strong> for <strong>{pay.credits} credits</strong>. Put
        this exact reference in the narration / description:
      </p>
      <div className="copy-field copy-field-ref">
        <div>
          <p className="text-muted text-sm">Narration / description</p>
          <p className="mono text-xl">{pay.reference}</p>
        </div>
        <CopyButton value={pay.reference} label="narration" />
      </div>
      <dl className="space-y-2">
        <div>
          <dt className="text-muted text-sm">Bank</dt>
          <dd>{bank?.bank_name || "Set BANK_NAME in environment"}</dd>
        </div>
        <div className="copy-field">
          <div>
            <dt className="text-muted text-sm">Account name</dt>
            <dd>{bank?.account_name || "Set BANK_ACCOUNT_NAME"}</dd>
          </div>
          {bank?.account_name ? <CopyButton value={bank.account_name} label="account name" /> : null}
        </div>
        <div className="copy-field">
          <div>
            <dt className="text-muted text-sm">Account number</dt>
            <dd className="mono">{bank?.account_number || "Set BANK_ACCOUNT_NUMBER"}</dd>
          </div>
          {bank?.account_number ? (
            <CopyButton value={bank.account_number} label="account number" />
          ) : null}
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
            Credits are added after we match your deposit, usually within a few minutes.
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
