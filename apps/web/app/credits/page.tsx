"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  credits: number;
  price_label: string;
  usd_price_label: string | null;
};

function waitClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function CreditsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  useEffect(() => {
    fetch("/api/v1/credits/products")
      .then((r) => r.json())
      .then((j) => setProducts(j.products ?? []));
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        setSignedIn(Boolean(j.user));
        if (j.user) {
          return fetch("/api/v1/credits", { credentials: "include" }).then((r) => r.json());
        }
      })
      .then((c) => {
        if (!c || typeof c.balance !== "number") return;
        setBalance(c.balance);
        if (typeof c.transfer_retry_after_seconds === "number" && c.transfer_retry_after_seconds > 0) {
          setRetryUntil(Date.now() + c.transfer_retry_after_seconds * 1000);
          setOpenPaymentId(typeof c.open_payment_id === "string" ? c.open_payment_id : null);
        }
      });
  }, []);

  useEffect(() => {
    if (!retryUntil || retryUntil <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  const remainingMs = retryUntil ? Math.max(0, retryUntil - now) : 0;

  const buy = async (product_id: string) => {
    if (remainingMs > 0 || busyId) return;
    setBusyId(product_id);
    setErr(null);
    const res = await fetch("/api/v1/payments/intents", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id }),
    });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) {
      if (typeof json.retry_after_seconds === "number" && json.retry_after_seconds > 0) {
        setRetryUntil(Date.now() + json.retry_after_seconds * 1000);
        setOpenPaymentId(typeof json.payment_id === "string" ? json.payment_id : null);
        setNow(Date.now());
        return;
      }
      setErr(json.error?.message ?? "Could not start payment");
      return;
    }
    router.push(`/credits/pay/${json.payment_id}`);
  };

  const payOnline = async (product_id: string) => {
    if (busyId) return;
    setBusyId(product_id);
    setErr(null);
    const res = await fetch("/api/v1/payments/bachs/checkouts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id }),
    });
    const json = await res.json();
    if (!res.ok || typeof json.checkout_url !== "string") {
      setBusyId(null);
      setErr(json.error?.message ?? "Could not start online payment");
      return;
    }
    window.location.assign(json.checkout_url);
  };

  return (
    <div className="page">
      <p className="kicker">Account</p>
      <h1 className="text-4xl mb-4">Credits</h1>
      {!signedIn ? (
        <p>
          <a href="/sign-in">Sign in</a> or <a href="/sign-up">create an account</a> to buy credits.
        </p>
      ) : (
        <p className="mb-6">Balance: {balance ?? "…"} credits</p>
      )}
      <p className="text-muted text-sm mb-6">
        Pay by bank transfer with the reference we give you. Credits are added once we match the
        deposit, usually within one business day. Pay online to use a card or a local payment method.
        International cards appear when the checkout is set to pay in US dollars. Those credits are
        added when the payment is confirmed.
      </p>
      {remainingMs > 0 ? (
        <p className="mb-6" role="status">
          You can start another bank transfer in {waitClock(remainingMs)}.
          {openPaymentId ? (
            <>
              {" "}
              <a href={`/credits/pay/${openPaymentId}`}>Open the transfer you started</a>.
            </>
          ) : null}
        </p>
      ) : null}
      <ul className="pack-grid">
        {products.map((p) => (
          <li key={p.id} className="pack">
            <p>
              <strong>{p.name}</strong> — {p.credits} credits — {p.price_label}
              {p.usd_price_label ? ` · ${p.usd_price_label} online` : ""}
            </p>
            {signedIn ? (
              <div className="pack-actions">
                <button className="btn" type="button" onClick={() => buy(p.id)} disabled={remainingMs > 0 || busyId !== null}>
                  Pay by bank transfer
                </button>
                {p.usd_price_label ? (
                  <button
                    className="btn-secondary btn"
                    type="button"
                    onClick={() => payOnline(p.id)}
                    disabled={busyId !== null}
                  >
                    Pay online · {p.usd_price_label}
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {err ? (
        <p className="mt-4" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
