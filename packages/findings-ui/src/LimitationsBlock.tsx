import { LIMITATIONS_BLOCK, LEGAL_DISCLAIMER, ACQUISITION_STATEMENT } from "@oyokometa/config";

export function LimitationsBlock({ extra }: { extra?: string }) {
  return (
    <section className="limitations" aria-label="Limitations">
      <h2>Limitations</h2>
      <p>{LIMITATIONS_BLOCK}</p>
      <p>{LEGAL_DISCLAIMER}</p>
      <p>{ACQUISITION_STATEMENT}</p>
      {extra ? <p>{extra}</p> : null}
    </section>
  );
}
