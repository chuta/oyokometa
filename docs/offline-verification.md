# Offline verification of an Oyokometa platform-signed record

Oyokometa R3 records are `platform_signed_record` values: canonical JSON signed as JWS (ECDSA P-256 / ES256). They are **not** Content Credentials and are **not** C2PA manifests.

A valid signature means: the published key signed these exact bytes. It does not mean the registrant created the image, that the depicted event happened, or that the file is authentic.

## 1. Fetch published keys

```
GET {origin}/.well-known/oyokometa-keys.json
```

Each key has `kid`, `x`, `y` (P-256 JWK), `status`, and validity dates. Retired keys stay listed so old records remain checkable.

## 2. Obtain the record

From the registrant: `canonical` JSON plus `signature` (compact JWS). The public verify page exposes the public fields; the owner API returns the canonical string and JWS.

## 3. Check the JWS

1. Split `header.payload.signature` on `.`.
2. Decode the header. `alg` must be `ES256`. Look up `kid` in the key list. Skip keys with `status=retired` only if `valid_until` is before the registration time; otherwise still verify with that key.
3. Reconstruct the signing input as `header + "." + payload` (the base64url parts, not re-encoded).
4. Verify ECDSA-SHA-256 over that input using IEEE-P1363 signature bytes (64-byte r||s).
5. Decode the payload and compare it to `canonicalJson(payload)` stored on the record. Any difference means the record was altered.

## 4. Timestamp

If `TSA_URL` was configured, `tsa_token` is an RFC 3161 `TimeStampResp` over SHA-256 of the canonical JSON. Verify it with the TSA’s published certificate.

If the token is a `platform_clock` assertion, the registration time is only Oyokometa’s clock.

## 5. Event chain

Each provenance event has `input_hash`, `output_hash`, `prev_event_hash`, and its own JWS. The first event’s `input_hash` is SHA-256 of the canonical JSON. Each later event’s `input_hash` equals the previous `output_hash`. A break in that chain means the history cannot be relied on.

## 6. What a pass means

The file’s SHA-256 equals `asset_sha256` on the payload **and** the signature verifies. Wording to use: “This file matches the registered record.” Mandatory sub-line: “This confirms the file is unchanged since registration. It does not confirm who created it or what it shows.”
