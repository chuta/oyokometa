# Oyokometa Civic Evidence

## Product Requirements Document (PRD)

**Version:** 1.0\
**Prepared:** 25 October 2026\
**Status:** Implementation-ready product specification\
**Product:** Oyokometa --- Civic Evidence extension to the existing
Capture, Analyze, Create and Verify platform

------------------------------------------------------------------------

## 1. Executive Summary

Oyokometa Civic Evidence is a citizen-powered evidence intake, review
and claim-verification workflow built on top of Oyokometa's existing
Capture and provenance capabilities.

It enables citizens, journalists, election observers, fact-checkers and
authorized civic organizations to submit questionable election-related
media or incident reports; preserve relevant evidence; document the
claim attached to that evidence; examine the file and corroborating
sources; conduct human review; and publish a careful, transparent
finding when justified.

**Civic Evidence is not an election-results platform, an official
election authority, an automatic truth detector, or a public accusation
feed.** It must not declare winners, replace INEC's official results
infrastructure, or label a file "true" or "fake" solely from an AI
detector, metadata field, browser signal or cryptographic signature.

### Product promise

> **See something questionable? Submit the claim. Preserve the evidence.
> Help us check it.**

### Core product principle

Keep four concepts separate in the data model and user experience:

1.  **File integrity:** Is this file byte-for-byte the same as the file
    registered by Oyokometa?
2.  **Technical signals:** What does the file contain or report, and
    what can technical analysis detect?
3.  **Claim assessment:** What evidence supports or contradicts the
    specific claim attached to the file?
4.  **Editorial/reviewer finding:** What conclusion, if any, can an
    authorized human reviewer responsibly publish?

A valid signature proves a defined integrity property of a record. It
does not prove authorship, the truth of a caption, the physical location
of a camera, the event's occurrence, or the authenticity of every
depicted detail.

------------------------------------------------------------------------

## 2. Goals, Non-Goals and Success Criteria

### 2.1 Goals

-   Extend the existing Capture workflow without replacing or breaking
    it.
-   Link capture requests and registered evidence records to a
    structured Civic Evidence case.
-   Support public submissions about questionable election-related media
    and incidents.
-   Provide secure, role-based evidence review and case management.
-   Preserve source files and integrity metadata while separating
    sensitive source identity from public case information.
-   Support transparent, human-reviewed findings with source links,
    limitations, corrections and appeals.
-   Enable a limited, human-reviewed polling-unit result-sheet
    comparison pilot after the core workflow is stable.
-   Create a foundation for newsroom, fact-checking and civil-society
    partnerships.
-   Keep the ordinary citizen submission path free during the initial
    civic pilot.

### 2.2 Non-goals for the initial release

Do not build these in the MVP:

-   A nationwide election observer network or volunteer deployment
    system.
-   A parallel election-results tabulation platform.
-   Winner projections, seat projections, or declarations of election
    outcomes.
-   An automated fraud detector or automatic public accusation engine.
-   Public, real-time maps of individual reporters or precise incident
    locations.
-   Automatic publication of all submissions.
-   A public searchable database of source identities or unredacted
    original evidence.
-   A new image-signing standard intended to replace C2PA or other
    established standards.
-   A promise that browser camera capture proves a physical camera was
    used.
-   A promise that device-reported GPS proves the camera was physically
    at a particular point.
-   An assumption that absence of metadata or Content Credentials means
    an image is fake.
-   A dependency on adding more AI detectors before the case-management
    workflow is useful.

### 2.3 Initial success criteria

Set actual targets with the product owner after baseline testing. At
minimum, instrument:

-   Number of complete, actionable submissions.
-   Median time from submission to first reviewer action.
-   Median time from submission to a defensible finding or referral.
-   Share of cases with adequate corroborating sources.
-   Correction and appeal rates, including reasons.
-   Reviewer agreement on a sample of cases.
-   OCR error rate on result-sheet fields, if that pilot proceeds.
-   Cost per reviewed case and reviewer hours per case.
-   Partner adoption and repeat usage.
-   Public comprehension of the difference between file integrity and
    claim truth.
-   Privacy or safety incidents, unauthorized access, and evidence-loss
    incidents.

Do not optimize for raw submission volume at the expense of safety,
review quality or accuracy.

------------------------------------------------------------------------

## 3. Product Architecture and Existing Oyokometa Capabilities

### 3.1 Extend the existing product

Keep the existing public navigation and capabilities:

-   **Analyze:** inspect an existing file and its technical signals.
-   **Create:** register a file and issue a platform-signed provenance
    record.
-   **Capture:** request a photo through a one-time browser capture
    session and register the received file.
-   **Verify:** check whether a file matches an existing registered
    record.
-   **Civic Evidence (new):** submit a claim, link evidence, manage
    review, document findings and publish a redacted case page.
-   **Services:** existing institutional service and solution-request
    pathways remain available.

Do not duplicate the file-analysis engine, signing implementation,
record verifier, account system, payment system or existing storage
layer if reusable production components already exist. Inspect the
current repository and architecture first.

### 3.2 Existing Capture record capabilities observed in the current product

The supplied Capture record page currently displays concepts including:

-   Registration time set by the Oyokometa server.
-   Signature status and a platform-signed record.
-   An independent timestamp token indicator.
-   File properties such as format, size and dimensions.
-   A statement that the file matches the signed record.
-   A statement that the file is unchanged since receipt.
-   A browser-reported "live camera" session signal, with a caveat that
    it does not prove which physical device was used.
-   Device-reported location and approximate location uncertainty.
-   User declarations, including a requested photo description and
    stated address.
-   Recorded events.
-   A file-detail view and QR code.
-   A compare-file-to-record workflow.

Preserve the current meaning and security properties of these features.
Reuse them through existing APIs or domain services where possible. Do
not implement a parallel signing or hashing system without a
demonstrated technical need.

### 3.3 Important terminology and claim boundaries

Use explicit labels throughout the product:

-   **Verified:** a defined check succeeded, such as an exact
    cryptographic file match or signature verification. Always specify
    what was verified.
-   **Detected:** a value or signal was read or detected from the file
    or a tool.
-   **Inferred:** a conclusion suggested by analysis but not directly
    established.
