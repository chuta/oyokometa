const LOCAL = ["suburb", "neighbourhood", "quarter", "city_district", "village", "hamlet"] as const;
const TOWN = ["town", "city", "municipality"] as const;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new Map<string, { label: string | null; at: number; ttl: number }>();

/** Neighbourhood when the reading is tight, town when it is only a few hundred metres. */
export function reverseZoom(accuracyM: number | null) {
  if (accuracyM == null) return 14;
  if (accuracyM <= 80) return 16;
  if (accuracyM <= 400) return 14;
  return 12;
}

function text(address: Record<string, unknown>, key: string) {
  const value = address[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * A short area name from a reverse-geocode address. A house number is never included.
 * A road is included only when the device reading is tighter than 80 m.
 */
export function placeLabelFromAddress(address: Record<string, unknown> | null | undefined, accuracyM: number | null) {
  if (!address) return null;
  const parts: string[] = [];
  const push = (value: string) => {
    if (!value) return;
    if (parts.some((part) => part.toLowerCase() === value.toLowerCase())) return;
    parts.push(value);
  };
  if (accuracyM != null && accuracyM <= 80) push(text(address, "road"));
  for (const key of LOCAL) {
    const value = text(address, key);
    if (value) {
      push(value);
      break;
    }
  }
  for (const key of TOWN) {
    const value = text(address, key);
    if (value) {
      push(value);
      break;
    }
  }
  push(text(address, "county"));
  push(text(address, "state"));
  push(text(address, "country"));
  if (!parts.length) return null;
  return parts.join(", ");
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Names the area around a device-reported point. A failure leaves the coordinates unchanged. */
export async function lookupPlace(
  latitude: number,
  longitude: number,
  accuracyM: number | null,
  fetchImpl: FetchLike = fetch,
) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const zoom = reverseZoom(accuracyM);
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)},${zoom}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.label;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", String(zoom));
  let label: string | null = null;
  try {
    const res = await fetchImpl(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "Oyokometa/0.1 (https://oyokometa.xyz; capture-place)",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const body = (await res.json()) as { address?: Record<string, unknown> };
      label = placeLabelFromAddress(body.address, accuracyM);
    }
  } catch {
    label = null;
  }
  cache.set(key, { label, at: Date.now(), ttl: label ? CACHE_TTL_MS : 5 * 60 * 1000 });
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return label;
}
