import { describe, expect, it } from "vitest";
import { lookupPlace, placeLabelFromAddress, reverseZoom } from "./reverse-geocode.js";

describe("placeLabelFromAddress", () => {
  it("names the village, town, state, and country, and leaves out a house number", () => {
    expect(
      placeLabelFromAddress(
        {
          village: "Igbe Ewoliwo",
          city: "Ikorodu",
          state: "Lagos State",
          country: "Nigeria",
          house_number: "12",
          road: "A side street",
        },
        282,
      ),
    ).toBe("Igbe Ewoliwo, Ikorodu, Lagos State, Nigeria");
  });

  it("adds the road only when the reading is tight", () => {
    const address = { road: "Ijede Road", suburb: "Igbogbo", city: "Ikorodu", country: "Nigeria" };
    expect(placeLabelFromAddress(address, 40)).toBe("Ijede Road, Igbogbo, Ikorodu, Nigeria");
    expect(placeLabelFromAddress(address, 282)).toBe("Igbogbo, Ikorodu, Nigeria");
  });

  it("drops a repeated town name", () => {
    expect(placeLabelFromAddress({ city: "Ikorodu", county: "Ikorodu", state: "Lagos State", country: "Nigeria" }, 900)).toBe(
      "Ikorodu, Lagos State, Nigeria",
    );
  });
});

describe("reverseZoom", () => {
  it("stays at area level for a few-hundred-metre reading", () => {
    expect(reverseZoom(282)).toBe(14);
    expect(reverseZoom(40)).toBe(16);
    expect(reverseZoom(1200)).toBe(12);
  });
});

describe("lookupPlace", () => {
  it("reads the address and does not call out again for the same point", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          address: { village: "Igbe Ewoliwo", city: "Ikorodu", state: "Lagos State", country: "Nigeria" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    const first = await lookupPlace(6.57685, 3.56183, 282, fetchImpl);
    const second = await lookupPlace(6.57685, 3.56183, 282, fetchImpl);
    expect(first).toBe("Igbe Ewoliwo, Ikorodu, Lagos State, Nigeria");
    expect(second).toBe(first);
    expect(calls).toBe(1);
  });

  it("returns null when the lookup fails", async () => {
    const label = await lookupPlace(6.2, 3.2, 100, async () => {
      throw new Error("offline");
    });
    expect(label).toBeNull();
  });
});
