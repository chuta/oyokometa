# Oyokomet, is an Image Provenance & Media Integrity Platform — MVP Product Requirements Document

**Version:** 2.0 — Detection + Provenance Creation + Credit-Gated Monetization
**Status:** Build-ready handoff for Product, Design, Engineering and Coding Agents


**Document status:** MVP Product Definition  
**Date:** 8 October 2026  
**Primary objective:** Build a fast, explainable image-analysis service that helps a user understand how an image was created, what metadata and provenance it contains, whether it shows evidence of editing or synthetic generation, and how confident the system is in each conclusion.

---

## 1. Product Overview
**Product name:** Oyokometa
### 1.1 Working product concept

Oyokometa ia an online tool where a user uploads an image and receives a rapid **Image Provenance Report**.

The product combines:

1. File and container inspection
2. EXIF/IPTC/XMP metadata extraction
3. Camera/device identification
4. Timestamp analysis
5. Editing/software history detection
6. C2PA / Content Credentials verification
7. Image-structure and compression analysis
8. Synthetic/AI-content signals
9. Evidence aggregation
10. An explainable human-readable report

The product should **not** present itself as a magical AI detector.

The central product principle is:

> **Separate what the file proves, what the file suggests, and what the system infers.**

### 1.2 Product promise

> **Upload an image. Understand its digital history.**

Secondary promise:

> **Know what is verified, what is detected, what is inferred — and why.**

### 1.3 Why this product matters

The product has broad consumer and professional applications:

- Everyday users checking suspicious images
- Journalists verifying media
- Lawyers and investigators examining evidence
- Fact-checkers
- Election observers and civic organizations
- Newsrooms
- Researchers
- Compliance and fraud teams
- Financial institutions
- Insurance companies
- Marketplaces
- Social-media trust and safety teams
- Corporate communications teams

C2PA explicitly frames provenance as a way to understand how content was created, changed and preserved, while emphasizing that provenance systems should not themselves make value judgments about whether content is "good" or "bad." The product should adopt the same distinction. 

---

# 2. Product Principles

## 2.1 Evidence before AI

Deterministic evidence should always be collected before an AI model is asked to interpret anything.

Priority:

**Cryptographically verifiable provenance → embedded metadata → file forensics → image analysis → AI interpretation**

## 2.2 No false certainty

Never say:

> "This image is definitely AI-generated."

unless there is a verifiable provenance assertion supporting that conclusion.

Prefer:

> "The file contains a Content Credential indicating generative AI was used."

or:

> "The image shows several signals associated with synthetic generation, but no definitive provenance evidence was found."

## 2.3 Absence of metadata is not proof of anything

A stripped EXIF block does not prove AI generation.

A screenshot does not prove fraud.

A Photoshop tag does not prove deception.

A missing C2PA manifest does not prove manipulation.

The UI must explicitly communicate this.

## 2.4 Explain every important conclusion

Every major finding should have:

- Finding
- Evidence
- Confidence
- Limitations

## 2.5 Privacy by default

Images may contain sensitive information such as faces, GPS coordinates, documents and private photographs.

The MVP should:

- Encrypt uploads in transit and at rest
- Avoid retaining images longer than necessary
- Clearly state retention policy
- Allow immediate deletion
- Avoid exposing GPS data publicly
- Never train models on uploaded user images without explicit consent

C2PA guidance similarly emphasizes user disclosure, consent and control over provenance-related information.

---

# 3. Target Users / Personas

## Persona A — Everyday User

**Goal:** "Is this image real, edited, AI-generated, or simply reposted?"

Needs a simple answer and explanation.

## Persona B — Journalist / Fact Checker

**Goal:** Establish the origin and history of a photograph before publication.

Needs evidence, metadata, provenance and downloadable reports.

## Persona C — Lawyer / Investigator

**Goal:** Determine whether an image can provide useful evidentiary leads.

Needs chain-of-custody awareness, original-file hashing, metadata preservation, evidence export and clear limitations.

## Persona D — Election / Civic Integrity User

**Goal:** Assess suspicious campaign images, political event photographs, posters, screenshots and viral media.

Needs rapid analysis and shareable reports without political bias.

The product must analyze the **media**, not determine whether a candidate, party or political claim is true.

## Persona E — Enterprise Trust / Compliance Team

**Goal:** Analyze large numbers of submitted images.

Needs API access, batch processing, audit logs, organization controls and machine-readable results.

---

# 4. MVP Scope

The MVP should focus on **image files**, not video/audio.

### Supported initial formats

- JPEG/JPG
- PNG
- WebP
- HEIC/HEIF
- TIFF

Potential later formats:

- RAW camera formats
- AVIF
- GIF
- PDF image extraction

---

# 5. MVP Core Features

## Feature 1 — Upload & Analyze

### User flow

1. Open analyzer
2. Drag/drop or select image
3. Display filename, size, type and preview
4. User clicks **Analyze Image**
5. Analysis pipeline executes
6. Results appear progressively or after completion

### Requirements

- Maximum configurable file size
- MIME validation
- Extension/MIME mismatch detection
- Malware-safe file handling
- Image decoding validation
- Upload progress
- Analysis progress indicator

### UX copy

> "We're examining the file, metadata, provenance credentials and image characteristics. This normally takes a few seconds."

---

# 6. Feature 2 — Image Identity

Display:

- Filename
- File type
- MIME type
- File size
- Width
- Height
- Aspect ratio
- Color space
- Bit depth
- Orientation
- File hash
- Perceptual hash

### Hashes

Generate:

- SHA-256
- Optional MD5 for legacy forensic interoperability
- pHash / perceptual hash

The SHA-256 becomes the primary **Evidence ID**.

Example:

> Evidence ID: `SHA256: 7e91...c2a4`

---

# 7. Feature 3 — Metadata Extraction

Extract where available:

### EXIF

- Make
- Model
- Lens
- Lens model
- Focal length
- Aperture
- Shutter speed
- ISO
- Flash
- Exposure program
- White balance
- Software
- DateTimeOriginal
- CreateDate
- ModifyDate
- GPS
- Orientation

### IPTC

- Creator
- Credit
- Copyright
- Caption
- Keywords
- Location
- Date fields

### XMP

- Creator
- Software
- Editing history
- Lightroom metadata
- Photoshop metadata
- Other application-specific fields

ExifTool is a strong candidate for the deterministic extraction layer because it exposes a very broad range of image metadata formats and fields. 

---

# 8. Feature 4 — Timestamp Analysis

The system should never simply display "Original Date."

Instead display a timeline:

### Example

**Possible timeline**

- 14 Mar 2026 — `DateTimeOriginal`
- 14 Mar 2026 — `CreateDate`
- 15 Mar 2026 — Lightroom metadata timestamp
- 16 Mar 2026 — file modification timestamp
- 18 Mar 2026 — current upload timestamp

Then explain:

> "The earliest embedded capture timestamp is 14 Mar 2026. This is metadata reported by the file and is not independently verified."

### Timestamp confidence levels

- Cryptographically verified
- Embedded metadata
- File-system metadata
- Inferred
- Unknown

---

# 9. Feature 5 — Device / Capture Origin

Classify likely source:

- Digital camera
- Smartphone camera
- Drone
- Scanner
- Screenshot
- Desktop-generated image
- Synthetic/AI-generated
- Unknown

### Evidence

For example:

**Camera-origin evidence**

- Camera make/model present
- Lens data present
- Exposure data present
- Sensor/camera-specific metadata present
- Expected image dimensions
- Camera maker notes

