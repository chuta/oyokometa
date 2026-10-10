# Oyokometa — MVP Product Requirements Document v3.0

Oct 8, 2026 · @chuta

This document replaces PRD v2.0 in full. Build from this version only; where v2.0 and v3.0 differ, v3.0 wins.

## 0. How to read this, and what changed from v2.0

Requirements carry IDs (AN-1, EV-3, CR-2) so tickets, tests and agent prompts can cite them. "MUST" is a launch blocker for its release; "SHOULD" is expected but can slip with owner sign-off. Numbers marked *(default)* are my proposed starting values and need owner confirmation in section 14.

v2.0 was the v1 detection PRD with a provenance and monetization appendix bolted on, and the two halves disagree. The table lists every gap found and where v3.0 resolves it.

| # | Gap in v2.0 | Severity | Resolution in v3.0 |
| --- | --- | --- | --- |
| 1 | Two conflicting specs in one file: two API surfaces (`/v1` vs `/api/v1`), two data models (`analysis` vs `analysis_jobs` + `assets`), two build orders, two navigations, two phase lists, two "final MVP definitions". Provenance creation is both "Phase 4" and "MVP"; blockchain-style signing is both a non-goal and required. | Blocker | One spec throughout. One API (§11), one schema (§11), one build plan (§13). |
| 2 | "MVP" contains everything: detection, payments, credits, email, two report tiers, provenance signing, public verification. No release slicing, so nothing is shippable until all 30 build steps finish. | Blocker | Three releases, each independently shippable (§2.3). |
| 3 | No numeric requirements anywhere: file size limit, latency ("a few seconds"), retention ("the stated retention period" is never stated), uptime, share-link lifetime. | Blocker | Explicit numbers in §8 and §9. |
| 4 | Evidence engine has a weight table but no rules. Nothing says how signals become a finding, or what to show when camera EXIF and an AI detector disagree. An agent will invent this. | Blocker | Deterministic rule table and a "Conflicting evidence" outcome (§4). |
| 5 | C2PA signing treated as a library task. Since 1 Jan 2026, manifests are only trusted by other validators if signed with a certificate from a CA on the official C2PA Trust List, which requires passing the C2PA Conformance Program (there is a queue). A self-signed manifest would display as untrusted elsewhere. | Blocker for Create | Launch Create on a platform-signed record with a trusted timestamp; C2PA embedding is gated on conformance (§5.3). |
| 6 | C2PA validation has three states. It omits the common case "signature valid but signer not on the Trust List", and legacy Interim Trust List content. | High | Five validation states (§3.6). |
| 7 | Privacy and provenance contradict. Default is auto-delete, yet records are "immutable", verify pages show thumbnails, and reports must be reproducible. | High | Per-object retention: images are deletable, hashes and signed records persist (§8.3). |
| 8 | Provenance laundering is unaddressed. Anyone can register someone else's photo and declare "I created this". No duplicate-registration rule, dispute path or takedown. | High | First-registration wording, duplicate handling, dispute and takedown flow (§5.5, §8.5). |
| 9 | No legal or abuse layer: Terms, acceptable use, illegal-content handling, data-protection basis (NDPA 2023, GDPR), processor disclosure when images go to a third-party AI detector, defamation exposure on public reports. | High | §8.4 to §8.6. |
| 10 | Credit prices contradict: "Full Provenance Report 25" (§64) vs "Standard / Full Report 25" (§71) vs "Standard Deep Analysis 10". Free vs paid is defined by what is hidden, not by what is computed. Non-expiring credits create open-ended liability. | High | One price table, compute-based tiers, expiry decision flagged (§7). |
| 11 | Payments under-specified: no currency, no provider, no chargeback or refund-to-card rule, no tax handling, no behaviour when a chargeback hits spent credits. | High | §7.5. |
| 12 | AI detection has no named approach, no pass threshold and no release gate. "Validate before exposing" has no number. | High | Benchmark size, thresholds and a hard release gate (§12). |
| 13 | Deterministic AI signals are missing: IPTC `DigitalSourceType`, generator strings in PNG text chunks and XMP, and invisible watermark detection where a detector is available. These are stronger than any pixel classifier. | Medium | Added to the metadata and AI signal layers (§3.4, §3.7). |
| 14 | No admin or support tooling: refunds, price config, takedowns, abuse review, job inspection. | Medium | Admin console requirements (§7.6). |
| 15 | Auth is one line. No method, email verification, reset, session rules or account deletion. | Medium | §7.1. |
| 16 | Perceptual hash has no algorithm or threshold, and similarity lookup against all records leaks the existence of private records. | Medium | Algorithm, threshold and scoping rule (§5.4). |
| 17 | Re-upload of an identical file: charge again or reuse? Undefined. | Medium | Cache rule (§7.4). |
| 18 | Verify page headline "RECORD VERIFIED" reads as "image is authentic". That is the overclaim the PRD itself forbids. | Medium | Renamed states and mandatory sub-line (§5.4). |
| 19 | Timestamps ignore time zones. EXIF capture times carry no zone unless `OffsetTime*` is present. | Medium | TS-rules in §3.5. |
| 20 | No error and edge states: corrupt files, animated or multi-frame images, decompression bombs, CMYK, 16-bit, embedded-thumbnail mismatch. | Medium | §3.1 and §3.2. |
| 21 | No accessibility, mobile, browser, localisation, observability, backup or disaster-recovery requirements. | Medium | §9. |
| 22 | Election mode is a headline with no behaviour behind it. | Low | Defined as a landing variant on the same engine, Release 2+ (§2.4). |
| 23 | Hygiene: product name spelled three ways (Oyokomet, Oyokometa, plus a working-name list in §51), leftover `citeturn0search` markers, a duplicated "Strategic Product Architecture" section. | Low | "Oyokometa" used throughout pending confirmation (§14). |

On the reference site: fauxscan.com renders its interface in script, so only its metadata was readable. It positions itself as provenance-first forensic triage for investigators, newsrooms, legal teams and content reviewers, with review-ready reports. That matches the Analyze half of this PRD. I found no sign of provenance creation there, so Create and Verify are specified here from first principles. Send screenshots of its result page if you want the dashboard requirements matched more closely.

## 1. Product definition and principles

Oyokometa is a web service with three actions on one evidence engine: **Analyze** an image's digital history, **Create** a signed provenance record for a file you control, and **Verify** whether a file matches a record.

Positioning: "We help you understand, establish and verify the provenance of an image." Not "we detect AI images". AI detection is one signal inside the evidence engine, never the headline.

Promise to the user: *Upload an image. See what is verified, what is detected and what is inferred, and why.*

### 1.1 Principles (binding on design, copy and code)

- **P1. Three tiers of truth.** Every statement shown to a user is tagged as one of: *Verified* (cryptographically checked), *Detected* (read from the file, alterable), *Inferred* (analysis or model output). A fourth tag, *Declared*, marks anything a user typed. Tags never upgrade silently.
- **P2. Deterministic first.** Order of authority: trusted cryptographic provenance, then embedded metadata, then file structure, then pixel analysis, then model output. A lower tier never overrides a higher one; disagreement is surfaced as a conflict.
- **P3. Absence proves nothing.** Missing EXIF, missing C2PA, a screenshot, or an editor tag are never evidence of AI generation or deception. The UI says so wherever absence is reported.
- **P4. No verdicts.** No "real", "fake" or "authentic" labels, no single authenticity score, no percentage for AI likelihood.
- **P5. Every finding is traceable.** Each finding links to the evidence items that produced it, their source, and its limitations.
- **P6. Privacy by default.** Images are deleted on a short clock, never used for training, never public unless the uploader chooses.
- **P7. Media, not claims.** The product analyzes files. It does not judge whether a depicted event happened, or whether any person, party or statement is truthful.
- **P8. A record is not authorship.** Registration proves that an account held specific bytes at a specific time. It does not prove who made the image.

### 1.2 Vocabulary (use exactly these words in UI and reports)

| Term | Meaning | Example |
| --- | --- | --- |
| Verified | Cryptographic check passed against a trusted root | "Content Credentials verified" |
| Detected | Present in the file; can be edited or removed | "Lightroom metadata detected" |
| Likely | Analytical interpretation, several agreeing signals | "Likely camera-originated" |
| Possible | Weak or single signal | "Possible messaging-app recompression" |
| Conflicting | Strong signals disagree | "Camera metadata conflicts with synthetic-image signals" |
| Inconclusive | Not enough evidence | "AI analysis inconclusive" |
| Declared | Stated by a user, unverified | "Declared creator: A. Bello" |

