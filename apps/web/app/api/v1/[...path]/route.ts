const API = process.env.API_PUBLIC_URL ?? "http://localhost:4000";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${API}/api/v1/${path.join("/")}${url.search}`;
  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  const contentType = req.headers.get("content-type");
  const idem = req.headers.get("idempotency-key");
  if (cookie) headers.set("cookie", cookie);
  if (contentType) headers.set("content-type", contentType);
  if (idem) headers.set("idempotency-key", idem);
  headers.set("x-forwarded-for", req.headers.get("x-forwarded-for") ?? "127.0.0.1");

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Buffer.from(await req.arrayBuffer());
  }
  const res = await fetch(target, init);
  const out = new Headers();
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) out.append("set-cookie", c);
  const ct = res.headers.get("content-type");
  if (ct) out.set("content-type", ct);
  out.set("x-content-type-options", "nosniff");
  if (res.headers.get("content-disposition")) {
    out.set("content-disposition", res.headers.get("content-disposition")!);
  }
  return new Response(res.body, { status: res.status, headers: out });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