Output:

> **Likely camera-originated**
> Strong supporting metadata was found.

---

# 10. Feature 6 — Editing / Software History

Detect metadata indicating applications such as:

- Adobe Photoshop
- Lightroom
- GIMP
- Affinity
- Canva
- Apple Photos
- Google Photos
- Microsoft applications
- Mobile editors
- Messaging/social platforms

Output example:

> **Editing software detected**
>
> Adobe Lightroom metadata is present.
>
> This indicates the file was processed by Lightroom; it does not by itself establish what was changed.

---

# 11. Feature 7 — C2PA / Content Credentials

This should be a **first-class feature**, not an optional footnote.

C2PA Content Credentials provide cryptographically signed, tamper-evident provenance data and can describe creation, editing, tools, timing and AI involvement. citeturn0search1turn0search36

The analyzer should:

1. Detect C2PA manifest
2. Parse manifest
3. Verify signature
4. Verify asset binding
5. Identify issuer/signing information where available
6. Display creation/editing actions
7. Identify AI-related declarations
8. Display ingredient/source relationships
9. Report validation status

### Status states

**Verified**

> Content Credentials found and cryptographically verified.

**Present but invalid**

> Content Credentials were detected, but verification failed.

**Not found**

> No Content Credentials were detected.

Important:

> "Not found" ≠ "fake."

C2PA's own principles emphasize verification of assertions rather than value judgments about the content. citeturn0search0

---

# 12. Feature 8 — AI / Synthetic Media Analysis

This is the most sensitive part of the MVP.

Do not make the first version a single binary AI detector.

Use a **multi-signal architecture**.

### Signal categories

#### A. Provenance signal

Strongest.

Examples:

- C2PA explicitly identifies generative AI
- C2PA identifies AI-assisted editing
- Generator metadata
- Known provenance assertion

#### B. Metadata signal

Examples:

- AI generator metadata
- Missing expected camera metadata
- Software identifiers
- Export signatures

#### C. File-structure signal

Examples:

- JPEG quantization
- compression characteristics
- PNG structure
- unusual metadata ordering
- encoding patterns
- re-encoding evidence

#### D. Pixel / image signal

Potential indicators:

- repeated texture patterns
- anatomical inconsistencies
- lighting inconsistencies
- geometry inconsistencies
- unnatural text rendering
- frequency-domain patterns

#### E. Model-based signal

Optional external or internal classifiers.

The model output should be treated as **one signal**, not absolute truth.

---

# 13. AI Classification Model

Instead of a single:

> AI: 87%

use:

### Creation classification

- Camera capture
- Scanner/digitized media
- Screenshot
- Human-created digital artwork
- AI-generated
- AI-assisted
- Heavily edited
- Unknown

### Confidence

Use:

- High
- Medium
- Low
- Insufficient evidence

Avoid presenting numerical percentages in the MVP unless the underlying detector is properly calibrated.

---

# 14. Evidence Engine

The evidence engine is the heart of the product.

Every analyzer should return structured evidence:

```json
{
  "signal": "camera_make_model",
  "value": "Apple iPhone 15 Pro",
  "source": "EXIF",
  "strength": "strong",
  "confidence": "high"
}
```

Example:

```json
{
  "signal": "c2pa_ai_disclosure",
  "value": "generative_ai",
  "source": "C2PA",
  "verification": "valid",
  "strength": "very_strong"
}
```

---

# 15. Evidence Hierarchy

Recommended hierarchy:

| Evidence | Weight |
|---|---:|
| Valid cryptographic provenance | Very High |
| Verified C2PA AI declaration | Very High |
| Camera-specific metadata | High |
| Consistent EXIF + XMP | High |
| Known software history | Medium |
| File structure anomalies | Medium |
| Pixel-level AI classifier | Medium |
| Visual AI heuristics | Low/Medium |
| Missing metadata | Very Low |

The exact numerical weights should be configurable server-side and validated against a benchmark dataset before being exposed as user-facing confidence.

---

# 16. Report Architecture

The report should have five layers.

## Layer 1 — Executive Finding

Example:

> **Likely camera-originated**
>
> The file contains consistent camera metadata identifying an iPhone 15 Pro. Lightroom editing metadata was also detected. No verified AI-generation provenance was found.

## Layer 2 — Evidence

Show the evidence supporting the finding.

## Layer 3 — Timeline

Show detected creation and modification events.

## Layer 4 — Technical Details

Expose complete metadata.

## Layer 5 — Limitations

Always explain what the system cannot establish.

---

# 17. Proposed Result Dashboard

```text
┌──────────────────────────────────────────────────────────┐
│ IMAGE PROVENANCE REPORT                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [ IMAGE PREVIEW ]       LIKELY CAMERA-ORIGINATED        │
│                          Confidence: HIGH                │
│                                                          │
│                          AI GENERATION                   │
│                          No verified evidence found      │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ QUICK FINDINGS                                            │
│                                                          │
│ ✓ Camera metadata       iPhone 15 Pro                   │
│ ✓ Capture timestamp     14 Mar 2026 14:32              │
│ ! Editing detected      Adobe Lightroom                  │
│ — C2PA credentials      Not detected                     │
│ ? AI analysis           Inconclusive                     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ DIGITAL TIMELINE                                          │
│                                                          │
│ 14 Mar 2026  Capture                                    │
│       ↓                                                  │
│ 15 Mar 2026  Lightroom processing                        │
│       ↓                                                  │
│ 16 Mar 2026  File modified                              │
│       ↓                                                  │
│ 08 Oct 2026  Analyzed                                   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ WHY WE THINK THIS                                        │
│                                                          │
│ • Camera model and lens metadata present                 │
│ • Exposure data present                                  │
│ • Editing software identified                            │
│ • No verified synthetic-media credential found           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ LIMITATIONS                                              │
│ Metadata can be removed or altered. Absence of C2PA      │
│ credentials does not prove that an image is fake.        │
│                                                          │
│ [View full metadata] [Download report] [Share report]    │
└──────────────────────────────────────────────────────────┘
```

---

# 18. High-Level UI/UX Flow

```text
                    ┌─────────────────────┐
                    │      LANDING        │
                    │ "Analyze an Image"  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    UPLOAD IMAGE     │
                    │ Drag / Select /     │
                    │ Paste               │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   FILE VALIDATION   │
                    │ Type / Size / Hash  │
                    └──────────┬──────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │       ANALYSIS PIPELINE      │
                │                              │
                │ Metadata ────────┐           │
                │ File Forensics ──┤           │
                │ C2PA ────────────┤           │
                │ Image Signals ───┤           │
                │ AI Analysis ─────┘           │
                └──────────────┬───────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  EVIDENCE ENGINE    │
                    │ Correlate signals   │
                    │ + assess confidence │
                    └──────────┬──────────┘
                               │
                               ▼
                 ┌──────────────────────────┐
                 │     RESULT DASHBOARD     │
                 │                          │
                 │ Summary                  │
                 │ Evidence                 │
                 │ Timeline                 │
                 │ Provenance               │
                 │ AI Analysis              │
                 │ Metadata                 │
                 │ Limitations              │
                 └───────────┬──────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        Download PDF     Share Link    Analyze Another
```

---

# 19. Landing Page UX

The landing page should be extremely simple.

### Hero

> **What can this image tell you?**

Subheading:

> Analyze an image's metadata, provenance, editing history and synthetic-media signals in seconds.

Primary CTA:

**Analyze an Image**

Secondary:

**How it works**

### Trust statement

