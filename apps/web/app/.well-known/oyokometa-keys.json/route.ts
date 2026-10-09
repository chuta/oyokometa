const API = process.env.API_PUBLIC_URL ?? "http://localhost:4000";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(`${API}/.well-known/oyokometa-keys.json`, { cache: "no-store" });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
    },
  });
}
