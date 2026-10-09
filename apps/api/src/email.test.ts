import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { sendMagicLink, sendTransactional } from "./email.js";

beforeEach(() => {
  send.mockReset();
  delete process.env.RESEND_API_KEY;
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  send.mockReset();
  delete process.env.RESEND_API_KEY;
  process.env.NODE_ENV = "test";
});

describe("email", () => {
  it("logs in non-production when Resend is unset", async () => {
    process.env.NODE_ENV = "development";
    const out = await sendTransactional({
      to: "a@example.com",
      subject: "Hello",
      heading: "Hello",
      paragraphs: ["Body"],
      ctaUrl: "https://oyokometa.xyz/x",
    });
    expect(out.sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends through Resend when a key is set", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Oyokometa <noreply@example.com>";
    send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
    const out = await sendMagicLink("a@example.com", "https://oyokometa.xyz/auth/callback?token=abc");
    expect(out.sent).toBe(true);
    expect(send).toHaveBeenCalledOnce();
    const payload = send.mock.calls[0]?.[0] as {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(payload.from).toContain("noreply@example.com");
    expect(payload.to).toBe("a@example.com");
    expect(payload.subject).toBe("Sign in to Oyokometa");
    expect(payload.text).toContain("https://oyokometa.xyz/auth/callback?token=abc");
    expect(payload.html).toContain("Sign in to continue");
    expect(payload.html).toContain("#f5a524");
    expect(payload.html).toContain("oyokometa_logo.png");
  });
});