> We distinguish verified facts from technical signals and AI inference.

### Example report

Show a sample image with an anonymized report.

---

# 20. Analysis Progress UX

Instead of a generic spinner, show stages:

```text
✓ Reading image
✓ Calculating file fingerprint
✓ Extracting metadata
✓ Checking provenance credentials
● Analyzing image characteristics
○ Building evidence report
```

This increases perceived transparency.

---

# 21. Result Status Language

Use neutral labels.

### Provenance

- Verified
- Present
- Invalid
- Not detected
- Unable to verify

### Origin

- Camera-originated
- Digitized/scanned
- Screenshot
- Synthetic indicators
- Digitally created
- Unknown

### AI

- AI generation indicated
- AI assistance indicated
- AI signals detected
- No strong AI signals detected
- Inconclusive

Never equate:

> "No AI evidence"

with:

> "Authentic."

---

# 22. Evidence Detail Drawer

Every finding should be clickable.

Example:

### Camera detected

**What we found**

`Make: Apple`  
`Model: iPhone 15 Pro`  
`Lens: 6.765mm`  
`ISO: 100`

**Source**

EXIF metadata

**Interpretation**

The file contains metadata normally associated with a camera capture.

**Caution**

Metadata can be modified or removed.

---

# 23. Timeline UI

Represent the image as an evidence timeline:

```text
CAPTURE
  │
  ├── Device metadata
  │
  ▼
EDIT
  │
  ├── Lightroom detected
  │
  ▼
EXPORT
  │
  ├── JPEG recompression
  │
  ▼
DISTRIBUTION
  │
  ├── Possible messaging-platform processing
  │
  ▼
ANALYSIS
```

Use a distinction between:

- **Verified event**
- **Metadata-reported event**
- **Inferred event**

---

# 24. Downloadable Evidence Report

MVP should support PDF and JSON.

## PDF report

Sections:

1. Evidence ID
2. Image preview
3. Executive summary
4. Findings
5. Evidence
6. Timeline
7. Provenance
8. Metadata
9. AI analysis
10. Limitations
11. Analysis timestamp
12. Analyzer version
13. SHA-256 hash

## JSON report

Designed for future APIs and enterprise integrations.

---

# 25. Chain-of-Custody Mode — MVP Lite

For ordinary users, a simple report is sufficient.

For investigators, add:

### Evidence ID

SHA-256 hash of uploaded file.

### Acquisition timestamp

When the analyzer received the file.

### Original filename

Stored exactly as submitted.

### Analysis version

Example:

`Analyzer v0.1.0`

### Immutable analysis record

The report should record:

- File hash
- Analysis timestamp
- Analyzer version
- Detector versions
- Evidence findings

Important:

The system should state that this is **a record of the file submitted to the analyzer**, not proof that the uploader possessed the original camera file.

---

# 26. API Design

Design the backend as an API even if the first product is a web UI.

### POST

`/v1/analyze`

Upload image.

### GET

`/v1/analysis/{analysis_id}`

Retrieve result.

### GET

`/v1/analysis/{analysis_id}/report`

Retrieve report.

### GET

`/v1/analysis/{analysis_id}/metadata`

Retrieve normalized metadata.

### GET

`/v1/analysis/{analysis_id}/evidence`

Retrieve evidence graph.

### DELETE

`/v1/analysis/{analysis_id}`

Delete analysis and retained assets.

---

# 27. Suggested Data Model

## analysis

```text
id
user_id
status
filename
mime_type
file_size
sha256
phash
width
height
created_at
completed_at
analyzer_version
retention_expires_at
```

## metadata

```text
analysis_id
namespace
key
value
source
confidence
raw_value
normalized_value
```

## evidence

```text
id
analysis_id
category
signal
value
source
strength
confidence
explanation
```

## provenance

```text
analysis_id
type
manifest_present
manifest_valid
issuer
created_at
actions
ingredients
ai_disclosure
raw_manifest_reference
```

## findings

```text
analysis_id
category
classification
confidence
summary
explanation
```

---

# 28. Evidence Graph

Internally model provenance as a graph.

Example:

```text
IMAGE
 │
 ├── captured_by ──> iPhone 15 Pro
 │
 ├── captured_at ──> 14 Mar 2026
 │
 ├── edited_with ──> Lightroom
 │
 ├── encoded_as ──> JPEG
 │
 ├── has_c2pa ──> No
 │
 └── analyzed_at ──> 08 Oct 2026
```

Later:

```text
Original Image
      │
      ▼
Photoshop
      │
      ▼
AI Generative Fill
      │
      ▼
Exported JPEG
      │
      ▼
WhatsApp
      │
      ▼
Downloaded Image
```

This becomes a major differentiator in later versions.

---

# 29. Technical Architecture

```text
                    ┌──────────────┐
                    │ Web / Mobile │
                    │     UI       │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ API Gateway  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Upload /     │
                    │ Validation   │
                    └──────┬───────┘
                           │
              ┌────────────┼─────────────┐
              ▼            ▼             ▼
       Metadata Worker  C2PA Worker  Forensics Worker
              │            │             │
              └────────────┼─────────────┘
                           ▼
                    ┌──────────────┐
                    │ AI Analysis  │
                    │ Worker       │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Evidence     │
                    │ Engine       │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Report       │
                    │ Generator    │
                    └──────────────┘
```

---

# 30. Suggested MVP Technology Direction

A practical stack could be:

### Frontend

- React
- TypeScript
- Vite / Next.js
- Tailwind or equivalent design system

### Backend

- Node.js / TypeScript or Python
- REST API
- PostgreSQL

### Object storage

- S3-compatible object storage

### Metadata

- ExifTool

### Image processing

- libvips / Sharp
- ImageMagick where required

### C2PA

Use a maintained C2PA implementation/library rather than implementing manifest verification yourself.

### AI

Use an abstraction layer so models can be swapped:

```text
AIProvider
 ├── Detector A
 ├── Detector B
 └── Future detector
```

Do not hard-wire the product to one AI detection vendor.

---

# 31. Processing Pipeline

```text
UPLOAD
  ↓
MIME validation
  ↓
Virus/security scan
  ↓
SHA-256
  ↓
Image decode
  ↓
Metadata extraction
  ↓
C2PA extraction + verification
  ↓
File structure analysis
  ↓
Image analysis
  ↓
AI detector(s)
  ↓
Evidence normalization
  ↓
Evidence correlation
  ↓
Finding generation
  ↓
Human-readable explanation
  ↓
Report
```

---

# 32. Deterministic vs AI Components

## Deterministic

Should handle:

- File type
- File size
- Dimensions
- Hashes
- EXIF
- IPTC
- XMP
- Camera metadata
- Software metadata
- C2PA verification
- Basic file structure

## AI / ML

Should handle:

- Image semantic analysis
- Synthetic-image signals
- AI-edit detection
- Visual anomaly detection
- Natural-language explanation

This division is important because deterministic results can be audited and reproduced.

---

# 33. Security Requirements

MVP security requirements:

- HTTPS
- Signed upload URLs
- Private object storage
- Malware scanning
- MIME sniffing protection
- File size limits
- Rate limiting
- Authentication for persistent history
- Automatic deletion
- No public object URLs
- Encryption at rest
- Audit logging
- Server-side image decoding isolation

For forensic use, preserve the original uploaded bytes separately from any derived thumbnail.

---

# 34. Privacy Requirements

Default:

> **Your image is analyzed privately and automatically deleted after the stated retention period.**

Allow:

