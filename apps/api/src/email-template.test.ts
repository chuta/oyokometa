import { describe, expect, it } from "vitest";
import { renderHtml, renderText } from "./email-template.js";

describe("email template", () => {
  it("uses the dark brand chrome and a details table", () => {
    process.env.AUTH_URL = "https://oyokometa.xyz";
    const html = renderHtml({
      to: "a@example.com",
      subject: "Bank transfer",
      kicker: "Credits",
      heading: "Transfer these exact details",
      paragraphs: ["Send the amount with the reference in the narration."],
      details: [{ label: "Reference", value: "OKM-TEST" }],
      ctaLabel: "Open payment",
      ctaUrl: "https://oyokometa.xyz/credits/pay/1",
    });
    expect(html).toContain("#000000");
    expect(html).toContain("#f5a524");
    expect(html).toContain("OKM-TEST");
    expect(html).toContain("https://oyokometa.xyz/oyokometa_logo.png");
    expect(html).toContain("Image history, stated in tiers");
    expect(renderText({
      to: "a@example.com",
      subject: "Bank transfer",
      heading: "Transfer these exact details",
      paragraphs: ["Send the amount."],
      details: [{ label: "Reference", value: "OKM-TEST" }],
      ctaUrl: "https://oyokometa.xyz/credits/pay/1",
    })).toContain("Reference: OKM-TEST");
  });
});
