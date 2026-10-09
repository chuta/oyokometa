# R3 signing and public-page review

Checked against PRD v3.0 §5, §8.1 and the agent guardrails in §13.2.

| Item | Status |
| --- | --- |
| Credential type `platform_signed_record` only; copy never says Content Credentials / C2PA for our records | Yes |
| ECDSA P-256 JWS; production requires KMS key id or PEM; private key not in the browser | Yes |
| Public keys at `/.well-known/oyokometa-keys.json` | Yes |
| RFC 3161 TSA when `TSA_URL` is set; otherwise an explicit platform-clock assertion | Yes |
| Append-only `provenance_events` (REVOKE + trigger); verification checks are a separate table | Yes |
| Credits: hold then capture on registration; release on failure | Yes |
| Email verified before register (AC-2) | Yes |
| Private records 404 for everyone except the registrant; same envelope as missing (API-2, VR-5) | Yes |
| Similarity search only public + own records | Yes |
| Public page omits file name, email, GPS, raw metadata (VR-6) | Yes |
| Thumbnails from stripped previews, `nosniff`, content-disposition | Yes |
| Verify headlines are VR-3 only; no standalone “verified” / “authentic” / “genuine” | Yes |
| Registrant / earliest registration, never owner / original | Yes |
| Duplicate public SHA-256 shows N registrations + earliest date | Yes |
| Disputes require email confirm; facially valid complaints mark Disputed | Yes |
| Withdrawal keeps hash and events; drops thumbnail and declarations | Yes |
| Rate limits on verify, register, dispute | Yes |
| Offline verification procedure documented | `docs/offline-verification.md` |

Production checklist (owner): set `AWS_KMS_KEY_ID` (non-exportable) or an HSM PEM equivalent, `TSA_URL` to an RFC 3161 authority, and pin `SIGNING_KEY_ID`. Do not ship with the dev PEM.
