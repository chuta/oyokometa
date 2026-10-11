"use client";

import { useEffect, useState } from "react";
import { BusyLabel, Spinner } from "@/components/ActionStatus";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";

type BillingFields = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type MeUser = {
  email: string;
  username: string | null;
  emailVerified?: boolean;
  hasPassword?: boolean;
  name?: string | null;
  phone_number?: string | null;
  billing_address?: Partial<BillingFields> | null;
};

const emptyBilling = (): BillingFields => ({
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
});

function billingFields(value: Partial<BillingFields> | null | undefined): BillingFields {
  return {
    line1: value?.line1 ?? "",
    line2: value?.line2 ?? "",
    city: value?.city ?? "",
    state: value?.state ?? "",
    postal_code: value?.postal_code ?? "",
    country: value?.country ?? "",
  };
}

export default function AccountPage() {
  const [me, setMe] = useState<{ user: MeUser | null } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [records, setRecords] = useState<Array<{ public_id: string; status: string; created_at: string }>>([]);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [billing, setBilling] = useState<BillingFields>(emptyBilling);
  const [billMsg, setBillMsg] = useState<string | null>(null);
  const [billBusy, setBillBusy] = useState(false);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        setMe(j);
        if (j.user) {
          setName(j.user.name ?? "");
          setPhone(j.user.phone_number ?? "");
          setBilling(billingFields(j.user.billing_address));
          return Promise.all([
            fetch("/api/v1/credits", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/v1/provenance", { credentials: "include" }).then((r) => r.json()),
          ]);
        }
        return null;
      })
      .then((pair) => {
        if (!pair) return;
        const [c, rec] = pair;
        if (c && typeof c.balance === "number") setBalance(c.balance);
        if (rec?.records) setRecords(rec.records);
      });
  }, []);

  useEffect(() => {
    const paymentId = new URLSearchParams(window.location.search).get("payment");
    if (!paymentId) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const res = await fetch(`/api/v1/payments/${paymentId}`, { credentials: "include" });
      const json = await res.json();
      if (stop || json.error) return;
      if (json.status === "paid") {
        stop = true;
        const credits = await fetch("/api/v1/credits", { credentials: "include" }).then((r) => r.json());
        if (typeof credits.balance === "number") setBalance(credits.balance);
        setPaymentNote(`Payment successful. ${json.credits} credits are on your account.`);
        window.history.replaceState(null, "", "/account");
        return;
      }
      if (json.status === "checkout_open") {
        setPaymentNote("Payment successful. Updating your credit balance.");
      }
    };
    tick();
    const timer = window.setInterval(tick, 2000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!me) {
    return (
      <p className="page">
        <Spinner label="Loading account…" />
      </p>
    );
  }
  if (!me.user) {
    return (
      <div className="page">
        <h1 className="text-3xl mb-4">Account</h1>
        <p>
          <a href="/sign-in">Sign in</a> or <a href="/sign-up">create an account</a> to keep analyses, buy credits, and
          generate reports.
        </p>
      </div>
    );
  }

  const logout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };
  const everywhere = async () => {
    await fetch("/api/v1/auth/sign-out-everywhere", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  const setAddress = (key: keyof BillingFields, value: string) => {
    setBilling((prev) => ({ ...prev, [key]: value }));
  };

  const saveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setBillMsg(null);
    setBillBusy(true);
    try {
      const res = await fetch("/api/v1/account/profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone_number: phone, billing_address: billing }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBillMsg(json.error?.message ?? "Could not save billing details");
        return;
      }
      setName(json.user?.name ?? "");
      setPhone(json.user?.phone_number ?? "");
      setBilling(billingFields(json.user?.billing_address));
      setBillMsg(
        json.synced
          ? "Saved. Online checkout will use these details."
          : "Saved on your account. Online checkout will send them with the next payment.",
      );
    } finally {
      setBillBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwBusy(true);
    try {
      const res = await fetch("/api/v1/auth/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPwMsg(json.error?.message ?? "Could not update password");
        return;
      }
      setCurrent("");
      setNext("");
      setPwMsg("Password saved.");
      setMe((prev) => (prev?.user ? { ...prev, user: { ...prev.user, hasPassword: true } } : prev));
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="page account-page">
      <header className="account-heading">
        <h1>Account</h1>
      </header>
      <div className="account-grid">
        <aside className="account-side">
          {me.user.username ? <p className="account-handle">@{me.user.username}</p> : null}
          <p className="account-email">{me.user.email}</p>
          {me.user.emailVerified === false ? (
            <p className="account-note text-muted">Confirm your email before buying credits or registering a file.</p>
          ) : null}
          <dl className="account-balance">
            <dt>Credit balance</dt>
            <dd>{balance ?? "…"}</dd>
          </dl>
          {paymentNote ? (
            <p className="account-note" role="status">
              {paymentNote}
            </p>
          ) : null}
          {records.length ? (
            <div className="account-records">
              <h2>Records</h2>
              <ul className="record-list">
                {records.map((r) => (
                  <li key={r.public_id}>
                    <a href={`/verify/${r.public_id}`}>{r.public_id}</a> · {r.status} ·{" "}
                    {String(r.created_at).slice(0, 10)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="account-actions">
            <a className="btn" href="/create">
              Create a record
            </a>
            <a className="btn-secondary btn" href="/account/reports">
              Reports
            </a>
            <a className="btn-secondary btn" href="/credits">
              Buy credits
            </a>
            <button className="btn-secondary btn" type="button" onClick={logout}>
              Sign out
            </button>
            <button className="btn-secondary btn" type="button" onClick={everywhere}>
              Sign out everywhere
            </button>
          </div>
        </aside>

        <div className="account-main">
          <form onSubmit={saveBilling} className="account-panel">
            <h2>Billing details</h2>
            <p className="text-sm text-muted">
              Name, phone and billing address are sent with online payments. Email stays the address on this account.
            </p>
            <div className="account-fields">
              <label className="block">
                Name
                <input
                  className="block w-full mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={511}
                  disabled={billBusy}
                />
              </label>
              <label className="block">
                Phone
                <input
                  className="block w-full mt-1"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+2348012345678"
                  disabled={billBusy}
                />
              </label>
              <label className="block">
                Street address
                <input
                  className="block w-full mt-1"
                  value={billing.line1}
                  onChange={(e) => setAddress("line1", e.target.value)}
                  autoComplete="address-line1"
                  maxLength={255}
                  disabled={billBusy}
                />
              </label>
              <label className="block">
                Address line 2
                <input
                  className="block w-full mt-1"
                  value={billing.line2}
                  onChange={(e) => setAddress("line2", e.target.value)}
                  autoComplete="address-line2"
                  maxLength={255}
                  disabled={billBusy}
                />
              </label>
              <div className="account-pair">
                <label className="block">
                  City
                  <input
                    className="block w-full mt-1"
                    value={billing.city}
                    onChange={(e) => setAddress("city", e.target.value)}
                    autoComplete="address-level2"
                    maxLength={128}
                    disabled={billBusy}
                  />
                </label>
                <label className="block">
                  State
                  <input
                    className="block w-full mt-1"
                    value={billing.state}
                    onChange={(e) => setAddress("state", e.target.value)}
                    autoComplete="address-level1"
                    maxLength={128}
                    disabled={billBusy}
                  />
                </label>
              </div>
              <div className="account-pair">
                <label className="block">
                  Postal code
                  <input
                    className="block w-full mt-1"
                    value={billing.postal_code}
                    onChange={(e) => setAddress("postal_code", e.target.value)}
                    autoComplete="postal-code"
                    maxLength={32}
                    disabled={billBusy}
                  />
                </label>
                <label className="block">
                  Country
                  <input
                    className="block w-full mt-1"
                    value={billing.country}
                    onChange={(e) => setAddress("country", e.target.value.toUpperCase())}
                    autoComplete="country"
                    maxLength={2}
                    placeholder="NG"
                    disabled={billBusy}
                  />
                </label>
              </div>
              <p className="text-sm text-muted">Two-letter country code, for example NG.</p>
              <button className="btn" type="submit" disabled={billBusy}>
                <BusyLabel busy={billBusy} idle="Save billing details" working="Saving…" />
              </button>
              {billMsg ? <p role="status">{billMsg}</p> : null}
            </div>
          </form>

          {me.user.hasPassword !== false ? (
            <details className="account-panel">
              <summary>Change password</summary>
              <form onSubmit={savePassword} className="account-fields">
                <label className="block">
                  Current password
                  <input
                    className="block w-full mt-1"
                    type="password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    autoComplete="current-password"
                    disabled={pwBusy}
                  />
                </label>
                <label className="block">
                  New password
                  <input
                    className="block w-full mt-1"
                    type="password"
                    required
                    minLength={10}
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    autoComplete="new-password"
                    disabled={pwBusy}
                  />
                </label>
                <button className="btn" type="submit" disabled={pwBusy}>
                  <BusyLabel busy={pwBusy} idle="Save password" working="Saving…" />
                </button>
                {pwMsg ? <p role="status">{pwMsg}</p> : null}
              </form>
            </details>
          ) : (
            <form onSubmit={savePassword} className="account-panel">
              <h2>Set a password</h2>
              <p className="text-sm text-muted">
                You signed in with a link. Add a password if you want to use username or email next time.
              </p>
              <div className="account-fields">
                <label className="block">
                  Password
                  <input
                    className="block w-full mt-1"
                    type="password"
                    required
                    minLength={10}
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    autoComplete="new-password"
                    disabled={pwBusy}
                  />
                </label>
                <button className="btn" type="submit" disabled={pwBusy}>
                  <BusyLabel busy={pwBusy} idle="Save password" working="Saving…" />
                </button>
                {pwMsg ? <p role="status">{pwMsg}</p> : null}
              </div>
            </form>
          )}

          <details className="account-panel">
            <summary>Delete account</summary>
            <div className="mt-2">
              <DeleteAccountForm hasPassword={me.user.hasPassword !== false} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
