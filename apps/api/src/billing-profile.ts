const PHONE = /^\+[1-9]\d{7,14}$/;

/** ISO 3166-1 alpha-2 codes Bachs accepts as a billing country. UK is not one of them; the code is GB. */
const COUNTRIES = new Set(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  ),
);

export type BillingAddress = {
  line1: string;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
};

export type BillingProfile = {
  name: string | null;
  phone: string | null;
  billing: BillingAddress | null;
};

type StoredBilling = {
  billingLine1: string | null;
  billingLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
};

export function billingAddressFromUser(user: StoredBilling): BillingAddress | null {
  if (!user.billingLine1 || !user.billingCountry) return null;
  return {
    line1: user.billingLine1,
    line2: user.billingLine2,
    city: user.billingCity,
    state: user.billingState,
    postal_code: user.billingPostalCode,
    country: user.billingCountry,
  };
}

export function parseBillingProfile(body: unknown): { ok: true; value: BillingProfile } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "Enter your billing details" };
  const record = body as Record<string, unknown>;
  const name = optionalText(record.name, "Name", 511);
  if (!name.ok) return name;
  const phone = parsePhone(record.phone_number);
  if (!phone.ok) return phone;
  const billing = parseAddress(record.billing_address);
  if (!billing.ok) return billing;
  return { ok: true, value: { name: name.value, phone: phone.value, billing: billing.value } };
}

function parsePhone(value: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, message: "Enter a phone number with a country code, for example +2348012345678" };
  }
  const compact = value.replace(/[\s()-]/g, "");
  if (!compact) return { ok: true, value: null };
  if (!PHONE.test(compact)) {
    return { ok: false, message: "Enter a phone number with a country code, for example +2348012345678" };
  }
  return { ok: true, value: compact };
}

function parseAddress(value: unknown): { ok: true; value: BillingAddress | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "object") return { ok: false, message: "Add a street address and a two-letter country code" };
  const record = value as Record<string, unknown>;
  const line1 = optionalText(record.line1, "Street address", 255);
  if (!line1.ok) return line1;
  const line2 = optionalText(record.line2, "Address line 2", 255);
  if (!line2.ok) return line2;
  const city = optionalText(record.city, "City", 128);
  if (!city.ok) return city;
  const state = optionalText(record.state, "State", 128);
  if (!state.ok) return state;
  const postal = optionalText(record.postal_code, "Postal code", 32);
  if (!postal.ok) return postal;
  const countryRaw = optionalText(record.country, "Country", 2);
  if (!countryRaw.ok) return countryRaw;
  const country = countryRaw.value?.toUpperCase() ?? null;
  const any =
    line1.value || line2.value || city.value || state.value || postal.value || country;
  if (!any) return { ok: true, value: null };
  if (!line1.value || !country) {
    return { ok: false, message: "Add a street address and a two-letter country code" };
  }
  if (!COUNTRIES.has(country)) {
    return { ok: false, message: "Country must be a two-letter code, for example NG" };
  }
  return {
    ok: true,
    value: {
      line1: line1.value,
      line2: line2.value,
      city: city.value,
      state: state.value,
      postal_code: postal.value,
      country,
    },
  };
}

function optionalText(
  value: unknown,
  label: string,
  max: number,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, message: `${label} is not valid` };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > max) return { ok: false, message: `${label} is too long` };
  return { ok: true, value: trimmed };
}