- Delete now
- Download report
- Download metadata
- Do not retain image
- Optional account history

Do not expose GPS coordinates prominently.

Instead:

> GPS metadata detected

Then:

> Reveal location metadata

with an explicit warning.

---

# 35. MVP Non-Goals

Do NOT attempt to build all of these initially:

- Video deepfake detection
- Audio deepfake detection
- Facial recognition
- Identity verification
- Reverse image search
- Blockchain anchoring
- Court admissibility certification
- "Truth" determination
- Political misinformation determination
- Automatic fact checking
- Social-media crawling
- Global image search
- Perfect AI-generation detection

These can become future modules.

---

# 36. MVP Product Phases

## Phase 0 — Foundation

### Goal

Build the evidence infrastructure.

Deliver:

- Upload
- SHA-256
- File validation
- Image preview
- Metadata extraction
- Database
- Basic report

Success:

A user can upload an image and receive a reliable technical report.

---

# Phase 1 — MVP

### Goal

Create the first genuinely useful provenance analyzer.

Features:

- EXIF/IPTC/XMP
- Device identification
- Timestamp timeline
- Software/editing detection
- C2PA detection
- C2PA validation
- File structure analysis
- Basic AI/synthetic signals
- Evidence engine
- Confidence labels
- Explainable findings
- PDF report
- JSON report
- Delete image
- Shareable report

### MVP headline

> **Analyze an image's digital history in seconds.**

---

# Phase 2 — Professional Investigation

### Goal

Serve journalists, lawyers, investigators and fact-checkers.

Features:

- Evidence workspace
- Case folders
- Multiple images per case
- Compare two files
- Original vs derivative analysis
- Perceptual hash matching
- Image lineage
- Chain-of-custody records
- Evidence notes
- Investigator annotations
- Signed reports
- Report verification URL
- API

---

# Phase 3 — Enterprise / API

### Goal

Make the analyzer infrastructure.

Features:

- REST API
- Batch upload
- Webhooks
- Organization accounts
- Roles
- Audit logs
- API keys
- Usage limits
- SIEM integration
- Case-management integrations
- Custom retention
- Enterprise privacy controls

Potential customers:

- News organizations
- Banks
- Insurance
- Marketplaces
- Social platforms
- Legal firms
- Government agencies
- Research organizations

---

# Phase 4 — Provenance Network

### Goal

Move from analyzing files to preserving provenance.

Potential features:

- User-generated Content Credentials
- Provenance certificates
- Signed evidence packages
- Organization signing identities
- Trusted issuer registry
- Evidence verification portal
- Provenance APIs
- Hardware/device attestation integrations

---

# Phase 5 — Media Integrity Platform

Expand beyond images:

```text
IMAGE
VIDEO
AUDIO
DOCUMENT
SCREENSHOT
SOCIAL MEDIA CAPTURE
```

Eventually:

> **Media Integrity & Provenance Infrastructure**

---

# 37. Election-Year Mode

This should be a **product mode**, not a political bias engine.

Potential landing CTA:

> **Check a campaign image**

But the exact same technical analysis should apply to:

- Candidate images
- Party graphics
- Event photographs
- Alleged official documents
- Campaign posters
- Social-media screenshots
- Viral photographs

The system should not assess which candidate or party is truthful or preferable.

### Special features

- Rapid analysis
- Shareable public report
- QR verification
- Evidence ID
- Timestamp
- "What we know / what we don't know"
- Clear warnings against overinterpretation

Example:

> **This image contains no verified provenance credentials.**

Not:

> **This campaign image is fake.**

---

# 38. Public Verification Page

Every shareable report can have:

`/verify/{report_id}`

Display:

- Image thumbnail
- SHA-256
- Analysis timestamp
- Analyzer version
- Findings
- Evidence
- Provenance
- Limitations

If the image itself is changed after analysis:

> **The submitted file does not match this report.**

This is extremely useful for journalists and investigators.

---

# 39. Compare Mode

Later feature:

```text
        ORIGINAL              SUBMITTED COPY
     ┌───────────┐           ┌───────────┐
     │           │           │           │
     │   IMAGE   │           │   IMAGE   │
     │           │           │           │
     └───────────┘           └───────────┘
          │                       │
          └───────────┬───────────┘
                      ▼
               DIFFERENCE ENGINE
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    Metadata       Pixels       Provenance
```

Output:

- Same image / derivative
- Cropped
- Resized
- Recompressed
- Edited
- Metadata stripped
- New content introduced

---

# 40. UX Design System

The product should feel more like a **digital forensic instrument** than a flashy AI consumer app.

Recommended visual language:

- White / neutral base
- Dark text
- Restrained accent color
- Evidence cards
- Timeline
- Status badges
- Monospace for technical values
- Clear icons
- Minimal animation

Avoid:

- Cyberpunk aesthetics
- "AI magic" visual language
- Huge confidence percentages
- Red/green oversimplification
- "FAKE / REAL" buttons

---

# 41. Recommended Finding Labels

### Strong positive evidence

**Verified**

### Technical evidence

**Detected**

### Analytical interpretation

**Likely**

### Weak signal

**Possible**

### Insufficient evidence

**Inconclusive**

This vocabulary should be consistent across the entire product.

---

# 42. Report Confidence Model

Instead of one global score, provide category confidence.

Example:

```text
Camera origin       HIGH
Capture date        MEDIUM
Editing history     HIGH
C2PA provenance     VERIFIED
AI generation       INCONCLUSIVE
```

This is better than:

> "Authenticity Score: 82%"

because the latter falsely compresses different questions into one number.

---

# 43. Key Product Metrics

## Product metrics

- Upload-to-result time
- Analysis completion rate
- Report generation rate
- Repeat analysis rate
- Share rate
- Download rate

## Technical metrics

- Metadata extraction success
- C2PA validation success
- Unsupported-file rate
- AI analysis latency
- Pipeline failure rate

## Quality metrics

Create a benchmark corpus containing:

- Native camera images
- Edited photographs
- Screenshots
- Scanned images
- AI-generated images
- AI-edited images
- Social-media recompressions
- Metadata-stripped images

Measure:

- False positives
- False negatives
- Calibration
- Confidence reliability

---

# 44. Critical Testing Strategy

Before publicly marketing AI detection, construct a test matrix.

### Test groups

**A. Genuine camera images**

- iPhone
- Samsung
- Google Pixel
- Canon
- Nikon
- Sony
- DJI

**B. Edited genuine images**

- Photoshop
- Lightroom
- GIMP
- Canva
- Mobile editors

**C. AI-generated**

Multiple image generators and models.

**D. AI-assisted**

Real photographs modified using generative tools.

**E. Distribution transformations**

- WhatsApp
- Facebook
- Instagram
- X
- Telegram
- Screenshots
- Downloads
- Resizing
- Recompression

The same image should be tested through multiple transformation chains.

---

# 45. AI Detection Product Risk

The biggest product risk is not technical failure alone.

It is **overclaiming**.

A false positive could cause:

- reputational harm
- legal disputes
- journalistic errors
- election misinformation
- wrongful accusations
- evidentiary problems

Therefore:

> **The product should be designed to produce evidence reports, not accusations.**

---

# 46. Suggested MVP Navigation

```text
HOME
 ├── Analyze
 ├── How It Works
 ├── Sample Report
 └── Privacy

RESULT
 ├── Summary
 ├── Evidence
 ├── Timeline
 ├── Provenance
 ├── Metadata
 ├── AI Analysis
 └── Limitations

ACCOUNT (optional MVP)
 ├── Analysis History
 ├── Reports
 └── Privacy / Data

PROFESSIONAL (Phase 2)
 ├── Cases
 ├── Evidence
 ├── Compare
 └── API
```