-   **Declared:** a statement supplied by a person and not independently
    confirmed.
-   **Inconclusive:** available evidence is insufficient to responsibly
    resolve the question.

Never use "Verified" without naming the proposition verified. For
example, "File matches registered record" is acceptable; "Image
verified" may incorrectly imply that the depicted event is true.

### 3.4 Architecture principle

Civic Evidence should be a new case-management and review domain that
references existing evidence records. Prefer foreign keys or stable
references to the existing Capture record and storage objects rather
than copying the entire file or reimplementing Capture.

The exact repository structure, database, framework, auth model,
storage, server functions and deployment setup must be discovered by the
coding agent before implementation. Do not assume a stack or invent new
infrastructure when existing components can safely be extended.

------------------------------------------------------------------------

## 4. User Types, Roles and Permissions

Implement least-privilege access. Role names may map to the existing
authorization system, but the permissions below are requirements.

### 4.1 Public contributor

Can: - Submit a claim or incident report. - Provide source URLs, claimed
event time and approximate location. - Choose whether to request browser
capture, upload existing evidence if the current product and policy
permit it, or submit a source link. - Review the privacy and publication
notice before submission. - Receive a case reference and see only the
status/details explicitly approved for contributor access. - Submit
additional information or request correction through a controlled
process.

Cannot: - See another contributor's private submissions. - Access
reviewer notes, restricted evidence, source identities or unpublished
allegations. - Publish an unreviewed submission directly to the public
case library.

### 4.2 Evidence contributor / invited capture recipient

Can: - Open a valid, unexpired one-time capture link. - Read the capture
purpose, instructions, consent and privacy notice. - Grant browser
camera permission and submit a capture if supported. - See a clear
success/failure state and the limited receipt information the workflow
permits.

Cannot: - Reuse an expired or already-consumed link. - Access the
internal case or other evidence associated with the case. - Alter a
registered file after submission without creating a new, separately
recorded evidence item.

### 4.3 Reviewer

Can: - Access assigned cases and authorized evidence. - View technical
analysis, declarations, source links and prior case history. - Add
internal notes and structured evidence assessments. - Request more
information, mark cases for corroboration, recommend a finding, or refer
a case. - Compare documents and record the basis for a finding.

Cannot: - Publish a finding unless separately granted publication
permission. - See reporter identity unless the role and case assignment
explicitly authorize it. - silently overwrite original evidence, prior
findings or audit events.

### 4.4 Senior reviewer / editor

Can: - Review proposed public findings. - Approve, reject, or return a
finding for additional work. - Publish, update, unpublish or correct a
public case page with a recorded reason. - Manage appeals and reopen
cases. - Apply sensitive-case restrictions.

### 4.5 Administrator

Can: - Manage users, roles, case assignment, retention configuration and
system settings. - Access audit logs for legitimate operational/security
purposes. - Revoke capture requests and respond to security incidents.

Administrator access must not automatically make all sensitive reporter
details visible to every administrator. Use explicit permission
boundaries and audit privileged access.

### 4.6 Public reader

Can: - View published case summaries and their review history. - See
public evidence descriptions, redacted media where approved, source
citations, methodology, limitations and corrections. - Report a factual
error or submit an appeal.

Cannot: - Access private submissions, raw source details, unredacted
sensitive media, internal notes or reporter identity.

------------------------------------------------------------------------

## 5. Core User Journeys

### Journey A: Citizen submits a questionable political image

1.  User opens **Civic Evidence → Check a viral photo or video**.
2.  User enters the specific claim or caption they want checked.
3.  User provides a post URL or source, where available.
4.  User provides the media or requests a capture session if
    appropriate.
5.  User supplies optional claimed event date, broad location,
    election/event and context.
6.  Product explains what will be private, what may be published, and
    what data is collected.
7.  Submission creates a case with a stable reference.
8.  Evidence is linked to the case; the user sees a receipt and case
    status.
9.  Reviewer examines technical signals and independent sources.
10. A reviewer proposes a finding; an authorized editor approves
    publication if appropriate.
11. Public case page explains the exact claim, evidence, conclusion and
    limitations.

### Journey B: Journalist requests a capture from a source

1.  Authorized user creates a case or opens an existing case.
2.  User selects **Request evidence via Capture**.
3.  User selects a purpose and writes clear, neutral instructions.
4.  System creates a single-use, short-lived capture link linked to the
    case.
5.  Recipient opens the link and sees the capture purpose, consent and
    privacy terms.
6.  Recipient captures and submits the photo through the existing
    browser Capture process.
7.  The existing Capture engine creates its signed record.
8.  The new record is linked to the case and shown in the evidence list.
9.  Reviewer assesses the record's integrity claims separately from the
    claim about the scene.

### Journey C: Reviewer investigates a claim

1.  Reviewer opens an assigned case.
2.  Reviewer reads the exact claim, contributor declaration, source URL
    and case history.
3.  Reviewer examines linked evidence and its Capture record.
4.  Reviewer checks available metadata, Content Credentials, hashes,
    duplicate/similarity signals and relevant sources.
5.  Reviewer records support, contradiction, unknowns and alternative
    explanations.
6.  Reviewer selects a proposed claim assessment and explains the
    rationale.
7.  Senior reviewer approves, rejects or returns the proposed finding.
8.  If approved, the public case page is generated from an explicit
    redacted/publication payload.
9.  Any later correction creates a new version and audit event; it must
    not erase the earlier finding history.

### Journey D: Result-sheet comparison

1.  Contributor identifies the election and claimed polling unit.
2.  Contributor submits a result-sheet image or source link.
3.  System preserves the source and runs OCR where available.
4.  OCR output is labelled **Machine-extracted --- not yet confirmed**.
5.  Reviewer confirms the polling-unit identifier and critical figures
    against the submitted image.
6.  Reviewer obtains the corresponding official result document where
    available.
7.  System displays a comparison and highlights potential differences.
8.  Human reviewer confirms or dismisses each highlighted difference.
9.  Finding is limited to the documents and figures actually compared.
10. No outcome projection or fraud declaration is generated
    automatically.

------------------------------------------------------------------------

## 6. Public Information Architecture and Screens

