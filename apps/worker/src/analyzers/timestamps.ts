import type { TimelineEvent } from "@oyokometa/evidence";

export const TIMESTAMP_PRODUCER = "timestamp-worker@1.0.0";

export function buildTimeline(
  stamps: { field: string; value: string; offset?: string }[],
  acquisitionUtc: string,
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      field: "acquisition_time",
      value: acquisitionUtc,
      zone: "utc",
      tier: "detected",
    },
  ];

  const parsed: { field: string; date: Date | null; raw: string; offset?: string }[] = [];

  for (const s of stamps) {
    const date = parseLoose(s.value);
    const zone = s.offset ? "offset" : "local_unrecorded";
    events.push({
      field: s.field,
      value: zone === "local_unrecorded" ? `${s.value} (local time, zone not recorded)` : s.value,
      zone,
      tier: "detected",
      anomaly: anomaly(s.value, date),
    });
    parsed.push({ field: s.field, date, raw: s.value, offset: s.offset });
  }

  const created = parsed.find((p) => /create|original/i.test(p.field))?.date;
  const modified = parsed.find((p) => /modify/i.test(p.field))?.date;
  if (created && modified && modified < created) {
    events.push({
      field: "order",
      value: "modified before created",
      zone: "unknown",
      tier: "inferred",
      anomaly: "impossible ordering",
    });
  }
  return events;
}

function parseLoose(v: string): Date | null {
  const iso = v.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function anomaly(raw: string, date: Date | null): string | undefined {
  if (/1970-01-01|1970:01:01|2000-01-01|2000:01:01/.test(raw)) return "default date";
  if (date && date.getTime() > Date.now() + 24 * 3600 * 1000) return "future date";
  return undefined;
}