---

# 47. Coding Agent Build Instructions

The coding agent should implement the system in this order:

## Sprint 1

- Project scaffold
- Design system
- Upload UI
- Image validation
- Object storage
- SHA-256
- Analysis record

## Sprint 2

- ExifTool integration
- Metadata normalization
- Metadata UI
- Timeline engine

## Sprint 3

- C2PA detection
- Manifest parsing
- Signature validation
- Provenance UI

## Sprint 4

- File forensics
- Perceptual hash
- Basic image analysis
- Evidence engine

## Sprint 5

- AI analysis adapter
- Finding classification
- Confidence engine
- Explainability layer

## Sprint 6

- Report generator
- PDF
- JSON
- Shareable verification page
- Delete/retention workflows

## Sprint 7

- Security hardening
- Benchmark corpus
- Error handling
- Performance optimization
- Production deployment

---

# 48. Coding Agent Guardrails

The coding agent MUST NOT:

1. Treat missing metadata as evidence of AI generation.
2. Treat Photoshop metadata as evidence of deception.
3. claim that a timestamp is independently verified unless cryptographically verified.
4. expose raw GPS information without warning.
5. expose private uploaded files through public object URLs.
6. use an LLM as the source of truth for technical metadata.
7. generate a single "real/fake" score.
8. claim forensic or legal certification.
9. permanently retain images by default.
10. make political claims about people, candidates, parties or elections based on an image analysis.

The coding agent SHOULD:

1. preserve raw evidence separately from normalized findings.
2. make every finding traceable to its source.
3. version analyzers and detectors.
4. make detection models replaceable.
5. expose limitations.
6. make the report reproducible from the evidence record.
7. write tests for every analyzer.

---

# 49. Example Final User Report

## Image appears to be camera-originated

**Confidence: High**

### What we found

- Camera metadata identifies an Apple iPhone 15 Pro.
- Lens and exposure information are present.
- A capture timestamp is present.
- Adobe Lightroom metadata indicates subsequent processing.
- No verified C2PA Content Credential was detected.
- AI analysis produced inconclusive results.

### Timeline

**14 Mar 2026** — Camera capture metadata  
**15 Mar 2026** — Lightroom processing metadata  
**16 Mar 2026** — File modification metadata  
**08 Oct 2026** — Analyzer received file

### What this means

The available evidence is consistent with a photograph captured using a smartphone and subsequently edited.

### What this does NOT establish

This analysis does not independently prove when the photograph was actually taken, who took it, whether the metadata was altered, or whether the depicted event occurred.

---

# 50. Product Differentiation

The strongest positioning is NOT:

> "We detect AI images."

That market will become crowded and technically difficult.

The stronger positioning is:

> **"We help you understand the provenance and digital history of an image."**

AI detection becomes one component.

The product moat becomes the **evidence graph**.

Over time, the system can learn relationships between:

- devices
- software
- metadata
- encoding
- provenance credentials
- editing workflows
- image transformations
- AI-generation declarations

This creates a much more defensible product than a single AI classifier.

---

# 51. Recommended MVP Product Name Direction

Working names:

- **ImageTrace**
- **Provenance**
- **TraceLens**
- **ImageProof**
- **MediaTrace**
- **OriginLens**
- **ProofLens**
- **PixelTrace**
- **ImageForensics**
- **SourceLens**

The final brand should avoid implying absolute authenticity.

---

# 52. Final MVP Definition

The MVP is successful if a user can:

1. Upload an image.
2. Receive its SHA-256 fingerprint.
3. See technical metadata.
4. See likely device/source.
5. See available capture timestamps.
6. See detected editing software.
7. See C2PA/Content Credential status.
8. See relevant file/image analysis signals.
9. See AI/synthetic-media analysis with appropriate uncertainty.
10. Understand exactly why each finding was produced.
11. Download a structured report.
12. Share a verification page.
13. Delete the submitted image.
14. Understand what the analyzer cannot prove.

### The product's core UX promise

> **Don't just tell me whether an image is real. Show me what the evidence says.**

---

# 53. Reference Standards & Technical Foundation

The product should be designed around existing provenance and metadata standards rather than inventing a proprietary trust system.

C2PA provides a cryptographically verifiable provenance framework for describing creation and subsequent changes to digital content. Its current materials also distinguish AI-generated and AI-modified content and provide mechanisms for recording such actions. citeturn0search1turn0search2

NIST's work on synthetic content treats provenance, metadata, watermarking, detection and auditing as complementary approaches rather than assuming that a single detector solves synthetic-media verification. citeturn0search5

ExifTool provides the broad metadata inspection capability required for the deterministic metadata layer. citeturn0search39

---

# 54. Strategic Product Architecture

The long-term architecture should be thought of as:

```text
                 IMAGE / MEDIA
                       │
                       ▼
              ┌─────────────────┐
              │ DIGITAL EVIDENCE│
              │   COLLECTION    │
              └────────┬────────┘
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
    METADATA       PROVENANCE       FORENSICS
        │              │               │
        └──────────────┼───────────────┘
                       ▼
                EVIDENCE GRAPH
                       │
                       ▼
               ANALYSIS ENGINE
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
       DETERMINISTIC           AI/ML
        FINDINGS              SIGNALS
             │                   │
             └─────────┬─────────┘
                       ▼
                EXPLANATION LAYER
                       │
                       ▼
                HUMAN REPORT
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     CONSUMER       PROFESSIONAL   ENTERPRISE
```

The key architectural decision is that **AI sits inside the evidence architecture, not above it**.

That decision should remain true even as the product scales.


# 55. MVP Expansion — Provenance Creation

The original MVP focused primarily on **detecting provenance**. Version 2.0 makes **provenance creation** a first-class MVP capability.

The product therefore launches with three connected actions:

```text
ANALYZE  →  CREATE  →  VERIFY
```

### Analyze

Investigate an existing image and determine what evidence can be established about its origin, metadata, transformations and provenance.

### Create

Allow a user who controls an image to create a verifiable provenance record for that asset.

### Verify

Allow another user to upload an image or open a public verification URL and determine whether it matches an established provenance record.

This creates a stronger product category than a conventional AI-image detector:

> **A media provenance and integrity platform that can both investigate provenance and establish provenance.**

---

# 56. Provenance Creation — MVP Requirements

## 56.1 User Flow

```text
CREATE PROVENANCE
       ↓
UPLOAD IMAGE
       ↓
SECURE FILE VALIDATION
       ↓
GENERATE SHA-256 + PERCEPTUAL HASH
       ↓
RUN BASELINE ANALYSIS
       ↓
SHOW DETECTED FACTS
       ↓
USER ADDS DECLARATIONS
       ↓
CREATE PROVENANCE RECORD
       ↓
SIGN / PROTECT RECORD
       ↓
STORE PROVENANCE EVENT
       ↓
GENERATE PUBLIC OR PRIVATE VERIFICATION URL
```

## 56.2 Required provenance fields

At minimum:

- provenance record ID
- asset ID
- SHA-256
- perceptual hash
- original filename
- MIME type
- dimensions
- file size
- registering account
- registrant identity
- registration timestamp
- declared creator, if supplied
- declared creation timestamp, if supplied
- declared source/device, if supplied
- description, if supplied
- visibility
- provenance events
- platform signing information
- analyzer/platform version