Confidence is reported per category as High, Medium, Low or Insufficient evidence.

## 2. Users, scope and releases

### 2.1 Users and the job each hires the product for

| Persona | Job | Must have | First served in |
| --- | --- | --- | --- |
| Everyday user | "Is this image a photo, edited, AI-made or a repost?" | Plain summary, limitations | R1 |
| Journalist / fact-checker | Establish origin before publishing | Evidence detail, timeline, downloadable report | R1 (screen), R2 (report) |
| Lawyer / investigator | Extract evidentiary leads | Hashes, acquisition record, versioned report | R2 |
| Creator / newsroom / brand | Establish a record before an image spreads | Signed record, public verify link | R3 |
| Civic / election observer | Rapid, shareable, non-partisan media check | Share link, "what we know / don't know" | R2 |
| Enterprise trust team | Volume screening | API, batch, audit logs | Post-MVP |

### 2.2 In scope for the MVP

Still images only: JPEG, PNG, WebP, HEIC/HEIF, TIFF. Web application, responsive down to 360 px. English only.

Out of scope until after R3: video, audio, PDF extraction, RAW, AVIF, GIF, reverse image search, facial recognition, identity verification of individuals, blockchain anchoring, case folders, compare mode, batch upload, public API keys, subscriptions, team accounts, native mobile apps, court-admissibility claims of any kind.

### 2.3 Releases

Each release ships to production and is usable on its own. Do not start a release until the previous one passes its acceptance list in §13.

| Release | Name | What ships | Money |
| --- | --- | --- | --- |
| R1 | Analyze | Upload, validation, hashing, metadata, timestamps, source, editing history, C2PA validation, file forensics, AI signals behind the benchmark gate, evidence engine, result dashboard, delete, anonymous use with rate limits | None |
| R2 | Accounts and paid depth | Accounts, Quick Scan vs Deep Analysis split, credit wallet and ledger, payments, PDF and JSON reports, email delivery, share links, admin console | Credits live |
| R3 | Create and Verify | Provenance registration, declarations, platform signing with trusted timestamp, public and private verify pages, exact and similar matching, dispute and takedown | Provenance credits |

R1 deliberately has no paywall. It exists to prove the engine and collect benchmark data before anyone is charged for a result.

### 2.4 Election mode

Election mode is a landing-page variant (`/check`) with election-specific copy and a prominent share action. It runs the identical pipeline, rules and labels. It ships no earlier than R2 because it depends on share links. It MUST NOT add any party, candidate or claim-level logic.

## 3. Analyze: functional requirements

The pipeline runs in a fixed order: validate, hash, decode, metadata, C2PA, file structure, pixel analysis, AI detectors, evidence normalisation, rules, explanation, report. Every stage writes versioned evidence items; no stage writes user-facing text except the last two.

### 3.1 Upload and validation

- **AN-1** Accept drag-and-drop, file picker and clipboard paste. One file per analysis.
- **AN-2** Limits *(default)*: 25 MB file size, 100 megapixels, longest side 20,000 px. Reject over-limit files before full decode.
- **AN-3** Detect type from magic bytes, not extension. Report extension/content mismatch as an evidence item, not an error.
- **AN-4** Upload goes directly to private object storage through a short-lived signed URL. Original bytes are stored unmodified and never overwritten.
- **AN-5** Malware scan, then decode in an isolated worker with no network access, CPU and memory caps and a 30-second kill timer.
- **AN-6** Multi-frame or animated files (animated WebP, HEIC sequences, multi-page TIFF): analyze the primary frame and state that other frames were not analyzed.
- **AN-7** Error states, each with its own message and no charge: unsupported type, too large, corrupt or undecodable, malware flagged, timeout, service unavailable.
- **AN-8** Show staged progress (reading, fingerprinting, metadata, credentials, image characteristics, report). Stages reflect real job state, not a timer.

### 3.2 Image identity

- **AN-9** Compute SHA-256 over the original bytes. This is the Evidence ID. Also compute a 64-bit perceptual hash (pHash, DCT-based) on the decoded primary frame.
- **AN-10** Report file name, detected type, size, dimensions, aspect ratio, colour space, bit depth, ICC profile name, orientation. MD5 is not computed in the MVP.
- **AN-11** If an embedded EXIF thumbnail exists, compare it to the main image; a visible mismatch is a Detected evidence item ("embedded thumbnail differs from image").

### 3.3 Metadata extraction

- **AN-12** Extract EXIF, IPTC, XMP, ICC, maker notes and PNG text chunks with ExifTool. Store raw output verbatim alongside normalised fields.
- **AN-13** No language model reads, summarises or fills in metadata values. Metadata shown to users comes only from the extractor.
- **AN-14** GPS: report "location metadata detected" only. Coordinates are revealed on an explicit click with a warning, are never included in share links, and appear in a report only if the owner opts in.

### 3.4 Source and editing history

- **AN-15** Classify capture source as one of: camera, smartphone, drone, scanner, screenshot, digitally created, synthetic indicators, unknown. The class is produced by the rules in §4, with the contributing evidence listed.
- **AN-16** Detect software and platform traces from `Software`, XMP history, `CreatorTool`, Photoshop and Lightroom blocks, and known JPEG quantisation tables. Wording is fixed: "processed by X; this does not establish what was changed".
- **AN-17** Read IPTC `DigitalSourceType`. Values such as `trainedAlgorithmicMedia` or `compositeWithTrainedAlgorithmicMedia` are a Detected AI disclosure.
- **AN-18** Read generator identifiers in XMP, EXIF `Software` and PNG text chunks (for example embedded generation parameters). These are Detected, alterable evidence.

### 3.5 Timestamps

- **AN-19** Never show a single "original date". Show a timeline of every timestamp found, each labelled with its field name and tier: Verified (signed), Detected (embedded), Inferred, Unknown.
- **AN-20** EXIF times have no zone unless `OffsetTime*` fields exist. Show them as "local time, zone not recorded" unless an offset is present. GPS time is UTC. Never convert an unzoned time.
- **AN-21** Flag, as evidence items, impossible orderings (modified before created), future dates, and default dates such as 1970-01-01 or 2000-01-01.
- **AN-22** File-system dates are not available from a browser upload and MUST NOT be invented. The only system-observed time is the acquisition time (server receipt, UTC).

### 3.6 C2PA / Content Credentials validation

- **AN-23** Use the maintained open-source C2PA SDK (c2pa-rs or its official bindings). Do not write a custom parser or validator.
- **AN-24** Validate against the official C2PA Trust List, refreshed at least daily and cached. Record the trust-list version used with each result.
- **AN-25** Report exactly one of five states:

| State | Meaning | Tier |
| --- | --- | --- |
| Verified and trusted | Signature valid, content binding matches, signer chains to the C2PA Trust List | Verified |
| Valid, signer not recognised | Signature and binding valid, signer not on the Trust List (includes legacy Interim Trust List signers) | Detected |
| Invalid | Manifest present but signature or binding check failed | Detected, with the failure reason |
| Not detected | No manifest found | No inference permitted |
| Unable to verify | Validator error or unsupported manifest version | No inference permitted |

- **AN-26** For any present manifest, show signer, claim generator, signing time, actions, ingredients and any AI-related assertion (`digitalSourceType`), each marked with the state above.
- **AN-27** "Not detected" always renders with the line: "Most images have no Content Credentials. This says nothing about whether the image is genuine."

### 3.7 File structure, pixel and AI signals

- **AN-28** File structure: JPEG quantisation tables and their match to known cameras or apps, double-compression indicators, chroma subsampling, PNG chunk order, trailing data after the end marker.
- **AN-29** AI detectors sit behind one interface (`Detector.analyze(image) -> {label, raw_score, model_id, model_version}`). At least two independent detectors run in Deep Analysis; one runs in Quick Scan. No detector is referenced by name outside its adapter.
- **AN-30** Raw detector scores are stored but never shown. Scores map to *no signal / weak / strong* through thresholds set by the benchmark in §12.
- **AN-31** Where a watermark detector for a major generator is available to the platform, run it and record a positive hit as Detected. Do not claim watermark absence means anything.
- **AN-32** No AI label is shown in production until the detector set passes the release gate in §12. Until then the AI section reads "AI analysis not yet available" and deterministic disclosures (AN-17, AN-18, AN-26) still show.
- **AN-33** If images are sent to a third-party detector, the provider must contractually not retain or train on them, and the privacy notice names the provider.

