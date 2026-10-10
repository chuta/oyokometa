"use client";

import { useEffect, useState } from "react";
import { BusyLabel, Spinner } from "./ActionStatus";

export type ChargeAction = "deep_analysis" | "report" | "provenance_registration";

const LABELS: Record<ChargeAction, string> = {
  deep_analysis: "Deep Analysis",
  report: "Signed report (PDF and JSON)",
  provenance_registration: "Provenance registration",
};

type Quote = { cost: number; balance: number };

export async function fetchQuote(action: ChargeAction): Promise<Quote> {
  const [prices, wallet] = await Promise.all([
    fetch("/api/v1/credits/actions").then((r) => r.json()),
    fetch("/api/v1/credits", { credentials: "include" }).then((r) => r.json()),
  ]);
  return {
    cost: Number(prices.actions?.[action] ?? 0),
    balance: typeof wallet.balance === "number" ? wallet.balance : 0,
  };
}

/** Shows price, current balance and balance after, and only proceeds on an explicit confirm. */
export function ChargeConfirm({
  action,
  busy = false,
  confirmLabel = "Confirm and spend credits",
  onConfirm,
  onCancel,
}: {
  action: ChargeAction;
  busy?: boolean;
  confirmLabel?: string;
  onConfirm: (cost: number) => void;
  onCancel: () => void;
}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchQuote(action)
      .then((q) => live && setQuote(q))
      .catch(() => live && setErr("Could not load the price. Try again."));
    return () => {
      live = false;
    };
  }, [action]);

  if (err) {
    return (
      <div className="charge-confirm" role="alert">
        <p>{err}</p>
        <button className="btn-secondary btn mt-3" type="button" onClick={onCancel}>
          Close
        </button>
      </div>
    );
  }
  if (!quote) {
    return (
      <div className="charge-confirm">
        <Spinner label="Loading price" />
      </div>
    );
  }
  const after = quote.balance - quote.cost;
  const short = after < 0;
  return (
    <div className="charge-confirm" role="group" aria-label={`Confirm ${LABELS[action]}`}>
      <p className="font-medium">{LABELS[action]}</p>
      <dl className="charge-lines">
        <dt>Price</dt>
        <dd>{quote.cost} credits</dd>
        <dt>Your balance</dt>
        <dd>{quote.balance} credits</dd>
        <dt>Balance after</dt>
        <dd>{short ? "Not enough credits" : `${after} credits`}</dd>
      </dl>
      {short ? (
        <p className="mt-3">
          <a href="/credits">Buy credits</a> to continue.
        </p>
      ) : null}
      <div className="mt-4">
        <button
          className="btn"
          type="button"
          disabled={busy || short}
          onClick={() => onConfirm(quote.cost)}
        >
          <BusyLabel busy={busy} idle={confirmLabel} working="Working…" />
        </button>
        <button className="btn-secondary btn ml-2" type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
