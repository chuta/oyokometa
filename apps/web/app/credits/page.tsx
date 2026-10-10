"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  credits: number;
  price_label: string;
};

export default function CreditsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
        if (c && typeof c.balance === "number") setBalance(c.balance);
      });
  }, []);

  const buy = async (product_id: string) => {
    setErr(null);
    const res = await fetch("/api/v1/payments/intents", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error?.message ?? "Could not start payment");
      return;
    }
    router.push(`/credits/pay/${json.payment_id}`);
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
        deposit, usually within one business day.
      </p>
      <ul className="pack-grid">
        {products.map((p) => (
          <li key={p.id} className="pack">
            <p>
              <strong>{p.name}</strong> — {p.credits} credits — {p.price_label}
            </p>
            {signedIn ? (
              <button className="btn mt-3" type="button" onClick={() => buy(p.id)}>
                Pay by bank transfer
              </button>
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