### 3.8 Result dashboard

- **AN-34** Layout, top to bottom: executive finding with per-category confidence; quick findings; timeline; "why we think this"; provenance; AI analysis; full metadata; limitations; actions (download, share, delete, analyze another).
- **AN-35** Every finding opens a detail drawer with four fixed parts: what we found, source, interpretation, caution.
- **AN-36** The limitations block is always visible without scrolling into a collapsed area and cannot be removed from any report or share page.
- **AN-37** Visual language: neutral base, one restrained accent, monospace for technical values, no red/green pass/fail, no gauges or percentages, no "AI magic" styling.

* **AN-38** Landing page: headline "What can this image tell you?", one primary action (Analyze an image), a secondary "How it works", the trust line "We separate verified facts from technical signals and inference", and one sample report built from a non-personal image. Navigation: Analyze, How it works, Sample report, Privacy in R1; add Pricing, Reports, Credits, Account in R2; add Create and Verify in R3.

## 4. Evidence engine and finding rules

Findings come from a versioned, deterministic rule set evaluated over evidence items. Models contribute evidence; they never write findings.

### 4.1 Evidence item

```json
{
  "id": "ev_01J...",
  "category": "metadata | provenance | structure | pixel | model | declaration",
  "signal": "camera_make_model",
  "value": "Apple iPhone 15 Pro",
  "source": "EXIF:Make, EXIF:Model",
  "tier": "verified | detected | inferred | declared",
  "strength": "very_strong | strong | moderate | weak",
  "producer": "metadata-worker@1.3.0",
  "raw_ref": "raw/exiftool.json#/EXIF/Model"
}
```

- **EV-1** Every item names its producer and version and points to raw output.
- **EV-2** Strength is assigned by signal type in server-side config, not by the worker.
- **EV-3** Missing-data items (no EXIF, no C2PA) exist so the UI can report them, and have strength `none`. No rule may use them as support for AI generation, editing or deception.

### 4.2 Origin and AI finding rules

Rules are evaluated top to bottom; the first match sets the executive finding. Later rows still contribute supporting evidence.

| # | Condition | Executive finding | Max confidence |
| --- | --- | --- | --- |
| 1 | C2PA verified and trusted, with a generative-AI source type or action | AI generation indicated (or AI assistance indicated, if an AI action sits on a captured base) | Verified |
| 2 | C2PA verified and trusted, capture source type, no AI action | Camera-originated, Content Credentials verified | Verified |
| 3 | C2PA invalid | Content Credentials present but failed verification; origin assessed from rows 4 to 9 | n/a |
| 4 | Unsigned AI disclosure (IPTC source type, generator string, watermark hit) and no strong camera evidence | AI generation indicated by file metadata | Medium |
| 5 | Strong camera evidence and strong detector signal, or AI disclosure and strong camera evidence | Conflicting evidence | n/a; both sides listed |
| 6 | Strong camera evidence (make, model, lens, exposure, maker notes, matching quantisation table), no AI signal | Likely camera-originated | High |
| 7 | Partial camera metadata, no AI signal | Likely camera-originated | Medium |
| 8 | Screenshot or scanner indicators (device-resolution dimensions, screenshot metadata, scanner make) | Likely screenshot / Likely scanned | Medium |
| 9 | No camera evidence, two detectors agree at *strong* | AI signals detected | Medium |
| 10 | No camera evidence, one detector strong or any weak | Possible AI signals | Low |
| 11 | None of the above | Inconclusive | Insufficient evidence |

- **EV-4** A model-only finding (rows 9 and 10) is capped at Medium and always carries: "No provenance or metadata evidence supports or contradicts this."
- **EV-5** Row 5 is never resolved automatically. The dashboard shows both evidence sets side by side.
- **EV-6** Editing history is a separate category and never changes the origin finding. "Edited" and "camera-originated" coexist.
- **EV-7** Rule set, strength config and thresholds are versioned together as `ruleset_version` and stored with every analysis.

### 4.3 Explanation layer

- **EV-8** Executive and "what this means" text is assembled from templates keyed to the matched rule. A language model may rephrase for readability only if its output is constrained to the facts in the findings object and passes an automated check that it adds no entity, date, device or claim absent from that object. If the check fails, show the template.
- **EV-9** Every report ends with the fixed "What this does not establish" block: when the photo was actually taken, who took it, whether metadata was altered, whether the depicted event occurred.

### 4.4 Reproducibility

- **EV-10** Re-running the rules over a stored evidence record with the same `ruleset_version` MUST produce an identical findings object. This is a CI test.
- **EV-11** Evidence records outlive the image. Deleting the image does not delete the evidence record unless the user deletes the analysis.

## 5. Create provenance and Verify (Release 3)

A provenance record states one thing with cryptographic backing: *this account registered these exact bytes no later than this time.* Everything else on the record is a declaration.

### 5.1 Create flow

1. Signed-in, email-verified user uploads the file (same validation as AN-1 to AN-7).
2. System hashes and runs the R1 baseline analysis.
3. Screen shows two visually distinct columns: **Detected by Oyokometa** (read-only) and **Declared by you** (editable).
4. User chooses visibility (private by default) and whether a thumbnail appears on the public page.
5. User accepts the registration attestation: "I have the right to register this file. I understand this record does not prove authorship."
6. Credits are debited, the record is signed and timestamped, and the verify URL is issued.

- **PR-1** Three modes: File Registration (no creator claim), Creator Declaration ("I created this"), Organization Declaration (R3 schema only; verified organizations ship post-MVP).
- **PR-2** Declarable fields: creator name, creation date, device or source, description, AI-use disclosure (none / AI-assisted / AI-generated), licence note. All optional, all rendered with the Declared tag everywhere, including PDF and JSON.
- **PR-3** Where a declaration contradicts detected evidence (declared date earlier than EXIF capture date; declared "no AI" with an AI disclosure in the file), allow it but show the contradiction on the record and the public page.

### 5.2 Record contents

Record ID, public ID, asset SHA-256, perceptual hash, MIME type, dimensions, byte size, original file name (private), registrant account ID (private) and display name (public if chosen), registration time, declarations, visibility, baseline analysis ID and `ruleset_version`, signing key ID, signature, timestamp token, platform version.

### 5.3 Signing and the C2PA decision

- **PR-4** MVP credential type is `platform_signed_record`: a canonical JSON record signed with ECDSA P-256 (JWS). The private key lives in a cloud KMS or HSM, is non-exportable, and is used only by the signing service.
- **PR-5** Each record carries an RFC 3161 timestamp token from an independent time-stamping authority over the record hash. Without it, the registration time is only Oyokometa's own assertion.
- **PR-6** Public keys, key IDs, validity periods and retired keys are published at `/.well-known/oyokometa-keys.json`. Records stay verifiable after key rotation. Document an offline verification procedure.
- **PR-7** The product MUST NOT call its records "Content Credentials" or "C2PA" in R3. Embedded C2PA manifests ship only after Oyokometa passes the C2PA Conformance Program and holds a claim-signing certificate from a Trust List CA. Until then a manifest signed by us would show as untrusted in other validators. Start the conformance application during R1; it does not block R3.
- **PR-8** The schema keeps `credential_type` open (`platform_signed_record`, `c2pa_manifest`, `external_credential`) so C2PA can be added without migration.
- **PR-9** Records are append-only. Corrections are new events; nothing is edited in place. MVP event types: `REGISTERED`, `DECLARATION_ADDED`, `VISIBILITY_CHANGED`, `DISPUTED`, `WITHDRAWN`. Each event has an ID, time, actor, input hash, output hash and signature. Verification checks are logged in a separate table, not as provenance events.

### 5.4 Verify

- **VR-1** Two entry points: open `/verify/{public_id}`, or upload a file on `/verify`. Verification is free and needs no account.
- **VR-2** Hashing for upload-to-verify runs in the browser where possible, so the file need not leave the device for an exact-match check. Say so on the page.
- **VR-3** Outcomes and required wording:

| Outcome | Condition | Headline | Mandatory sub-line |
| --- | --- | --- | --- |
| Exact match | SHA-256 equals the registered hash, record signature valid | "This file matches the registered record" | "This confirms the file is unchanged since registration. It does not confirm who created it or what it shows." |
| No match | SHA-256 differs | "This file does not match this record" | "The file may be a resized, recompressed or edited copy, or a different image." |
| Visually similar | Not exact; pHash Hamming distance at or below 8 of 64 *(default, tune on benchmark)* | "Visually similar to a registered image" | "Similarity does not establish that one file derives from the other, or who owns either." |
| Record problem | Signature or timestamp check fails, or record withdrawn or disputed | "This record cannot be relied on" | Reason shown |