Add a **Civic Evidence** navigation entry without disrupting existing
Analyze, Create, Capture, Verify, Services and Account navigation.

### 6.1 Civic Evidence landing page

Purpose: explain the service, route submissions and set expectations.

Required content: - Headline: **"See something questionable? Submit the
claim. Preserve the evidence. Help us check it."** - Short explanation
of the service and limitations. - Three primary actions: 1. **Check a
viral photo or video** 2. **Check a polling-unit result sheet** 3.
**Report an election incident** - A visible statement that submissions
are not automatically published. - A concise explanation of the
distinction between file integrity and claim truth. - Links to
methodology, privacy, safety, corrections and appeals. - A public
library of reviewed cases only; never show an unmoderated feed by
default.

### 6.2 Submission form: viral media

Required: - Claim/caption being checked. - Source URL, if available. -
Evidence method: submit existing media if supported, provide a source
link, or request a Capture session where appropriate. - Election/event
context or "not sure." - Claimed event date/time with "unknown"
permitted. - Broad claimed location with "unknown" permitted. - Optional
explanation/context. - Consent and privacy acknowledgement. - Clear
submit confirmation and case reference.

Do not require a citizen to know metadata, file hashes, official
polling-unit codes or technical terminology.

### 6.3 Submission form: result sheet

Required: - Election name/type and date, with unknown/other options. -
State, LGA and claimed polling-unit identifier where known. - Source URL
or media evidence. - What discrepancy or concern is being reported. -
Claimed time of the event or upload, where known. - Consent and privacy
acknowledgement.

The UI must say that submitted figures are not official results until
compared with the relevant official source and reviewed. Do not require
users to declare that fraud occurred.

### 6.4 Submission form: incident report

Required: - Incident category: intimidation/threats, vote-buying
allegation, obstruction, violence/safety concern, campaign-rule concern,
access issue, other. - General description of what the contributor
observed or what was reported to them. - Distinguish "I witnessed this"
from "someone told me" or "I saw this online." - Approximate event time
and broad location, if safe to provide. - Evidence/source link, if
available. - Optional request for restricted handling. - Clear warning
not to put themselves at risk to gather evidence. - Consent/privacy
notice.

For imminent danger, display an appropriate, configurable safety message
directing users to relevant local emergency or trusted support channels.
Do not imply that submitting to Oyokometa is an emergency-response
service.

### 6.5 Case receipt page

Display: - Case reference. - Submission received date/time. - Current
workflow status. - What happens next. - Whether the case is private,
under review or published. - How to provide additional information or
report an error. - No reviewer-only notes or sensitive information.

### 6.6 Public case page

Required fields: - Case reference and publication/update dates. - Exact
claim being assessed. - Claim assessment and plain-language
conclusion. - Summary of the evidence examined. - Sources and links,
with publication context. - Technical evidence summary with clear
Verified/Detected/Inferred/Declared labels. - What the evidence does not
establish. - Methodology and reviewer/editorial process. - Relevant
media with appropriate redaction and accessible descriptions. -
Correction/appeal link and version history. - Any conflict-of-interest
or limitation disclosure needed for the case.

Never publish a contributor's identity, private contact information,
exact private address or precise source coordinates by default.

### 6.7 Internal reviewer case workspace

Provide: - Case summary and workflow status. - Claim text and provenance
of the claim. - Linked evidence records and Capture session. - Source
URL list. - Technical analysis and comparison tools. - Reviewer notes,
visible only to authorized roles. - Structured evidence matrix: supports
/ contradicts / neutral / unknown. - Alternative explanations and
unresolved questions. - Proposed assessment, rationale and confidence
explanation in plain language. - Assignment, review checklist and
activity timeline. - Publication preview using the exact public/redacted
payload. - Approve / return / reject / refer / close / reopen actions
based on role. - Correction and appeal management.

------------------------------------------------------------------------

## 7. Claim Assessment Framework

The case conclusion applies to the **specific claim**, not to the file
in the abstract.

Suggested public assessment values:

-   **Corroborated:** available independent evidence supports the claim
    as stated.
-   **Contradicted:** reliable evidence conflicts with a material part
    of the claim.
-   **Misleading context:** the media may be genuine, but its caption,
    date, location or context materially misleads.
-   **Partly supported:** some material parts are supported while others
    are not.
-   **Inconclusive:** available evidence is insufficient to resolve the
    claim responsibly.
-   **Unable to assess:** essential material is inaccessible, missing or
    not suitable for assessment.
-   **Withdrawn / superseded:** a previous assessment is no longer the
    active conclusion; retain the history and reason.

Do not treat "not proven" as "false." Do not treat "corroborated" as
absolute certainty. Every assessment must have a written rationale and
evidence references.

### 7.1 Workflow status is separate from claim assessment

Suggested workflow statuses: - `received` - `triage` - `under_review` -
`awaiting_corroboration` - `awaiting_contributor` - `proposed_finding` -
`editor_review` - `published` - `referred` - `closed` - `reopened` -
`withdrawn`

A case can be `under_review` while its assessment is unset or
`inconclusive`. Do not conflate workflow status with finding.

### 7.2 Confidence

Do not expose a single numerical "truth score" or make a confidence
percentage the headline. If confidence language is used, explain the
basis and limitations. Use reviewer-supported descriptors such as
limited, moderate or strong support only if the organization adopts a
documented rubric and trains reviewers to apply it consistently.

### 7.3 Required finding checklist

Before a finding is publishable, the reviewer should confirm: - The
claim is quoted accurately and scoped narrowly. - Sources are identified
and independently evaluated. - The submitted evidence matches the
evidence described in the report. - File-integrity claims are not
confused with event truth. - Metadata and AI-detection results are not
treated as definitive proof. - Alternative explanations and important
uncertainties are documented. - Sensitive personal information has been
removed or justified. - The finding does not imply a result or
conclusion beyond the reviewed evidence. - A second reviewer/editor has
approved publication according to policy.

------------------------------------------------------------------------

## 8. Capture Integration Requirements

### 8.1 Reuse the current Capture system

The coding agent must inspect the existing Capture implementation and
preserve the current behavior for: - One-time capture sessions, where
already implemented. - Browser camera flow. - Existing signed record
generation. - Timestamp token behavior. - File hashing and exact-match
verification. - Location capture and uncertainty display. -
Declarations. - Event logging. - Existing public/private record options,
where applicable.

