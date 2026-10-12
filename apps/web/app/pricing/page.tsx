"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  credits: number;
  price_label: string;
  usd_price_label: string | null;
};

export default function PricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    fetch("/api/v1/credits/products")
      .then((r) => r.json())
      .then((j) => setProducts(j.products ?? []));
  }, []);

  return (
    <article className="page">
      <p className="kicker">Pricing</p>
      <h1 className="text-4xl mb-4">Credits, not a paywall on facts</h1>
      <p className="text-muted mb-8 max-w-2xl">
        Quick Scan is free. New accounts start with 10 credits. Deep Analysis and reports spend
        credits.
      </p>
      <ul className="pack-grid mb-10">
        <li className="pack">
          <strong>Quick Scan</strong>
          <p className="text-muted mt-2 mb-0">0 credits</p>
        </li>
        <li className="pack">
          <strong>Deep Analysis</strong>
          <p className="text-muted mt-2 mb-0">Priced in credits on your account</p>
        </li>
        <li className="pack">
          <strong>Report</strong>
          <p className="text-muted mt-2 mb-0">PDF + JSON after Deep Analysis</p>
        </li>
      </ul>
      <h2 className="text-2xl mb-4">Credit packs</h2>
      <ul className="pack-grid">
        {products.map((p) => (
          <li key={p.id} className="pack">
            <strong>{p.name}</strong>
            <p className="mt-2 mb-0">{p.credits} credits</p>
            <p className="text-muted mt-2 mb-0">{p.price_label} by direct bank transfer, free</p>
            {p.usd_price_label ? <p className="text-muted mt-1 mb-0">{p.usd_price_label} online</p> : null}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-muted">
        Direct bank transfer uses the naira price and a unique narration code. There is no fee, and
        credits are added after we confirm the deposit. Online payment uses the US dollar price for
        cards. A bank transfer in that checkout adds a flat 1.5% charge, and credits are added when
        the payment is confirmed. <a href="/credits">Buy credits</a>. <a href="/credits/terms">Credit terms</a>.
      </p>
    </article>
  );
}