- **VR-4** The words "verified", "authentic" and "genuine" MUST NOT appear as a standalone headline on any verify page.
- **VR-5** Similarity search runs only against public records and the signed-in user's own records. A private record is never revealed, confirmed or hinted at to anyone else, including through timing or error differences.
- **VR-6** Public page shows only: thumbnail (if owner enabled; stripped of all metadata), format, dimensions, size, registration time, display name, declarations with Declared tags, event list, signature status, key ID. Never file name, account email, GPS, or raw metadata.
- **VR-7** Public pages carry a QR code and a "Check your own image" action.

### 5.5 Duplicates, disputes and withdrawal

- **PR-10** The same SHA-256 may be registered by more than one account. Each public page then states: "This file has N registrations. The earliest was on \[date\]." Never reveal who holds private registrations.
- **PR-11** No page says "owner" or "original". Use "registrant" and "earliest registration".
- **PR-12** Any visitor can file a dispute on a public record (form, email-verified). The record shows "Disputed" within one business day of a facially valid complaint, pending review. Outcomes: dispute removed, record withdrawn, or thumbnail removed.
- **PR-13** A registrant can withdraw a record. The page then shows "Withdrawn on \[date\]"; the hash and event history persist; thumbnail and declarations are removed.

## 6. Reports and sharing (Release 2)

- **RP-1** Two formats from one findings object: PDF for people, JSON for machines. They MUST agree field for field; a CI test renders both and compares.
- **RP-2** Report sections, in order: Evidence ID (SHA-256); preview (optional); executive finding; per-category confidence; findings with evidence; timeline; provenance; AI analysis; full metadata (GPS redacted unless opted in); limitations; acquisition time (UTC); analyzer, ruleset, detector and trust-list versions; report hash.
- **RP-3** Each report file is hashed (SHA-256) and the hash is stored. `/report/{id}/check` lets anyone confirm a PDF or JSON file is the one issued.
- **RP-4** Acquisition statement, fixed wording: "This is a record of the file submitted to Oyokometa at the time shown. It is not proof that the submitter held the original camera file, and it is not a forensic or legal certification."
- **RP-5** Reports are generated once and stored. Regeneration under a newer ruleset creates a new report with a new ID; the old one stays retrievable and is marked superseded.
- **RP-6** Email delivery sends a link to the signed-in report, not the PDF as an attachment. Reports may contain personal data.
- **RP-7** Share links: owner-created, unguessable ID (128 bits or more), revocable, default expiry 90 days *(default)*, no search-engine indexing. The share view omits the image unless the owner switches it on, and always omits GPS and file name.
- **RP-8** A share page shows the acquisition time and "analysis of the file as submitted" banner, plus the full limitations block.
- **RP-9** The "Professional Evidence Report" in v2.0 (detailed evidence matrix, acquisition log, all versions, machine JSON) is folded into the single R2 report. A separate signed evidence package is post-MVP.

## 7. Accounts, tiers, credits and payments (Release 2)

### 7.1 Accounts

- **AC-1** Sign-in by email magic link and Google OAuth. No passwords in the MVP.
- **AC-2** Email must be verified before buying credits, creating share links or registering provenance.
- **AC-3** Sessions: HTTP-only, secure, same-site cookies; 30-day rolling expiry; sign-out-everywhere control.
- **AC-4** Account deletion is self-service: deletes images, analyses, reports and personal data within 30 days. Ledger entries are kept in anonymised form for financial audit. Public provenance records are withdrawn (PR-13), not erased.
- **AC-5** Anonymous sessions get a server-issued session ID. An anonymous analysis is claimable into a new account for 24 hours so the user loses nothing by signing up.

### 7.2 Tiers are defined by what is computed

|  | Quick Scan | Deep Analysis | Report |
| --- | --- | --- | --- |
| Hashes, identity, type checks | Yes | Yes | Included |
| Metadata | Summary: which blocks exist, camera, software, earliest capture time | Every field, normalised and raw | Included |
| C2PA | State plus signer | Full manifest, actions, ingredients | Included |
| Timeline | Earliest and latest events | Full, with anomalies | Included |
| File structure forensics | Not run | Run | Included |
| AI detectors | One | Two or more, plus watermark check | Included |
| Evidence drawers | Executive finding and limitations | All | Included |
| PDF, JSON, email, share link | No | No | Yes |
| Account needed | No | Yes | Yes |

- **CR-1** Quick Scan is never degraded to push upgrades. Executive finding, C2PA state, any AI disclosure and limitations are always free. A fact already computed is never blurred or hidden.
- **CR-2** Anonymous allowance *(default)*: 3 Quick Scans per session per day, 10 per IP per day, challenge on excess. Signed-in free allowance: 10 per day. v2.0's "one free scan" is too tight to demonstrate value and trivially reset.

### 7.3 Prices in credits

| Action | Credits *(default)* |
| --- | --: |
| Quick Scan | 0 |
| Deep Analysis | 10 |
| Report on an analysis that already has Deep Analysis | 15 |
| Deep Analysis plus Report bought together | 25 |
| Provenance registration (R3) | 25 |
| Verify | 0 |

Packs *(default)*: Starter 100, Standard 500, Professional 2,000. The 5,000 "Enterprise" pack is dropped; organizations will be served by invoice and API after the MVP. Currency prices live in `credit_products` and are an open decision (§14).

- **CR-3** Action prices and pack definitions are database rows editable in the admin console. No price, credit cost or pack size appears in frontend code.
- **CR-4** The price is shown before every charge, with the resulting balance, and requires one explicit confirmation.

### 7.4 Wallet and ledger