Do not change existing Capture semantics without a migration plan and
regression tests.

### 8.2 Case-linked capture requests

Add the ability for an authorized reviewer to create a capture request
linked to a Civic Evidence case.

A capture request should have: - Unpredictable public token or secure
token hash. - Associated `case_id`. - Request creator and authorization
record. - Capture purpose and neutral instructions. - Creation time,
expiry time and revocation state. - Single-use state. - Recipient
consent state, if needed by the existing implementation. -
Accepted/rejected/expired event history. - Rate limits and abuse
controls.

Never store a reusable raw secret in logs. Store a secure token hash
where the architecture supports it, and reveal the one-time link only at
creation.

### 8.3 Recipient experience

Before activating the camera, show: - Why the photo is requested. - What
the recipient is being asked to photograph. - What data may be
collected. - Whether location is optional and how it will be used. - Who
can access the evidence. - Whether any part may become public. - How to
decline or exit.

Do not silently enable location collection. Do not imply that a camera
permission or browser signal proves a physical camera, a truthful scene
or a capture time.

### 8.4 Evidence linking

On successful capture: - Preserve the existing Capture record as the
authoritative integrity record for the received file. - Link the
resulting evidence record to the relevant case. - Store the relation and
event in the case audit timeline. - Display the existing record's
integrity result with accurate wording. - Do not copy or overwrite the
source file unnecessarily. - If a file is recaptured, edited or
replaced, create a new evidence item and retain the relationship to the
prior item.

### 8.5 Location and browser signals

Treat device-reported location, browser user-agent and camera-session
indicators as untrusted context. Clearly label them as reported by the
device/browser. Do not use them as sole grounds for a public claim about
where or how an image was captured.

Default public pages should show only a sufficiently broad location when
location is safe and relevant. Exact coordinates should remain
restricted unless an authorized reviewer explicitly approves publication
for a documented reason.

------------------------------------------------------------------------

## 9. Evidence and Source Management

Each case may contain multiple evidence items: - Original submitted
media. - Oyokometa Capture record. - Source URL or social post. -
Official document or public record. - Screenshot or archived copy, where
lawful and appropriate. - Similar or duplicate media. -
Reviewer-generated comparison. - OCR output. - Witness or contributor
statement. - Correction or additional evidence.

For every evidence item, record: - Stable ID. - Case ID. - Evidence
type. - Source/origin type. - Source URL or Capture record reference,
when available. - Received/registered timestamp. - File hash and
existing record reference, where applicable. - Integrity/verification
state. - Access classification. - Redaction/publication state. -
Added-by identity or controlled system actor. - Relevant declaration and
source limitations. - Audit events.

### 9.1 Source evaluation

Reviewers should record: - Whether the source is primary, secondary or
unknown. - Whether the source is independent of other cited sources. -
Publication date versus claimed event date. - Whether the source can be
revisited or archived. - Whether a source is an official record, a
witness statement, a media report or a social post. - Conflicts, missing
context or known limitations.

Do not present a source's existence as proof that its contents are
correct.

### 9.2 Duplicates and visual similarity

If the existing product supports exact hashing, reuse it. If perceptual
matching is added, clearly distinguish: - **Exact match:** file bytes
match the registered file under the specified hash algorithm. - **Visual
similarity candidate:** two files may depict the same or similar visual
content, but are not necessarily identical. - **Human-confirmed
relation:** reviewer determined a relationship and recorded the
rationale.

Perceptual similarity must not be described as a cryptographic match.
Crops, recompression, screenshots, edits and different frames may
produce different results.

### 9.3 AI detection and metadata

-   Detector output is a signal, not a verdict.
-   Do not average uncalibrated detector scores into a "probability of
    fake."
-   Show the tool/model and limitations to reviewers where technically
    feasible.
-   Use AI-detection results as leads for corroboration, not as the sole
    basis for a public finding.
-   Missing EXIF, C2PA or other metadata does not prove an image is
    synthetic or deceptive.
-   Metadata values can be absent, modified, incorrect or fabricated.
-   C2PA/Content Credentials should be checked using
    standards-compatible verification where supported; do not invent a
    replacement trust standard.

------------------------------------------------------------------------

## 10. Result Sheet Evidence Check: Limited Pilot

This feature is conditional on successful completion of the core Civic
Evidence workflow and evidence of partner demand.

### 10.1 Scope

-   Accept an image or public URL for a claimed polling-unit result
    sheet.
-   Capture election and polling-unit identifiers as declarations until
    checked.
-   Run OCR using an existing or selected service if appropriate.
-   Show OCR output as unverified machine extraction.
-   Allow reviewers to correct OCR values against the visible image.
-   Allow the reviewer to attach the relevant official document/source.
-   Compare the submitted document with the official document.
-   Highlight differences for manual review.
-   Record which source documents and versions were compared.
-   Publish a narrow finding on the documents/figures compared.

### 10.2 Do not build in the pilot

-   Nationwide aggregation of unofficial results.
-   Winner prediction or declarations.
-   Automatic fraud labels.
-   Public leaderboards of alleged discrepancies without review.
-   Automatic conclusions that a discrepancy represents deliberate
    manipulation.

### 10.3 Comparison rules

-   Never compare figures without confirming that documents refer to the
    same election, location, polling unit and relevant version.
-   Preserve original images and source links.
-   Keep OCR output, human-corrected values and official-source values
    as separate fields.
-   Record who confirmed each critical value and when.
-   Clearly identify unavailable official documents.
-   A discrepancy should create a review task, not an automatic
    accusation.
-   Explain that an official-source mismatch can have multiple causes
    and must be investigated.

------------------------------------------------------------------------

## 11. Data Model: Proposed Logical Entities

Adapt names and fields to the existing database conventions. Do not
create duplicate entities if equivalent production models already exist.
Use migrations and preserve existing data.

### 11.1 `civic_cases`

