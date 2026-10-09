export function Spinner({ label }: { label?: string }) {
  return (
    <span className="status-inline">
      <span className="spinner" aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="sr-only">Working</span>}
    </span>
  );
}

export function ProgressTrack({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  const pct = value == null ? null : Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="progress-block" role="status" aria-live="polite">
      <p className="progress-label">
        <Spinner label={pct == null ? label : `${label} ${pct}%`} />
      </p>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
        aria-label={label}
      >
        <span className={pct == null ? "progress-indet" : undefined} style={pct == null ? undefined : { width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BusyLabel({ busy, idle, working }: { busy: boolean; idle: string; working: string }) {
  if (!busy) return <>{idle}</>;
  return <Spinner label={working} />;
}