- **CR-5** The ledger is the source of truth: append-only entries of type `PURCHASE`, `BONUS`, `HOLD`, `CAPTURE`, `RELEASE`, `REFUND`, `REVERSAL`, `ADJUSTMENT`. The wallet balance is a cached sum and is reconciled against the ledger nightly; any drift pages an engineer.
- **CR-6** Charging uses hold-then-capture. Hold on job creation; capture when the paid result is delivered; release on failure. All three run in database transactions with row locks on the wallet.
- **CR-7** Every charge carries a client-generated idempotency key. Replays return the original job and never create a second hold.
- **CR-8** A failed job (error, timeout, detector outage that prevents the paid tier's output) releases the hold automatically. An *Inconclusive* result is a delivered result and is captured.
- **CR-9** Re-analysis of the same SHA-256 by the same account under the same `ruleset_version` reuses the stored result at no charge. A re-run under a newer ruleset is offered at full price with the difference explained.
- **CR-10** Balances cannot go negative except through a payment reversal (CR-14).
- **CR-11** Credits are non-transferable and have no cash value. Expiry policy is an open decision; the schema carries `expires_at` on purchase lots so either policy works.

### 7.5 Payments

- **CR-12** One `PaymentProvider` interface with two adapters at launch: a Nigerian processor for NGN cards, transfer and USSD, and an international card processor for USD. Candidates are Paystack or Flutterwave, and Stripe; confirm against current fees and onboarding requirements before build.
- **CR-13** Credits are granted only on a signature-verified webhook, matched to a server-created payment intent, with the amount and currency checked against the product row. The browser redirect grants nothing. Webhook handling is idempotent on the provider event ID.
- **CR-14** Refund or chargeback creates a `REVERSAL` entry for the purchased credits. If credits were already spent, the balance goes negative and paid actions are blocked until settled.
- **CR-15** Unused credits are refundable to the original payment method for 14 days after purchase *(default; confirm against consumer-protection advice)*.
- **CR-16** Issue a receipt per purchase with tax shown as the processor and accountant require. VAT treatment is an open decision.
- **CR-17** No card data touches Oyokometa servers; use the processor's hosted fields or checkout.

### 7.6 Admin console

- **AD-1** Roles: support, finance, trust-and-safety, admin. Every admin action is written to the audit log with actor and reason.
- **AD-2** Functions: look up user, job and payment; view ledger; issue adjustment or refund with mandatory reason; edit prices and packs; view failed jobs and retry; manage disputes and takedowns; suspend account; revoke share link; view key and trust-list status.
- **AD-3** Admins cannot view user images or GPS by default. Access requires a logged reason and is limited to the trust-and-safety role.

## 8. Security, privacy, retention, abuse and legal

### 8.1 Security

- **SE-1** TLS 1.2 or later everywhere; HSTS; encryption at rest for storage and database.
- **SE-2** Object storage is private. Access only through signed URLs with lifetimes of 5 minutes or less. No public bucket, no public object URL, ever.
- **SE-3** All parsers (ExifTool, libvips, C2PA SDK, detectors) run in sandboxed containers: no outbound network, read-only root, non-root user, resource caps, fresh container or wiped scratch per job. ImageMagick is not used.
- **SE-4** Thumbnails and previews are re-encoded from decoded pixels with all metadata stripped, and served with `Content-Disposition` and `nosniff` headers from a separate origin.
- **SE-5** Rate limits per IP, session and account on upload, analyze, verify, auth and payment endpoints.
- **SE-6** Secrets in a managed secret store. Signing keys in KMS or HSM, with signing calls logged and alerted on anomaly.
- **SE-7** Audit log (append-only) for auth events, payments, ledger changes, provenance events, admin actions, image access by staff.
- **SE-8** Dependency and container scanning in CI; an external penetration test before R2 goes live with payments.

### 8.2 Privacy

- **PV-1** Uploaded images are never used to train or tune any model, by Oyokometa or a sub-processor, without separate explicit opt-in. The MVP ships no opt-in.
- **PV-2** Publish a privacy notice naming the data controller, purposes, retention periods below, sub-processors (hosting, email, payments, any external detector) and countries of processing.
- **PV-3** "Delete now" on every analysis removes the image, derived previews, evidence record and reports within minutes from primary storage and within 30 days from backups.
- **PV-4** Analytics events never contain file names, hashes, metadata values, GPS or image content.

### 8.3 Retention

| Object | Anonymous | Signed-in *(default)* | On "delete now" |
| --- | --- | --- | --- |
| Original image bytes | 24 hours | 30 days, user can set 0 to 90 | Deleted |
| Preview / thumbnail | 24 hours | Same as image | Deleted |
| Evidence record and findings | 24 hours | Until user deletes | Deleted |
| Reports (PDF, JSON) | n/a | Until user deletes | Deleted |
| Provenance record: hash, events, signature, timestamp | n/a | Permanent | Withdrawn, not erased (PR-13) |
| Provenance image bytes | n/a | Not retained after registration unless a public thumbnail is enabled | Deleted |
| Ledger and payment records | n/a | 7 years *(confirm with accountant)* | Kept, anonymised |
| Audit log | 1 year | 1 year minimum | Kept |

A provenance record needs only the hash to work. Not keeping the image is the default and resolves the v2.0 conflict between auto-deletion and permanent records.

### 8.4 Data protection and legal documents

These are requirements to obtain, not legal conclusions; counsel must confirm each.

- **LG-1** Before R1: Terms of Use, Privacy Notice, Acceptable Use Policy, cookie notice. Before R2: refund policy, credit terms. Before R3: registration terms, dispute and takedown policy.
- **LG-2** Complete a data protection impact assessment covering Nigeria's NDPA 2023 and, if EU or UK users are served, GDPR. Images can contain faces, locations and documents belonging to people who are not the uploader.
- **LG-3** Decide hosting region and document the cross-border transfer basis for any processing outside Nigeria, including external detector APIs.
- **LG-4** Fixed disclaimer on every report and verify page: not a forensic certification, not legal advice, not a determination of authenticity or authorship.
- **LG-5** Do not describe any output as "court-admissible", "certified" or "forensically verified" in product or marketing copy.

### 8.5 Abuse and takedown

- **AB-1** Uploader attests on first use that they may lawfully submit the image.
- **AB-2** Define, with counsel, the procedure for suspected child sexual abuse material and other illegal content before R1: detection approach, immediate quarantine, no staff re-distribution, reporting obligations, account action. This is a launch blocker.
- **AB-3** A public report-abuse channel for share pages and verify pages, with a 1-business-day first response target.
- **AB-4** Takedown of a public page removes thumbnail and declarations at once and leaves a tombstone with the hash and "removed on \[date\]".
- **AB-5** Public share and verify pages carry the standing line: "This page reports technical analysis of a file. It makes no statement about any person shown or named."

### 8.6 Known product risks

| Risk | Mitigation in this PRD |
| --- | --- |
| A false AI label harms someone | P4, EV-4, EV-5, AN-32, benchmark gate (§12) |
| Records used to claim images one did not make | P8, PR-10 to PR-13, VR-3 wording |
| Report quoted as proof of authenticity | RP-4, LG-4, fixed limitations block |
| Malicious image exploits a parser | SE-3, AN-2, AN-5 |
| Free tier farmed | CR-2, SE-5 |
| Signing key compromise | PR-4, PR-6, SE-6, independent timestamps (PR-5) |

## 9. Non-functional requirements

All targets are *(default)* and measured in production.

| Area | Requirement |
| --- | --- |
| Quick Scan latency | p50 5 s or less, p95 12 s or less, from upload complete to result, for a 10 MB JPEG |
| Deep Analysis latency | p95 45 s or less; if an external detector exceeds 30 s, return the result marked "AI analysis unavailable" and release the hold if AI was the paid differentiator |
| Verify (exact match) | p95 1 s or less after hash is available |
| Availability | 99.5% monthly for web and API; payments webhook endpoint 99.9% |
| Capacity at launch | 20 concurrent analyses, queue with visible position beyond that; horizontal worker scaling without code change |
| Job durability | Jobs survive worker restarts; at-least-once execution with idempotent stages |
| Browsers | Latest two versions of Chrome, Safari, Firefox, Edge; iOS Safari and Android Chrome |
| Low bandwidth | Resumable or chunked upload; landing page under 300 KB transferred; usable on a 3G-class connection |
| Accessibility | WCAG 2.1 AA. Status never conveyed by colour alone; all findings readable by screen reader; keyboard-complete flows |
| Localisation | English at launch; all strings externalised; dates shown in the viewer's zone with UTC available |
| Observability | Structured logs with job ID, per-stage timing metrics, error tracking, uptime checks, alert on queue depth, stage failure rate above 2%, ledger drift, webhook failures |
| Backup and recovery | Database point-in-time recovery; restore tested before R2; recovery point 15 minutes, recovery time 4 hours |
| Environments | Local, staging, production. Staging uses payment sandbox and a separate signing key |
| Quality bar | Unit tests per analyzer with fixture images; integration tests for the full pipeline; ledger and webhook property tests; CI blocks merge on failure |

## 10. Architecture and technology decisions

v2.0 offered menus ("Node or Python", "Vite / Next.js"). An agent needs one answer. These are the defaults; the team may substitute an equivalent, but must record the substitution.

Request path: browser, then API, then job queue, then sandboxed workers (metadata, C2PA, forensics, detectors run in parallel after hashing), then evidence store, then rules engine, then explanation and report services. The signing service and the payment service are separate modules with their own credentials.

| Concern | Decision | Why |
| --- | --- | --- |
| Language | TypeScript across web, API and workers; one Python worker only if a self-hosted detector needs it | One toolchain for a small team and for coding agents |
| Web | Next.js (React), Tailwind, server-rendered public pages | Share and verify pages must render without client script and preview well in messaging apps |
| API | Node service, REST, OpenAPI spec as the contract, generated client types | Contract-first keeps web and API aligned |
| Database | PostgreSQL | Transactions and row locks for the ledger |
| Queue | Redis-backed job queue with retries and dead-letter | Stage-level retry and progress |
| Storage | S3-compatible, private, lifecycle rules enforce retention | Retention by policy, not by cron alone |
| Metadata | ExifTool, pinned version, invoked with `-json -G -struct` and safe flags | Broadest coverage |
| Imaging | libvips (sharp) | Fast, safer than ImageMagick |
| C2PA | Official c2pa SDK bindings, pinned | Never hand-roll validation |
| Detectors | Adapter interface; at least one external API and one self-hostable model | Avoid lock-in; allow ensemble |
| Signing | Cloud KMS asymmetric key (ECDSA P-256), RFC 3161 TSA client | Non-exportable keys, independent time |
| PDF | HTML-to-PDF from the same components as the web report | One source for RP-1 parity |
| Email | Transactional email provider with SPF, DKIM, DMARC set | Deliverability of magic links |
| Infra | Containers, infrastructure as code, single region at launch | Reproducible environments |

- **AR-1** The findings object is the single interface between the engine and every presentation surface (dashboard, PDF, JSON, share page, API).
- **AR-2** Analyzer workers are stateless and versioned independently. Adding a detector or analyzer requires no change to the rules engine beyond a new signal definition.
- **AR-3** The AI layer sits inside the evidence architecture as one producer of evidence. No code path lets a model output bypass the rules engine.

## 11. Data model and API

One schema replaces the two in v2.0. All tables have `id` (UUID or ULID), `created_at`, and `updated_at` where mutable. Times are UTC.

### 11.1 Tables

| Table | Release | Key fields | Notes |
| --- | --- | --- | --- |
| `users` | R2 | email, email\_verified\_at, display\_name, status, deleted\_at |  |
| `anonymous_sessions` | R1 | expires\_at, linked\_user\_id, scan\_count |  |
| `assets` | R1 | sha256, phash, detected\_mime, byte\_size, width, height, storage\_key, original\_filename, owner (user or session), image\_deleted\_at | One row per upload, not per unique hash; index on sha256 and phash |
| `analysis_jobs` | R1 | asset\_id, tier, status, stage, idempotency\_key (unique per owner), ruleset\_version, analyzer\_versions (JSON), trust\_list\_version, credit\_hold\_id, error\_code, completed\_at |  |
| `evidence_items` | R1 | job\_id, category, signal, value, source, tier, strength, producer, raw\_ref | Immutable |
| `raw_outputs` | R1 | job\_id, producer, storage\_key or JSON | ExifTool, C2PA and detector raw output |
| `c2pa_results` | R1 | job\_id, state, signer, claim\_generator, signed\_at, actions, ingredients, ai\_assertion, failure\_reason |  |
| `findings` | R1 | job\_id, category, classification, confidence, rule\_id, evidence\_ids, summary | Reproducible from evidence + ruleset |
| `reports` | R2 | job\_id, format, report\_hash, storage\_key, superseded\_by |  |
| `share_links` | R2 | job\_id, public\_id, include\_image, expires\_at, revoked\_at |  |
| `credit_wallets` | R2 | user\_id (unique), cached\_balance |  |
| `credit_ledger` | R2 | wallet\_id, type, amount, balance\_after, reference\_type, reference\_id, idempotency\_key (unique), lot\_expires\_at, actor | Append-only; no updates or deletes at the database-permission level |
| `credit_products` | R2 | name, credits, currency, price\_minor, active |  |
| `action_prices` | R2 | action, credits, effective\_from |  |
| `payments` | R2 | user\_id, provider, provider\_ref, product\_id, amount\_minor, currency, status |  |
| `payment_events` | R2 | provider, provider\_event\_id (unique), payload, processed\_at | Webhook idempotency |
| `provenance_records` | R3 | asset\_sha256, phash, owner\_user\_id, public\_id, mode, visibility, status, declarations (JSON), credential\_type, signing\_key\_id, signature, tsa\_token, baseline\_job\_id, show\_thumbnail |  |
| `provenance_events` | R3 | record\_id, type, actor, input\_hash, output\_hash, payload, signature, prev\_event\_hash | Hash-chained, append-only |
| `verification_checks` | R3 | record\_id (nullable), submitted\_sha256, match\_type, created\_at | No IP or user stored for anonymous checks |
| `disputes` | R3 | record\_id or share\_link\_id, complainant\_email, reason, status, resolution |  |
| `audit_log` | R1 | actor, action, target, reason, metadata | Append-only |
| `config` | R1 | key, value, version | Limits, thresholds, strengths |

### 11.2 API (`/api/v1`, JSON, OpenAPI-described)

| Method and path | Purpose | Auth |
| --- | --- | --- |
| `POST /uploads` | Get a signed upload URL and asset ID | Session |
| `POST /analyses` | Start a job `{asset_id, tier}` with `Idempotency-Key` header | Session; account for paid tiers |
| `GET /analyses/{id}` | Status, stage, findings object | Owner |
| `GET /analyses/{id}/evidence` | Evidence items | Owner, Deep tier |
| `GET /analyses/{id}/metadata` | Normalised and raw metadata | Owner, Deep tier |
| `POST /analyses/{id}/upgrade` | Quick to Deep on the same asset | Account |
| `DELETE /analyses/{id}` | Delete image, evidence, reports | Owner |
| `POST /analyses/{id}/reports` | Generate report | Account |
| `GET /reports/{id}` | Download PDF or JSON | Owner |
| `POST /reports/check` | Confirm a report file hash | Public |
| `POST /analyses/{id}/share-links`, `DELETE /share-links/{id}` | Create, revoke | Owner |
| `GET /credits`, `GET /credits/ledger`, `GET /credits/products` | Balance, history, packs | Account (products public) |
| `POST /payments/intents` | Start a purchase | Account |
| `POST /payments/webhooks/{provider}` | Provider callbacks | Signature |
| `POST /provenance` | Register `{asset_id, mode, declarations, visibility}` | Account, verified email |
| `GET /provenance/{id}`, `POST /provenance/{id}/events` | Read; add declaration, change visibility, withdraw | Owner |
| `POST /verify` | Check `{sha256, phash?}` against records | Public, rate-limited |
| `GET /verify/{public_id}` | Public record view | Public |
| `POST /disputes` | File a dispute | Public, verified email |

- **API-1** Errors use one envelope: `{error: {code, message, request_id}}` with stable machine codes.
- **API-2** Authorisation is checked on every object by owner. A request for another user's object returns the same response as a non-existent one.
- **API-3** Third-party API keys are post-MVP, but nothing in the web app uses a private endpoint the future API would lack.

## 12. Quality Assurance, Testing and Release Gates

Oyokometa will use a phased validation approach. R1 prioritises reliable file analysis, provenance verification and transparent reporting. Advanced AI-image detection will remain experimental until its performance has been independently evaluated against a representative test set.

The size of the AI benchmark corpus is not a prerequisite for releasing deterministic functionality.

### 12.1 R1 test corpus

Maintain a small, curated test corpus covering the file types and behaviours supported by the MVP.

| Group | Initial target | Contents |
| --- | ---: | --- |
| A. Camera originals | 30 | Genuine images from a range of phones and cameras, including devices commonly used in Nigeria |
| B. Edited genuine images | 20 | Images edited using common photo editors and design tools |
| C. AI-generated images | 30 | Images from multiple available image generators |
| D. AI-assisted images | 10 | Genuine images modified using generative fill, object removal or similar tools |
| E. Screenshots and redistributed images | 20 | Screenshots, resized images, recompressed files and images shared through common platforms |
| F. Provenance and malformed-file fixtures | As needed | Valid, modified and untrusted C2PA examples, missing metadata, contradictory metadata, unsupported formats and malformed files |

These are initial engineering test fixtures, not a statistically representative dataset and not sufficient to establish broad AI-detection accuracy.

Record the source and known characteristics of each fixture where available. Separate development fixtures from a small holdout set for regression testing. Expand the corpus as the product and detector mature.

### 12.2 AI-detection release policy (AN-32)

**R1 default: AI detection is advisory and disabled in user-facing reports until the minimum validation requirements are met.**

The development team may evaluate one candidate detector in shadow mode. Its outputs must not be presented to users as established findings while it remains unvalidated.

Before enabling user-facing AI signals:

- **QA-1 — Genuine-image false positives:** Evaluate the detector on a separately held-out set of genuine camera originals, edited images and redistributed derivatives. Report false-positive rates and sample sizes. Do not make a broad accuracy claim from a small sample.
- **QA-2 — Label discipline:** AI detection must not independently produce a definitive "AI-generated" or "genuine" verdict. Use qualified language such as "AI-generation signals detected" only when the evidence and validation support it.
- **QA-3 — Coverage:** Evaluate multiple generators and image transformations, including resizing, compression, screenshots and editing. Document cases in which the detector fails or cannot reach a conclusion.
- **QA-4 — Bias and robustness:** Where sufficient test data exists, compare performance across device types, image categories and relevant demographic characteristics. Treat small subgroup results as exploratory rather than conclusive.
- **QA-5 — Regression:** Re-run the available detector tests whenever the model, preprocessing pipeline, threshold or evidence rules change. Record model version, configuration and test results.

Do not expose a detector score as a probability that an image is fake unless that score has been appropriately calibrated and validated for the intended use.

If the detector does not meet the required standard, R1 ships without user-facing AI-origin labels. Metadata, provenance and other deterministic findings remain available.

### 12.3 Deterministic functionality and provenance

- **QA-6 — Metadata accuracy:** Correctly extract camera make, model, timestamps and other supported fields when they are present and parseable. Missing, ambiguous or contradictory fields must be reported as unavailable or uncertain—not inferred as facts.
- **QA-7 — C2PA validation:** Match a trusted reference validator across the supported test fixtures, including valid manifests, tampered content, untrusted signers and legacy or unsupported cases. Clearly distinguish cryptographic validation from trust in a signer or the truth of the depicted scene.
- **QA-8 — File integrity:** Calculate and preserve the hash of the exact uploaded bytes before any transformation. Verification must correctly distinguish exact byte matches from visually similar or modified images.
- **QA-9 — Reliability and security:** Supported valid files must process without crashes or indefinite hangs. Include malformed and adversarial test files, enforce file-size and resource limits, and reject unsupported inputs safely.
- **QA-10 — Provenance creation and verification:** Verify that a created record is bound to the correct file fingerprint and that subsequent verification correctly identifies matching and non-matching files. Clearly state that registration proves a record was created for particular bytes; it does not independently prove authorship, capture time or event authenticity.

### 12.4 Release decision

R1 may ship when the deterministic functionality passes its applicable tests, unsupported or ambiguous cases are handled safely, and reports clearly communicate limitations.

Advanced AI detection may be introduced in a later release after a larger held-out benchmark demonstrates acceptable performance for the specific claims and use cases being enabled.

Every release must preserve the distinction between **Verified**, **Detected**, **Inferred** and **Inconclusive** findings. No single detector score or missing metadata field should be treated as conclusive proof of authenticity or manipulation.

## 13. Build plan, agent guardrails and acceptance criteria

### 13.1 Build order

One sequence replaces v2.0's two. Each step ends with passing tests and a staging deploy.

**Release 1: Analyze**

1. Repository, CI, environments, infrastructure as code, observability, OpenAPI skeleton, design tokens.
2. Schema for R1 tables; anonymous sessions; config table; audit log.
3. Signed upload, magic-byte validation, limits, malware scan, sandboxed decode (AN-1 to AN-8).
4. SHA-256, pHash, identity fields (AN-9 to AN-11).
5. ExifTool worker, raw storage, normalisation, GPS gating (AN-12 to AN-14).
6. Timestamp engine (AN-19 to AN-22).
7. Source and software detection, AI disclosures from metadata (AN-15 to AN-18).
8. C2PA worker with Trust List handling and five states (AN-23 to AN-27).
9. File-structure forensics (AN-28).
10. Detector interface with two adapters; scores stored, labels off (AN-29 to AN-33).
11. Evidence store, rules engine, reproducibility test (§4).
12. Result dashboard, drawers, limitations, delete (AN-34 to AN-37).
13. Benchmark corpus and harness; tune thresholds; run the release gate (§12).
14. Legal pages, abuse procedure, rate limits, security review. Ship R1.

In parallel from step 1, by the product owner: benchmark image collection, legal documents, detector vendor selection, C2PA conformance application, payment-provider onboarding.

**Release 2: Accounts and paid depth**

15. Accounts, magic link, OAuth, session claim (§7.1).
16. Quick and Deep tier split in the pipeline and API (§7.2).
17. Ledger, wallet, hold/capture/release, idempotency, reconciliation job (§7.4).
18. Products, prices, payment adapters, verified webhooks, reversals, receipts (§7.5).
19. Report generator (PDF and JSON parity), report hash check, email link (§6).
20. Share links and public share page; election landing variant (§2.4).
21. Admin console (§7.6).
22. Penetration test, restore drill, load test at twice launch capacity. Ship R2.

**Release 3: Create and Verify**

23. Signing service on KMS, key publication, TSA client, offline verification doc (§5.3).
24. Provenance schema, registration flow, declarations UI (§5.1, §5.2).
25. Event chain and append-only enforcement (PR-9).
26. Verify by URL and by upload, in-browser hashing, scoped similarity search (§5.4).
27. Duplicates, disputes, withdrawal, takedown tooling (§5.5).
28. Security review of signing and public pages. Ship R3.

### 13.2 Guardrails for coding agents

The agent MUST NOT:

1. Use missing metadata or missing C2PA as support for any AI, editing or deception finding.
2. Treat editor metadata as evidence of deception.
3. Label any timestamp or source as Verified without a passed cryptographic check against a trusted root.
4. Use a language model to read, infer, complete or correct metadata, hashes, C2PA results or detector scores.
5. Emit a single real/fake score, an authenticity percentage, or an AI-likelihood percentage.
6. Show an AI label before the §12 gate is recorded as passed in config.
7. Display or export GPS coordinates without the explicit reveal and opt-in.
8. Create a public object URL or serve an original upload from the app origin.
9. Convert a Declared value to any other tier, or render it without its tag.
10. Use "authentic", "genuine", "owner", "original", "certified" or "court-admissible" in UI or report copy.
11. Call platform records "C2PA" or "Content Credentials".
12. Grant credits from a client callback, trust a client-sent balance or price, or mutate a ledger row.
13. Charge twice for one idempotency key, or capture a hold for a failed job.
14. Reveal the existence of a private record or another user's object by any response difference.
15. Hard-code a price, credit cost, limit, threshold or detector name outside config and adapters.
16. Add any logic that depends on a person, party, candidate or the truth of a depicted claim.
17. Retain an image past its retention clock, or log image content, metadata values or hashes to analytics.
18. Implement its own C2PA parser, cryptographic primitive or payment card form.

The agent MUST: version every analyzer, ruleset and detector; store raw output beside normalised output; write tests with fixture images for every analyzer; keep the findings object as the only input to presentation; record a decision note whenever it deviates from a default in this document.

### 13.3 Acceptance criteria

**Release 1**

- [ ] Anonymous user uploads each of the five formats on desktop and mobile and gets a result within the §9 latency targets.
- [ ] All seven error states in AN-7 render correctly; none leaves an orphaned file.
- [ ] SHA-256 matches an independent tool on 100 sample files.
- [ ] Raw ExifTool output is stored and every displayed metadata value traces to it.
- [ ] Unzoned EXIF times display as unzoned; anomaly flags fire on fixtures.
- [ ] C2PA fixtures produce all five states correctly (QA-7).
- [ ] Rules engine reproduces identical findings from stored evidence (EV-10).
- [ ] Conflict fixture (camera EXIF plus strong detector) shows "Conflicting evidence".
- [ ] Benchmark gate result is recorded; AI labels are on only if it passed.
- [ ] Delete removes image, previews and evidence; verified in storage.
- [ ] Malformed-file set causes no crash or hang (QA-9).
- [ ] Terms, privacy notice, acceptable-use policy and the AB-2 procedure are live.
- [ ] WCAG 2.1 AA audit passes on upload and result screens.

**Release 2**

- [ ] Anonymous result survives sign-up (AC-5).
- [ ] Deep Analysis computes the additional stages in §7.2, not merely reveals hidden output.
- [ ] Concurrent double-submit with one idempotency key yields one job and one hold.
- [ ] Forced job failure releases the hold; Inconclusive result captures it.
- [ ] Replayed and forged webhooks grant nothing; valid webhook grants exactly once.
- [ ] Chargeback simulation produces a reversal and blocks paid actions on negative balance.
- [ ] Nightly reconciliation passes; injected drift raises an alert.
- [ ] Price change in admin takes effect without deploy.
- [ ] PDF and JSON pass the parity test; report hash check works.
- [ ] Share page omits image, GPS and file name by default; revoke works at once.
- [ ] Admin actions appear in the audit log with reasons.
- [ ] Penetration-test high and critical findings are closed; restore drill meets §9.

**Release 3**

- [ ] Registration produces a record whose signature and timestamp token verify offline using only published keys and the documented procedure.
- [ ] Records created before a key rotation still verify after it.
- [ ] Declarations render as Declared on the web page, PDF and JSON.
- [ ] Contradiction between a declaration and detected evidence is shown (PR-3).
- [ ] Exact match, no match, visually similar and record-problem outcomes each show the exact VR-3 wording.
- [ ] One-byte change to a registered file yields "does not match".
- [ ] Private record is undiscoverable through verify, similarity, timing and error responses.
- [ ] Duplicate registration shows count and earliest date without exposing private registrants.
- [ ] Dispute and withdrawal flows work end to end; tombstone persists.
- [ ] No database role used by the application can update or delete provenance events or ledger rows.

## 14. Open decisions for the product owner

None of these blocks starting R1 step 1, but each blocks the step named. Until decided, the team builds to the default.

| # | Decision | Default in this PRD | Blocks |
| --- | --- | --- | --- |
| 1 | Product name spelling and domain | "Oyokometa" (v2.0 also used "Oyokomet") | Step 1 branding, key URL in PR-6 |
| 2 | Operating legal entity, data controller, hosting region | Not set | Legal pages (step 14) |
| 3 | AI detector vendor(s) and budget per analysis | Two adapters, vendor open | Step 10 |
| 4 | Whether to launch R1 without AI labels if the gate fails | Yes | Step 13 |
| 5 | File and retention limits in §3.1 and §8.3 | 25 MB; 24 hours anonymous; 30 days signed-in | Steps 3, 14 |
| 6 | Free allowance | 3 per session per day anonymous, 10 per day signed-in | Step 16 |
| 7 | Credit costs and packs | §7.3 | Step 18 |
| 8 | Currency prices in NGN and USD; VAT treatment | Not set | Step 18 |
| 9 | Payment providers | One Nigerian, one international | Step 18 |
| 10 | Credit expiry | Schema supports both; v2.0 said non-expiring, which is an open-ended liability | Step 17 |
| 11 | Refund window for unused credits | 14 days | Step 18 |
| 12 | Pursue C2PA Conformance Program now | Yes, apply during R1 | C2PA embedding only |
| 13 | Time-stamping authority provider | Any RFC 3161 TSA with a published policy | Step 23 |
| 14 | Thumbnail on public verify pages | Off unless registrant enables | Step 26 |
| 15 | Who reviews disputes and abuse reports, and the service hours | Not set | Steps 14, 27 |
| 16 | Election landing variant: ship with R2 or hold | Ship with R2 | Step 20 |

## 15. Location module (post-R3)

The Location module translates location metadata already embedded in an image into a Nigerian Digital Postcode, and lets registrants declare a postcode on a provenance record. It never determines where a photo was taken. It is not part of R1 to R3 and must not delay them.

### 15.1 What it does

| Capability | Input | Output | Tier |
| --- | --- | --- | --- |
| Resolve embedded location | EXIF GPS in the file | Postcode, state, LGA, distance to nearest building, confidence grade | Detected |
| Declare a location | Registrant picks a postcode in Create | Postcode on the provenance record | Declared |
| Compare | Declared postcode vs resolved postcode | Deepest segment at which they agree (state, LGA, district, area, building) | Inferred |

Expected coverage is low for forwarded images, because major messaging and social platforms generally strip GPS metadata. The module is most useful for files submitted directly from the capturing device by observers, newsrooms and investigators.

### 15.2 Dependency: NIPOST Digital Postcode API

| Item | Detail from the published docs |
| --- | --- |
| Endpoint | `GET https://api.postcode.gov.ng/v1/search/reverse?lat&lng&max_distance_m` |
| Returns | Nearest unit postcode, `distance_m`, `confidence` (high, medium, low), area, district and state codes, `found=false` when nothing is in range |
| Radius | Default 25 m, hard ceiling 250 m |
| Names | State, LGA and locality names need a key granted lookup level 2 |
| Auth | `X-API-Key` header; secret keys server-side only; live keys need verified KYB |
| Cost | Search endpoints consume no credits; lookups at level 2 and above do |
| Sandbox | Test keys resolve only a small set of public FCT buildings |
| Not available | Postcode-to-coordinates (level 5, restricted) |
| Maturity | API version 0.1.0; docs disagree on code length and on which levels are commercial |

### 15.3 Requirements

- **LOC-1** Resolution runs only when the file contains GPS metadata and the analysis owner opts in per analysis. No GPS, no call.
- **LOC-2** Calls are made server-side through a `PostcodeProvider` adapter using a secret key. Only latitude, longitude and radius are sent; never the image, hash, file name or user identity.
- **LOC-3** Use the default 25 m radius. Record `distance_m`, `confidence` and `radius_m` as returned. Do not widen the radius to force a match.
- **LOC-4** Coordinates outside Nigeria, or `found=false`, produce the item "Embedded location is outside Digital Postcode coverage or matched no registered building". No inference follows.
- **LOC-5** Fixed wording for a hit: "Embedded location metadata resolves to postcode \[code\], \[LGA\], \[State\], \[n\] m from the nearest registered building. Location metadata can be edited or removed and is not proof of where the image was taken."
- **LOC-6** The evidence item is tier Detected, strength weak, and never changes the origin or AI finding in §4.2.
- **LOC-7** Visibility: the full postcode is shown only to the analysis owner. Share pages and public verify pages show state and LGA at most, and only if the owner enables it.
- **LOC-8** The "recent house address" and building-use fields are never requested for display, never stored, and never shown.
- **LOC-9** In Create, a registrant may declare a postcode using NIPOST's embeddable widget or typed entry validated by the free level 1 lookup. It renders with the Declared tag.
- **LOC-10** Comparison is done on postcode segments only: reverse-geocode the embedded GPS and report the deepest matching segment. A mismatch renders as "Declared location and embedded location metadata differ at \[segment\] level". A match renders as "consistent with", never "confirmed".
- **LOC-11** Where a declared postcode exists but the file has no GPS, show "No embedded location metadata to compare".
- **LOC-12** Store the resolved postcode in the evidence record subject to the retention period in the NIPOST agreement, and delete it with the analysis.
- **LOC-13** Handle `401`, `402`, `403` and `429` from the provider by returning the analysis without the location item and without charging for it. Respect `X-RateLimit-Remaining`.
- **LOC-14** Priced as a premium action in `action_prices` (default 10 credits per resolution), or bundled into a newsroom or election pack. Failed or `found=false` resolutions are not charged.
- **LOC-15** Election use adds no special logic. A polling-unit or event location is entered as a declared postcode and compared under LOC-10.

### 15.4 Guardrails for coding agents

The agent MUST NOT:

1. State or imply that an image "was taken at" a postcode, address, building, LGA or state.
2. Estimate location from image pixels, landmarks, signage or any model.
3. Call the postcode API without GPS in the file and owner opt-in.
4. Show a full building-level postcode or any address on a public page.
5. Request, cache, log or display the house address or building-use fields.
6. Cache, bulk-store or re-serve postcode data beyond the single evidence item, or build any lookup table from responses.
7. Ship a secret NIPOST key to the browser or a mobile binary.
8. Use a location match or mismatch to alter origin, AI or editing findings.
9. Reference the provider outside its adapter, or depend on level 5 coordinates.

### 15.5 Preconditions and acceptance

Before build starts, the product owner must hold: verified KYB and a live key; a level 2 grant; written NIPOST terms permitting use in paid reports and stating the allowed retention period; published pricing.

- [ ] Fixture with GPS inside Nigeria returns a postcode item with the exact LOC-5 wording.
- [ ] Fixtures with no GPS, GPS outside Nigeria, and `found=false` make no charge and show the correct message.
- [ ] Network capture shows only latitude, longitude and radius leave the platform.
- [ ] Share and verify pages never expose more than state and LGA.
- [ ] Declared-versus-detected fixtures report the correct matching segment at each of the five levels.
- [ ] Provider outage or rate limit degrades cleanly with no failed analysis.
- [ ] Deleting an analysis deletes its resolved postcode.

A capture-time attestation app, which records device location at the moment of capture and signs it with the image, is the only route to strong location evidence. It is a separate product phase and is not specified here.

NIPOST references: [authentication](https://docs.postcode.gov.ng/authentication.md), [reverse geocode](https://docs.postcode.gov.ng/api-reference/reverse-geocode.md), [lookup levels](https://docs.postcode.gov.ng/concepts/lookup-levels.md), [postcode format](https://docs.postcode.gov.ng/concepts/postcode-format.md), [acceptable use policy](https://postcode.gov.ng/acceptable-use).

## Sources

- [C2PA Conformance Program and Trust List FAQ](https://c2pa.org/?p=25): claim-signing certificates come from CAs on the C2PA Trust List.
- [C2PA Trust List launch notice](https://c2pa.org/?p=122): Interim Trust List retired in favour of the official list from 1 January 2026.
- [Content Authenticity Initiative: getting a signing certificate](https://opensource.contentauthenticity.org/docs/signing/get-cert): from 2026, conforming generator products must use a Trust List CA certificate.
- [C2PA Content Credentials Deployment Guidance, July 2026](https://c2pa.org/wp-content/uploads/sites/33/2026/07/Content-Credentials-Deployment-Guidance.pdf): conformance programme status and queue.
- [FauxScan](https://fauxscan.com/): reference site; only page metadata was readable.