Suggested fields: - `id` --- internal primary key. - `public_reference`
--- unique, non-sequential case reference. - `case_type` ---
`viral_media`, `result_sheet`, `incident`, `other`. - `title` ---
concise internal/public-safe title. - `claim_text` --- exact claim being
assessed. - `claim_source_url` --- nullable. - `claimed_event_at` ---
nullable, declared date/time. - `claimed_event_time_precision` ---
exact/date-only/approximate/unknown. - `claimed_location_text` ---
nullable declaration. - `location_precision` ---
broad/approximate/exact/unknown. - `election_or_event` --- nullable. -
`state`, `lga`, `ward`, `polling_unit_code` --- nullable structured
fields where applicable. - `contributor_id` --- nullable,
access-controlled reference. - `workflow_status`. - `claim_assessment`
--- nullable until assessed. - `assessment_rationale` ---
reviewer-controlled. - `publication_state` ---
private/approved/published/unpublished. - `sensitivity_level`. -
`assigned_reviewer_id` --- nullable. - `created_at`, `updated_at`,
`published_at` --- server timestamps. - `closed_at` --- nullable. -
`reopened_at` --- nullable. - `current_public_version_id` ---
nullable. - `retention_policy_id` --- where needed.

Do not use contributor-provided time as the server's creation timestamp.
Do not use `claimed_location_text` as verified location.

### 11.2 `civic_evidence_items`

Suggested fields: - `id` - `case_id` - `evidence_type` -
`capture_record_id` --- nullable reference to existing Capture record. -
`storage_object_id` --- reference to existing storage object, if
applicable. - `source_url` --- nullable. - `source_type` -
`file_name_display` --- sanitized. - `mime_type` - `file_size` -
`sha256` --- only if already computed or safely added. -
`integrity_state` - `technical_summary` --- structured or JSON field
following existing conventions. - `declaration_json` --- validated,
versioned declarations. - `access_classification` -
`public_redaction_state` - `added_by` - `created_at`

Do not store raw secrets or unnecessary copies of source files in this
table.

### 11.3 `civic_capture_requests`

Suggested fields: - `id` - `case_id` - `token_hash` - `purpose` -
`instructions` - `created_by` - `created_at` - `expires_at` -
`consumed_at` - `revoked_at` - `status` - `linked_capture_record_id` ---
nullable. - `consent_version` - `audit_metadata` --- minimal,
non-sensitive metadata.

Enforce single-use behavior transactionally. Concurrent requests must
not be able to consume the same token more than once.

### 11.4 `civic_sources`

Suggested fields: - `id` - `case_id` - `evidence_item_id` ---
nullable. - `url` - `title` - `publisher_or_origin` - `source_type` -
`published_at` --- nullable. - `accessed_at` - `archived_reference` ---
nullable. - `independence_assessment` - `reliability_notes` - `added_by`

### 11.5 `civic_reviews`

Suggested fields: - `id` - `case_id` - `reviewer_id` - `review_stage` -
`proposed_assessment` - `rationale` - `limitations` -
`alternative_explanations` - `review_checklist_json` - `created_at` -
`updated_at` - `submitted_at`

Preserve prior review submissions. Updates should be versioned or
represented as additional review events rather than silently overwriting
a published rationale.

### 11.6 `civic_evidence_assessments`

Suggested fields: - `id` - `case_id` - `evidence_item_id` -
`relationship` --- supports/contradicts/neutral/unknown. - `statement` -
`basis` - `reviewer_id` - `created_at`

### 11.7 `civic_case_versions`

Suggested fields: - `id` - `case_id` - `version_number` -
`public_payload` --- only explicitly approved public/redacted fields. -
`assessment` - `rationale` - `published_by` - `published_at` -
`change_reason` - `supersedes_version_id` --- nullable.

Published versions should be immutable. A correction creates a new
version and links to the previous one.

### 11.8 `civic_audit_events`

Suggested fields: - `id` - `case_id` - `actor_id` --- nullable for
controlled system events. - `event_type` - `target_type` - `target_id` -
`occurred_at` --- server time. - `reason` --- required for sensitive
actions. - `metadata` --- allowlisted, minimal, non-sensitive fields.

Events include case creation, evidence attachment, capture-request
creation/consumption/revocation, access to restricted evidence,
assignment, status changes, review submissions, publication, correction,
referral, closure and reopening.

Audit records must be append-only to ordinary application roles. Protect
against unauthorized alteration and do not log raw capture tokens,
credentials, private source details or full sensitive payloads.

### 11.9 Optional `civic_appeals`

Suggested fields: - `id` - `case_id` - `public_version_id` -
`submitted_by` --- nullable/restricted. - `reason` -
`supporting_evidence_reference` - `status` - `assigned_editor_id` -
`resolution` - `created_at` - `resolved_at`

------------------------------------------------------------------------

## 12. API and Service Contracts

Use the current project's established API patterns. The following are
logical capabilities, not a mandate to create these exact REST routes if
the existing app uses RPCs, server actions or another convention.

Required operations:

-   Create a case.
-   Submit additional information to an existing case.
-   List only cases the current user is authorized to see.
-   Retrieve case details with role-based field filtering.
-   Create, inspect, revoke and consume a Capture request.
-   Link an existing Capture record to a case.
-   Add an evidence item or source.
-   Add reviewer notes and evidence assessments.
-   Change workflow status with permission and transition validation.
-   Submit a proposed finding.
-   Approve or reject publication.
-   Publish a redacted public case version.
-   Submit and resolve a correction or appeal.
-   Retrieve public case pages by public reference.
-   Retrieve an audit timeline subject to role permissions.
-   Run or retrieve OCR/comparison results for authorized cases, if the
    pilot is enabled.

### API security requirements

-   Enforce authorization server-side for every operation; never rely
    only on hidden UI controls.
-   Validate all user input server-side.
-   Apply rate limits and abuse protection to public submission and
    token endpoints.
-   Protect against IDOR by checking case/evidence ownership and
    permissions on every read/write.
-   Use CSRF protection where applicable to the stack.
-   Sanitize rendered text and URLs; prevent stored XSS and unsafe URL
    schemes.
-   Do not return private fields through public API responses.
-   Use idempotency for operations where retries could duplicate
    submissions, publication events or evidence links.
-   Keep secrets, signing keys and privileged credentials out of client
    bundles and logs.
-   Return safe, actionable errors without leaking private case
    existence to unauthorized users.