## 56.3 Critical distinction: fact vs claim

The interface must visually distinguish:

**System-detected fact**

> EXIF DateTimeOriginal: 2026-09-04 14:23

from:

**User declaration**

> User declares that they created this image on 4 September 2026.

The platform must never silently convert a user declaration into an independently verified fact.

---

# 57. Provenance Creation Modes

## Mode A — File Registration

The user registers the exact file they possess.

The platform establishes:

> This exact file was registered by this account at this time.

It does **not** establish original authorship.

## Mode B — Creator Declaration

The user may declare:

> I created this image.

The system records this as a signed/user-attributed claim.

Unless independently verified, it should be labelled:

> **User-declared creator claim**

## Mode C — Organization Declaration

A verified organization may register an image under an organizational identity.

Future organization verification can include:

- verified newsroom
- verified photographer
- verified publisher
- verified institution
- verified brand

---

# 58. C2PA / Content Credentials Integration

The MVP should support standards-based provenance wherever the selected implementation permits it.

The architecture must distinguish:

1. Platform provenance record
2. Platform-signed provenance record
3. C2PA Content Credential
4. External credential
5. User declaration

These are not interchangeable.

Where feasible:

```text
IMAGE
  ↓
C2PA MANIFEST
  ↓
SIGNED ASSERTIONS
  ↓
ASSET / CREDENTIAL
  ↓
VALIDATION
```

The product should use established C2PA tooling rather than inventing a competing proprietary credential format.

If direct embedding into a particular image format is not reliable in the MVP, the platform must still create a standards-aware external provenance record linked to the immutable asset fingerprint.

---

# 59. Provenance Event Model

Provenance should be represented as an append-oriented event history.

Example:

```text
IMAGE CREATED / USER DECLARATION
          ↓
REGISTERED
          ↓
EDITED
          ↓
RESIZED
          ↓
PUBLISHED
          ↓
VERIFIED
```

Each event should support:

- event ID
- provenance ID
- event type
- event timestamp
- actor
- input hash
- output hash
- software
- declaration
- signature/status
- creation timestamp

MVP should support at least:

```text
REGISTERED
VERIFIED
```

and provide the schema for future:

```text
CREATED
EDITED
CROPPED
RESIZED
EXPORTED
PUBLISHED
TRANSFERRED
```

---

# 60. Public Verification Page

Each public provenance record may generate:

```text
https://<domain>/verify/<public_id>
```

The page should display only information intentionally made public.

Example:

```text
IMAGE PROVENANCE

✓ RECORD VERIFIED

Asset
JPEG · 4032 × 3024 · 5.2 MB

Registered
08 October 2026 · 08:42 WAT

Registrant
Example Organization

Creator claim
User-declared

File fingerprint
MATCH

Provenance events
1. Registered
2. Verified

Last verification
08 October 2026 · 09:15 WAT
```

Private metadata must not leak through this page.

---

# 61. Exact Verification Logic

When a previously registered image is uploaded:

```text
UPLOADED IMAGE
      ↓
SHA-256
      ↓
EXACT MATCH?
   /       \\
 YES       NO
  ↓          ↓
MATCH     PERCEPTUAL HASH
             ↓
       POSSIBLE DERIVATIVE
```

The system must distinguish:

### Exact match

The uploaded bytes produce the same cryptographic fingerprint as the registered asset.

### Different file

The uploaded file does not match the registered cryptographic fingerprint.

### Visually similar / possible derivative

The perceptual hash suggests similarity but does not establish provenance lineage.

Never state that perceptual similarity proves ownership or lineage.

---

# 62. MVP Monetization Architecture

The MVP should use a **credit-gated model**.

The key commercial principle is:

> **Give the user enough free evidence to understand the value, then charge for deeper analysis and professional outputs.**

Do not make the initial upload or basic result require payment.

---

# 63. Free-to-Paid Funnel

Preferred consumer funnel:

```text
LANDING PAGE
     ↓
UPLOAD IMAGE
     ↓
FREE QUICK SCAN
     ↓
MEANINGFUL RESULT
     ↓
"UNLOCK FULL ANALYSIS"
     ↓
CREATE ACCOUNT
     ↓
BUY CREDITS
     ↓
FULL REPORT
     ↓
SHARE / RETURN
```

The user should receive useful information before registration.

Registration should be triggered when the user wants to:

- email a full report
- download a full report
- save analysis history
- create provenance
- purchase credits
- access previous reports

---

# 64. Credit Economics

Credits are a first-class backend object.

Do **not** hard-code the assumption that:

> 1 credit = 1 image

Instead, credits represent analysis depth and premium actions.

Recommended initial economics:

| Action | Initial credit cost |
|---|---:|
| Free Quick Scan | 0 |
| Standard Deep Analysis | 10 |
| Full Provenance Report | 25 |
| Provenance Creation | 25 |
| Professional Evidence Report | 100 |
| Verified Evidence Package | 100–250 |
| Batch/API | Configurable |

These values should be stored in configuration/database tables, not hard-coded into frontend code.

---

# 65. Credit Packs

Initial launch packs:

| Pack | Credits | Primary audience |
|---|---:|---|
| Starter | 100 | Casual users |
| Standard | 500 | Regular users |
| Professional | 2,000 | Journalists / investigators |
| Enterprise | 5,000 | Heavy users / organizations |

At 10 credits per Standard Deep Analysis:

- 100 credits ≈ 10 analyses
- 500 credits ≈ 50 analyses
- 2,000 credits ≈ 200 analyses
- 5,000 credits ≈ 500 analyses

Credits should initially be **non-expiring**.

The pricing page should show actual currency pricing separately from credit quantities so prices can change without changing the underlying credit economy.

---

# 66. Credit Wallet

Required MVP objects:

```text
credit_wallet
credit_transaction
credit_purchase
credit_consumption
credit_refund
bonus_credit
analysis_cost
```

Every balance change must create a ledger entry.

Never implement the financial system as a single mutable user balance without a ledger.

---

# 67. Credit Transaction Rules

Credit operations must be transactional and idempotent.

Example:

```text
BEGIN TRANSACTION

Check wallet balance
       ↓
Reserve / debit credits
       ↓
Create analysis job
       ↓
Create ledger entry
       ↓
COMMIT
```

If the analysis fails before producing the requested result:

> Refund the consumed credits.

If the analysis succeeds but the result is inconclusive:

> Do not automatically refund. Inconclusive is a legitimate analytical outcome.

Retrying the same job must never result in double charging.

---

# 68. Payment Architecture

Use a payment abstraction layer.

```text
PaymentService
    ├── Local payment provider
    ├── International card provider
    └── Future provider
```

Purchase flow:

```text
SELECT CREDIT PACK
       ↓
CREATE PAYMENT INTENT
       ↓
PAYMENT PROVIDER
       ↓
VERIFIED WEBHOOK
       ↓
CREDIT WALLET
       ↓
LEDGER ENTRY
       ↓
RECEIPT
```

The frontend payment-success response must never be treated as sufficient evidence to credit the wallet.

Payment provider and pricing choices should be confirmed separately during implementation based on current availability, geography and fees.

---

# 69. Anonymous Session + Free Credit Logic

Anonymous visitors receive one free Quick Scan through a temporary session.

Suggested structure:

```text
anonymous_session_id
free_scan_used = false
        ↓
FREE SCAN
        ↓
free_scan_used = true
        ↓
USER CREATES ACCOUNT
        ↓
SESSION LINKED TO USER
```

