"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  credits: number;
  price_label: string;
};

export default function PricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    fetch("/api/v1/credits/products")
      .then((r) => r.json())
      .then((j) => setProducts(j.products ?? []));
  }, []);

  return (
    <article>
      <h1 className="text-3xl mb-4">Pricing</h1>
      <p className="mb-6">
        Quick Scan is free. Deep Analysis and reports spend credits. Prices come from the server, not
        this page.
      </p>
      <ul className="space-y-4">
        <li>Quick Scan — 0 credits</li>
        <li>Deep Analysis — priced in credits (see your account)</li>
        <li>Report (PDF + JSON) — priced in credits after Deep Analysis</li>
      </ul>
      <h2 className="text-2xl mt-8 mb-3">Credit packs</h2>
      <ul className="space-y-3">
        {products.map((p) => (
          <li key={p.id} className="border border-line p-4 bg-white">
            <strong>{p.name}</strong> — {p.credits} credits — {p.price_label}
          </li>
        ))}
      </ul>
      <p className="mt-6">
        Pay by bank transfer using a unique narration code. <a href="/credits">Buy credits</a>.{" "}
        <a href="/credits/terms">Credit terms</a>.
      </p>
    </article>
  );
}