------------------------------------------------------------------------

## 13. Security, Privacy, Safety and Abuse Controls

### 13.1 Privacy by design

-   Collect only data needed for the stated purpose.
-   Make optional fields genuinely optional.
-   Explain what is collected, why, who can access it, retention, and
    publication rules before submission.
-   Separate source identity and contact details from public case data.
-   Apply least privilege and audit access to restricted evidence.
-   Redact private addresses, faces, minors, vehicle plates, phone
    numbers and other identifying details when relevant and appropriate.
-   Do not publish precise coordinates by default.
-   Do not embed IP address or precise location in the media file as a
    default behavior.
-   Do not expose browser user-agent strings publicly unless a
    documented purpose justifies it.
-   Establish retention, deletion, legal hold and backup handling
    policies with appropriate legal/privacy review.
-   Support correction and removal requests without silently destroying
    records that must lawfully be retained; document the decision.

### 13.2 Evidence integrity and chain of custody

-   Preserve the original received file where lawful and necessary.
-   Use existing cryptographic hashing and signed record functions.
-   Record server-side events for receipt, access, analysis, redaction,
    export and publication.
-   Do not alter an original evidence object in place.
-   Make transformations (crop, blur, resize, OCR, annotations)
    derivative objects with their own IDs and provenance back to the
    original.
-   Record who performed a transformation, when, why and with which
    tool/version where feasible.
-   Clearly distinguish server receipt time from claimed event/capture
    time.
-   A robust audit log supports traceability but does not itself
    guarantee legal admissibility.

### 13.3 Safety

-   Do not require contributors to approach dangerous situations or
    confront alleged offenders.
-   Keep sensitive incident reports private by default.
-   Avoid publishing a precise live location when it could expose a
    reporter or victim.
-   Provide a documented escalation process for credible threats,
    violence or other urgent safety concerns.
-   Do not imply that Oyokometa is an emergency dispatch service.
-   Restrict reports involving minors, sexual violence, private medical
    information or other highly sensitive content and require special
    review before any disclosure.
-   Do not automatically forward unverified allegations to authorities
    or publish them.

### 13.4 Political neutrality and fairness

-   Apply the same review criteria regardless of political party,
    candidate, office-holder or viewpoint.
-   Do not allow a contributor's political label to determine a case
    outcome.
-   Record conflicts of interest and require reassignment where
    necessary.
-   Separate factual review from political commentary.
-   Publish methodology, correction history and material limitations.
-   Maintain a transparent process for subjects or affected parties to
    submit a response.
-   No automated public accusation or party/candidate guilt score.

### 13.5 Legal and operational review

Before public launch, obtain appropriate review of Nigerian data
protection obligations, election-related legal risks, defamation,
evidence retention, publication standards, consent language and referral
practices. This PRD is a product specification, not legal advice.

------------------------------------------------------------------------

## 14. UX and Accessibility Requirements

-   Responsive, mobile-first design; most citizen submissions are likely
    to arrive from mobile devices.
-   Match the existing Oyokometa design system, navigation and dark
    visual identity with restrained amber/orange accents.
-   Reuse existing components and tokens rather than introducing an
    unrelated visual system.
-   Plain-language instructions; avoid technical jargon in the public
    submission flow.
-   Accessible keyboard navigation, visible focus, semantic headings,
    form labels and error messages.
-   WCAG 2.2 AA should be the target for new public flows where
    practicable.
-   Support slow or unstable connections and clear retry states.
-   Never clear a long form without warning.
-   Clearly show progress, submission success and failure.
-   Distinguish private/internal status from public assessment.
-   Use labels and explanatory text; do not communicate findings by
    color alone.
-   Avoid fear-inducing copy or partisan language.
-   Public pages must work with screen readers and remain usable when
    images fail to load.
-   Provide useful alt text for published evidence without repeating
    unsupported claims as fact.

------------------------------------------------------------------------

## 15. Notifications and Contributor Communication

For MVP, implement a reliable in-app receipt/status view. Email or other
notifications may use existing infrastructure if available.

Possible events: - Submission received. - Additional information
requested. - Case referred or closed. - Finding published. - Correction
published. - Appeal resolved.

Requirements: - Do not include sensitive evidence, private notes or
detailed allegations in notification previews. - Use neutral subject
lines. - Verify contact details before sending sensitive status
information. - Allow the user to opt out of non-essential
notifications. - Avoid promising a review deadline unless the team can
consistently meet it.

------------------------------------------------------------------------

## 16. Admin, Moderation and Operations

Build a protected operations interface with: - Triage queue. -
Assignment and reassignment. - Filters by case type, workflow status,
date, sensitivity and age of queue. - Aging indicators for unreviewed
cases. - Duplicate/related case linking. - Abuse, spam and
malicious-link flags. - Restricted-case handling. - Review checklist and
second-review requirement. - Publication preview. - Correction/appeal
queue. - Referral tracking. - Audit timeline. - Data export only for
authorized roles and with an audit event. - Operational metrics that
avoid exposing source identities unnecessarily.

Moderation rules must cover spam, partisan flooding, threats, doxxing,
manipulated submissions, duplicate reports, illegal content and attempts
to identify protected contributors. Do not delete a case solely because
its allegation is politically inconvenient; use documented moderation
rules.

------------------------------------------------------------------------

## 17. Result-Sheet OCR and Comparison Implementation Notes

This section applies only if the result-sheet pilot is approved.

-   Prefer a reliable existing OCR component or provider that meets
    privacy, security, cost and licensing requirements.
-   Do not send sensitive evidence to a third party without a documented
    legal basis, privacy notice and appropriate configuration.
-   Store raw OCR output separately from human-corrected values.
-   Record OCR engine/model version and execution time.
-   Support manual correction and a visible "not yet confirmed" state.
-   Do not infer a polling-unit code solely from a fuzzy OCR match.
-   Compare only documents whose election, polling unit and relevant
    version are confirmed.
-   Display differences in a reviewer workspace, not as public "fraud
    detected" alerts.
-   Keep each comparison tied to the two source evidence IDs and the
    reviewer who confirmed the result.
-   Test against blurry, rotated, skewed, low-light, handwritten,
    compressed and partially occluded images.