The initial result should survive account creation so the user does not feel that they lost their work.

Anti-abuse controls may include:

- rate limits
- IP reputation
- browser/device risk signals
- CAPTCHA when necessary
- email verification

Avoid aggressive anti-abuse controls that make normal users unable to try the product.

---

# 70. Free Quick Scan — Exact MVP Boundary

The free scan should expose enough information to demonstrate value:

- file format
- file size
- dimensions
- image fingerprint summary
- basic metadata availability
- device/source indication if detectable
- timestamp indication
- C2PA status
- basic editing/software signal
- basic AI/synthetic assessment
- overall finding
- limitations

The following can be gated:

- detailed evidence matrix
- full metadata interpretation
- full timeline
- deep AI analysis
- downloadable full report
- professional evidence report
- provenance creation
- advanced verification package

The paywall should feel like an upgrade in **depth and utility**, not withholding basic facts deceptively.

---

# 71. Report Monetization

## Standard / Full Report — 25 credits

Include:

- image identity
- hashes
- metadata
- timestamp analysis
- device/source analysis
- software/editing history
- C2PA status
- AI/synthetic analysis
- evidence interpretation
- timeline
- limitations

## Professional Evidence Report — 100 credits

Include everything above plus:

- detailed evidence matrix
- acquisition information
- evidence history
- analyzer/model versions
- report hash
- provenance information
- verification URL
- machine-readable JSON

## Verified Evidence Package — Future premium tier

Potentially 100–250 credits:

- PDF
- JSON
- evidence manifest
- asset fingerprint
- provenance record
- public verification page
- signed report

---

# 72. Email Report Conversion Flow

The user's suggested conversion mechanism is adopted as an MVP flow.

```text
FREE / PARTIAL RESULT
        ↓
USER CLICKS "EMAIL FULL REPORT"
        ↓
ACCOUNT REQUIRED
        ↓
CREATE ACCOUNT
        ↓
PURCHASE / USE CREDITS
        ↓
GENERATE FULL REPORT
        ↓
EMAIL REPORT
        ↓
STORE REPORT IN ACCOUNT
```

The account prompt should explain the value:

> **Create your free account to receive the full report by email and keep your analysis history.**

---

# 73. Subscription Roadmap

Do not make subscriptions the primary launch monetization model.

Introduce subscriptions after real usage data exists.

Potential future plans:

### Personal

- monthly credit allocation
- rollover credits
- analysis history
- saved reports

### Professional

- larger credit allocation
- batch analysis
- case management
- evidence reports
- team members
- API access

### Organization / Enterprise

- shared credits
- seats
- admin controls
- private processing
- API
- SLA
- custom retention

---

# 74. Enterprise / API Monetization

The same analysis and evidence engines should power an API.

Potential customers:

- newsrooms
- fact-checkers
- law firms
- insurers
- marketplaces
- banks
- social platforms
- government agencies
- election observers
- compliance teams

Example future pricing unit:

```text
1,000 analyses
10,000 analyses
100,000 analyses
1,000,000+ analyses
```

The API should expose structured evidence rather than only a single AI score.

---

# 75. Provenance as a Second Revenue Stream

Provenance creation should become a distinct commercial action.

Possible future monetization:

- creator provenance packs
- professional creator plans
- newsroom provenance plans
- organizational provenance plans
- bulk registration API
- verified organizational identities
- long-term provenance storage

Potential positioning:

> **Don't just investigate images. Establish their provenance before they are copied, edited or redistributed.**

---

# 76. Public Verification as a Growth Loop

Every public provenance page can become a product discovery surface.

```text
CREATOR REGISTERS IMAGE
        ↓
PUBLIC VERIFICATION URL
        ↓
AUDIENCE OPENS URL
        ↓
AUDIENCE VERIFIES IMAGE
        ↓
AUDIENCE DISCOVERS ANALYZE
        ↓
NEW USER
```

This should be treated as product infrastructure rather than a decorative feature.

---

# 77. Updated MVP Navigation

```text
Analyze
Create Provenance
Verify
Pricing
Reports
Credits
Account
```

Authenticated users:

```text
Dashboard
Analyses
Provenance
Reports
Credits
Settings
```

Future professional navigation:

```text
Cases
Batch
Team
API
```

---

# 78. Updated High-Level UX Flow

```text
                         ┌──────────────────┐
                         │   LANDING PAGE   │
                         └────────┬─────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │                               │
                  ▼                               ▼
          ┌───────────────┐               ┌────────────────┐
          │ ANALYZE IMAGE │               │ CREATE         │
          │               │               │ PROVENANCE     │
          └───────┬───────┘               └───────┬────────┘
                  │                               │
                  ▼                               ▼
          ┌───────────────┐               ┌────────────────┐
          │ FREE QUICK    │               │ BASELINE       │
          │ SCAN          │               │ ANALYSIS       │
          └───────┬───────┘               └───────┬────────┘
                  │                               │
                  ▼                               ▼
          ┌───────────────┐               ┌────────────────┐
          │ BASIC RESULT  │               │ USER CLAIMS +  │
          └───────┬───────┘               │ DETECTED FACTS │
                  │                       └───────┬────────┘
                  ▼                               │
          ┌───────────────┐                       ▼
          │ UNLOCK DEEPER │               ┌────────────────┐
          │ ANALYSIS      │               │ SIGN / CREATE  │
          └───────┬───────┘               │ PROVENANCE     │
                  │                       └───────┬────────┘
                  ▼                               │
          ┌───────────────┐                       ▼
          │ ACCOUNT /     │               ┌────────────────┐
          │ CREDITS       │               │ VERIFY URL     │
          └───────┬───────┘               └───────┬────────┘
                  │                               │
                  ▼                               ▼
          ┌───────────────┐               ┌────────────────┐
          │ FULL REPORT   │               │ PUBLIC /       │
          │ + EMAIL       │               │ PRIVATE        │
          └───────────────┘               └────────────────┘
```

---

# 79. Updated Database Schema — Monetization + Provenance

## users

```text
id
email
name
created_at
updated_at
```

## anonymous_sessions

```text
id
free_scan_used
created_at
expires_at
linked_user_id
```

## credit_wallets

```text
id
user_id
balance
created_at
updated_at
```

## credit_transactions

```text
id
user_id
wallet_id
type
amount
balance_before
balance_after
reference
metadata
created_at
```

Transaction types:

```text
PURCHASE
BONUS
CONSUMPTION
REFUND
ADJUSTMENT
```

## credit_products

```text
id
name
credits
currency
price
active
metadata
created_at
updated_at
```

## analysis_jobs

```text
id
user_id
anonymous_session_id
asset_id
analysis_tier
credit_cost
status
idempotency_key
engine_version
created_at
completed_at
```

## assets

```text
id
user_id
sha256
perceptual_hash
mime_type
filename
size_bytes
width
height
storage_key
created_at
```

## provenance_records

```text
id
asset_id
owner_user_id
public_id
status
visibility
creator_claim
creation_time_claim
registration_time
signature
credential_type
manifest
created_at
```

## provenance_events

```text
id
provenance_id
event_type
timestamp
actor
input_hash
output_hash
software
declaration
signature
created_at
```

## verification_events

```text
id
provenance_id
uploaded_sha256
perceptual_hash
match_type
result
created_at
```

## reports

```text
id
analysis_id
report_type
report_hash
storage_key
created_at
```

---

# 80. Updated API Surface