-   If OCR confidence is low or the image is unreadable, say so and ask
    for a clearer source rather than fabricating a value.

------------------------------------------------------------------------

## 18. Phased Delivery Plan

### Phase 0 --- Repository discovery and design validation (first task for coding agent)

Before coding: 1. Inspect repository structure, current
routes/navigation, framework and package versions. 2. Locate Capture
session creation/consumption, signed record generation, hashing,
timestamp verification, storage, declarations, location handling and
event logging. 3. Locate authentication, account roles, database
schema/migrations, row-level security, API conventions and admin tools.
4. Inspect existing Analyze/Create/Verify workflows and shared
components. 5. Identify existing upload limits, file validation, privacy
notices, logging, notification and error-handling patterns. 6. Identify
tests, lint/type-check/build commands and deployment constraints. 7.
Produce a concise architecture map and implementation plan. 8. Flag
unknowns or security risks before making destructive changes. 9. Reuse
existing patterns; do not rewrite stable Capture functionality. 10.
Confirm any new dependencies, external services, licenses, costs or data
transfers before adopting them.

**Phase 0 deliverable:** repository-specific implementation plan and
explicit mapping from this PRD to existing code modules and migrations.

### Phase 1 --- Core Civic Evidence MVP (days 1--30)

Build: - Civic Evidence landing page. - Three submission routes: viral
media, result sheet intake, incident report. - Case creation and stable
public reference. - Private-by-default submissions. - Evidence
item/source linking. - Capture request creation linked to a case. -
Single-use, expiring and revocable capture token behavior. - Link
captured record to case. - Basic reviewer queue and case workspace. -
Role-based access and audit events. - Receipt/status page. - Redacted
public case page capability, gated by editor approval. - Privacy notice,
consent and safety language. - Tests for access control, token behavior
and Capture regressions.

Initial operational focus: viral images, misleading captions, old
photographs presented as current and alleged political endorsements.

### Phase 2 --- Review quality and public accountability (days 31--60)

Build: - Evidence/source assessment matrix. - Reviewer notes and
structured finding proposal. - Second-review/editor approval. - Public
case versions and correction history. - Appeals and response process. -
Duplicate/related case linking. - Evidence comparison and source
checklist. - Public reviewed-case library. - Redaction workflow and
sensitive-case restrictions. - Partner testing and usability
improvements. - Operational dashboard and baseline metrics.

### Phase 3 --- Controlled pilot expansion (days 61--90)

Subject to partner demand and successful security review: - Result-sheet
OCR prototype. - Human-confirmed figure extraction. - Comparison against
available official documents. - Referral workflow. - Reviewer
calibration and quality assurance. - Public methodology/limitations
page. - Transparency report covering case counts, outcomes, corrections,
appeals and known limitations without exposing sensitive sources.

Do not treat the calendar as permission to ship insecure features. If
privacy, security or review quality is not ready, defer the phase.

------------------------------------------------------------------------

## 19. Testing and Acceptance Criteria

### 19.1 Capture regression

-   Existing Capture still works for current use cases.
-   Existing record URLs continue to resolve.
-   Existing signature verification and exact-file matching are
    unchanged.
-   Registration time and timestamp token display retain their current
    meaning.
-   Existing declaration and location labels remain accurate.
-   Civic Evidence does not modify the original file or signed record.

### 19.2 Capture request security

-   A valid unexpired link can be used once.
-   An expired, revoked or consumed link cannot create a second accepted
    capture.
-   Two concurrent requests to consume the same token cannot both
    succeed.
-   Tokens are not exposed in logs, analytics or public case payloads.
-   A contributor cannot access the case workspace through a capture
    token.
-   The recipient sees the purpose, consent and privacy information
    before capture.
-   Failure states do not reveal sensitive case information.

### 19.3 Authorization and privacy

-   Anonymous/public users cannot access private cases by guessing IDs.
-   Contributors cannot see other contributors' cases or private
    reviewer notes.
-   Reviewers can access only authorized cases and evidence.
-   Only authorized editors can publish.
-   Public API responses contain only approved public fields.
-   Exact location and reporter identity are not exposed on public pages
    by default.
-   Sensitive access and exports create audit events.
-   Security tests cover IDOR, role escalation, XSS, unsafe links, rate
    limiting and common auth failures.

### 19.4 Claim review and publication

-   A new case cannot be published without the required review and
    editor approval.
-   A finding must include a defined claim, rationale, evidence
    references and limitations.
-   Integrity verification is not displayed as proof that a claim is
    true.
-   A published correction creates a new version and retains prior
    history.
-   A public page clearly distinguishes declared, detected, inferred and
    verified information.
-   Inconclusive cases can be closed without forcing a true/false
    verdict.
-   Appeals and corrections are traceable.

### 19.5 Result-sheet pilot

-   OCR output is visibly marked unconfirmed until human review.
-   Critical figures can be corrected by an authorized reviewer.
-   Comparison references both source documents.
-   The system cannot automatically publish a fraud allegation based on
    a mismatch.
-   Missing official documents produce an explicit
    unavailable/inconclusive state.
-   The interface makes no winner declaration or unofficial national
    tally.

### 19.6 Accessibility and reliability

-   Public forms work on common mobile viewport sizes.
-   Required fields, errors and consent are accessible.
-   Network failures provide a clear retry path without duplicate cases.
-   File and URL validation runs server-side.
-   Build, lint, type checks and relevant tests pass.
-   Migration rollback or recovery steps are documented where supported.

------------------------------------------------------------------------

## 20. Analytics and Product Instrumentation

Track events using the project's existing analytics approach, with
privacy-safe properties.

Suggested events: - `civic_landing_viewed` -
`civic_submission_started` - `civic_submission_completed` -
`civic_submission_failed` - `civic_capture_request_created` -
`civic_capture_request_consumed` - `civic_evidence_linked` -
`civic_case_assigned` - `civic_review_started` -
`civic_finding_proposed` - `civic_finding_published` -
`civic_correction_published` - `civic_appeal_submitted` -
`civic_case_referred`

Never send claim text, reporter identity, exact location, raw URLs
containing private tokens, source files or sensitive reviewer notes to
general analytics.

------------------------------------------------------------------------