```text
POST /api/v1/analyze
GET  /api/v1/analysis/{id}

POST /api/v1/provenance
GET  /api/v1/provenance/{id}
POST /api/v1/provenance/{id}/events

POST /api/v1/verify
GET  /api/v1/verify/{public_id}

GET  /api/v1/reports/{id}

GET  /api/v1/credits
GET  /api/v1/credits/products
POST /api/v1/credits/purchase

POST /api/v1/payments/webhook
```

All endpoints involving credits, reports or private assets require authorization.

Public verification should expose only intentionally public provenance information.

---

# 81. Updated Coding Agent Build Order

The recommended build sequence becomes:

```text
1. Repository / application foundation
2. Database schema
3. Authentication + anonymous sessions
4. Secure object storage
5. Upload validation
6. SHA-256 + perceptual hashing
7. Metadata extraction
8. Timestamp engine
9. Device/source engine
10. Editing/software engine
11. C2PA detection
12. AI analysis provider abstraction
13. Evidence engine
14. Free result dashboard
15. Credit wallet
16. Credit ledger
17. Pricing/product configuration
18. Payment abstraction
19. Verified payment webhooks
20. Deep analysis charging
21. Full report generation
22. Email report flow
23. Provenance record creation
24. Provenance signing
25. Public verification page
26. Exact-match verification
27. Evidence report / JSON
28. Analytics
29. Security hardening
30. QA / launch validation
```

This ordering ensures that monetization and provenance are architectural capabilities, not late-stage patches.

---

# 82. Updated Coding Agent Guardrails

The coding agent must additionally:

1. Treat credits as financial value.
2. Never trust a client-side wallet balance.
3. Never credit a wallet solely from frontend payment success.
4. Verify payment webhooks cryptographically according to provider requirements.
5. Make payment events idempotent.
6. Make analysis charging idempotent.
7. Never charge twice because of a retry.
8. Never silently turn a user declaration into a system-detected fact.
9. Preserve the exact original asset hash.
10. Never overwrite original files.
11. Make provenance records append-oriented.
12. Preserve provenance signing information.
13. Store analyzer/model/version with every analytical result.
14. Keep AI providers replaceable.
15. Keep credit costs configurable.
16. Keep pricing configurable.
17. Keep public/private provenance access explicit.
18. Never expose private metadata through verification pages.
19. Never describe an AI detection result as absolute truth.
20. Never treat absent metadata/C2PA as evidence of fraud.
21. Ensure failed analysis jobs can trigger controlled refunds.
22. Maintain a complete credit ledger.
23. Maintain audit records for financial and provenance events.
24. Test cryptographic, payment and credit operations independently.

---

# 83. Updated Launch Acceptance Criteria

The MVP is not launch-ready until all of the following are true.

## Analyze

- [ ] Anonymous user can upload an image.
- [ ] One free Quick Scan is available.
- [ ] SHA-256 is generated.
- [ ] Perceptual hash is generated.
- [ ] EXIF/IPTC/XMP are extracted where available.
- [ ] Timestamp evidence is classified.
- [ ] Device/source signals are classified.
- [ ] Editing/software signals are classified.
- [ ] C2PA is checked.
- [ ] AI/synthetic analysis runs through an abstraction.
- [ ] Evidence engine produces structured findings.
- [ ] Result dashboard explains findings and limitations.

## Create

- [ ] User can upload an image for provenance creation.
- [ ] Baseline analysis is performed.
- [ ] User can provide declarations.
- [ ] User declarations are clearly labelled.
- [ ] SHA-256 is stored.
- [ ] Provenance record is created.
- [ ] Record is cryptographically protected.
- [ ] Visibility can be public or private.
- [ ] Verification URL is generated.
- [ ] Provenance events are stored.

## Verify

- [ ] Public verification page works.
- [ ] Exact file match works.
- [ ] Different file is correctly identified as non-match.
- [ ] Perceptual similarity is clearly distinguished from exact match.
- [ ] Private metadata remains private.

## Monetization

- [ ] Credit wallet works.
- [ ] Credit ledger works.
- [ ] Credit products are configurable.
- [ ] Payment provider integration works.
- [ ] Webhooks are verified.
- [ ] Credits are granted exactly once.
- [ ] Credits are consumed transactionally.
- [ ] Failed analyses can refund credits.
- [ ] Pricing can be changed without code changes.

## Reports

- [ ] Full report can be generated.
- [ ] Professional evidence report can be generated.
- [ ] PDF is generated.
- [ ] JSON is generated.
- [ ] Email delivery works.
- [ ] Report hash is generated.
- [ ] Report references the asset fingerprint and analyzer version.

## Security

- [ ] Malicious uploads are rejected.
- [ ] Image processing is isolated.
- [ ] File size limits exist.
- [ ] Rate limits exist.
- [ ] Private assets are protected.
- [ ] Public pages expose only approved fields.
- [ ] Financial events are auditable.
- [ ] Provenance events are auditable.

---

# 84. Updated Product Phases

## Phase 0 — Foundation

Application, database, storage, authentication, anonymous sessions, security and observability.

## Phase 1 — Detection MVP

Metadata, hashing, timestamps, device/source, software, C2PA, AI analysis and evidence engine.

## Phase 2 — Free-to-Paid Funnel

Free scan, account conversion, credit wallet, ledger, payments and full reports.

## Phase 3 — Provenance Creation + Verification

Provenance registration, signing, public/private verification and exact-match verification.

## Phase 4 — Professional Investigation

Cases, batch processing, comparison, evidence packages and investigator workflows.

## Phase 5 — Enterprise / API

API credits, organizational accounts, teams, integrations and enterprise contracts.

## Phase 6 — Provenance Network

Creator identities, organizational credentials, cross-platform provenance and institutional verification.

---

# 85. Strategic Product Architecture

The platform should be understood as three layers:

```text
                 ┌─────────────────────────────┐
                 │       TRUST INTERFACE       │
                 │ Reports / Verify / Share    │
                 └──────────────┬──────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │       PROVENANCE LAYER      │
                 │ Create / Record / Verify   │
                 └──────────────┬──────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │       EVIDENCE LAYER        │
                 │ Metadata / C2PA / AI /     │
                 │ Hashes / Device / Software │
                 └──────────────┬──────────────┘
                                │
                         DIGITAL ASSET
```

The commercial layer sits across the platform:

```text
FREE SCAN
    ↓
CREDITS
    ↓
REPORTS
    ↓
PROVENANCE CREATION
    ↓
PROFESSIONAL
    ↓
API / ENTERPRISE
```

---

# 86. Final MVP Definition

The MVP should launch as:

> **An Image Provenance & Media Integrity Platform that can investigate an existing image, create a verifiable provenance record for an image a user controls, and allow others to verify whether a file matches that record.**

The commercial loop is:

```text
FREE QUICK SCAN
      ↓
DEEP ANALYSIS
      ↓
CREDITS
      ↓
FULL REPORT
      ↓
PROVENANCE CREATION
      ↓
PUBLIC VERIFICATION
      ↓
REPEAT USAGE
      ↓
PROFESSIONAL / API
```

The core product loop is:

```text
ANALYZE → CREATE → VERIFY
```

The central product promise remains:

> **Don't just ask whether an image is real. Understand the evidence behind it — and create proof for the images you control.**

The strategic objective is to avoid becoming a commodity AI-image detector and instead build infrastructure for:

> **understanding, establishing and verifying digital media provenance.**

---

# 87. One-Sentence Product Definition

> **Upload an image to investigate its provenance, create a verifiable provenance record for images you control, or verify whether a file matches an established provenance record.**