## 21. Partnership and Operating Model

The initial service should be free for ordinary civic submissions.
Possible funding paths include: - Public-interest grants and election
integrity projects. - Newsroom and fact-checking partnerships. -
Institutional tools, training and workflow services. - Sponsored
verification desks with transparent editorial independence. -
Enterprise/API services for organizations with suitable privacy and
governance needs.

Potential organizations to approach include established fact-checking
organizations, newsrooms, journalism schools and civil-society election
monitoring groups. Any partnership is exploratory until formally agreed.

Do not market the service as an official INEC product or imply
endorsement without explicit authorization. Keep the brand and
methodology politically neutral.

------------------------------------------------------------------------

## 22. Known Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Users mistake a valid signature for State exactly what the signature
  proof of truth                      verifies on every relevant screen.

  Staged or misleading browser        Treat camera and location signals
  capture                             as context, not proof; corroborate
                                      independently.

  Political flooding or coordinated   Rate limits, triage, duplicate
  abuse                               detection, reviewer assignment and
                                      documented moderation.

  Defamation or unsafe publication    Private by default, human review,
                                      editorial approval,
                                      response/correction process and
                                      legal review.

  Source exposure or retaliation      Separate identity, restricted
                                      access, broad public locations,
                                      redaction and retention controls.

  False positives from AI detectors   Use detectors as leads only;
                                      document limitations and require
                                      corroboration.

  OCR errors mistaken for altered     Label machine extraction, require
  results                             human confirmation and compare
                                      source documents carefully.

  Incomplete official source          Publish an explicit
  availability                        unavailable/inconclusive status
                                      rather than guessing.

  Reviewer inconsistency              Shared rubric, second review,
                                      calibration and audit sampling.

  Scope creep                         Ship claim intake and review first;
                                      gate OCR and advanced features on
                                      demand and readiness.

  Excessive operational costs         Pilot with limited partners and
                                      measure cost per defensible case.

  Existing Capture regression         Reuse existing services and run
                                      targeted regression tests.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 23. Coding Agent Instructions

Treat this PRD as the product requirement, but treat the existing
repository as the authority on implementation details.

### Mandatory workflow

1.  **Inspect before editing.** Map the current architecture, routes,
    data model, Capture implementation, authorization and deployment.
2.  **Write a plan.** List files/modules to change, migrations, APIs, UI
    work, security implications and tests.
3.  **Reuse existing functionality.** Do not duplicate hashing, signing,
    timestamps, storage, authentication or record verification if a
    suitable implementation already exists.
4.  **Implement in small, verifiable increments.** Start with case
    creation and role checks, then evidence linking and Capture
    integration, then review/publication.
5.  **Protect existing behavior.** Add regression tests for Capture and
    Verify before changing shared components.
6.  **Use migrations.** Never silently mutate production schema or
    delete existing data.
7.  **Enforce security on the server.** UI hiding is not authorization.
8.  **Do not fabricate capabilities.** If a feature such as tokenized
    timestamp verification, C2PA verification, geolocation precision,
    OCR or external source retrieval does not exist, report that fact
    and propose the smallest safe implementation.
9.  **Avoid unapproved external services.** Document any new dependency,
    license, cost, data processing or data transfer and seek approval
    where required.
10. **Keep public and private payloads separate.** Public pages must be
    generated from an explicit, reviewed allowlist of fields.
11. **Document limitations.** Do not claim that the system proves
    authorship, physical camera use, location, event time or truth
    unless a specific reliable mechanism establishes that exact
    proposition.
12. **Run quality checks.** Execute relevant tests, lint, type checks
    and production build; fix failures caused by the change.
13. **Summarize completion honestly.** List files changed, migrations,
    tests run, remaining gaps, required environment variables,
    deployment steps and any items not implemented.

### Implementation order

**Milestone 0:** repository map and implementation plan.\
**Milestone 1:** case schema, authorization and audit foundation.\
**Milestone 2:** public intake forms and receipt/status page.\
**Milestone 3:** case-linked Capture requests and evidence linking.\
**Milestone 4:** reviewer workspace, structured assessment and editorial
approval.\
**Milestone 5:** redacted public case pages, corrections and appeals.\
**Milestone 6:** security hardening, accessibility, regression testing
and documentation.\
**Milestone 7:** optional result-sheet OCR pilot only after explicit
readiness review.

Do not skip directly to Milestone 7.

### Definition of done

The initial release is done only when: - The core user journeys work end
to end. - Existing Capture and Verify workflows still pass regression
tests. - Role-based access is enforced server-side. - Evidence and
source records are linked to cases without corrupting the original
records. - One-time capture requests are secure, expiring and
single-use. - Publication requires human/editorial approval. - Public
pages expose only reviewed and redacted information. - Corrections and
prior published versions remain traceable. - Core acceptance and
security tests pass. - Setup, migrations, operational steps and known
limitations are documented.

------------------------------------------------------------------------

## 24. Launch Checklist

Before opening the public pilot: - \[ \] Repository-specific
implementation plan reviewed. - \[ \] Capture regression tests pass. -
\[ \] Authorization and row-level access policies tested. - \[ \]
Capture tokens are single-use, expiring and protected. - \[ \] Privacy
notice and consent language reviewed. - \[ \] Public pages use an
explicit allowlist and redaction. - \[ \] Sensitive evidence retention
policy documented. - \[ \] Reviewer and editor responsibilities
assigned. - \[ \] Finding rubric and correction/appeal process
documented. - \[ \] Safety and escalation protocol documented. - \[ \]
Public methodology and limitations page published. - \[ \] Monitoring,
backups and incident response checked. - \[ \] Small pilot partners and
case volume agreed. - \[ \] No claim is made that Oyokometa is an
official election authority. - \[ \] Result-sheet OCR remains disabled
until separately approved.

------------------------------------------------------------------------

## 25. Final Product Direction

Oyokometa already has the beginnings of a meaningful evidence-integrity
record. Civic Evidence should not replace that foundation; it should
make it useful in a civic context by connecting a file to a claim, a
review process, corroborating sources and a carefully scoped public
finding.

**Build the workflow that turns evidence into a responsible, reviewable
civic finding---not another app that simply labels images real or
fake.**
