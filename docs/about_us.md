# MASTER IMPLEMENTATION PROMPT: OYOKOMETA ABOUT US, SERVICES & ENTERPRISE CLIENT INTAKE

## Role

Act as a senior product strategist, UX/UI designer, full-stack engineer, B2B solutions architect, and conversion-focused web developer.

Your task is to extend the existing Oyokometa platform with a professional **About Us and Services experience**, together with a comprehensive **Request a Solution / Client Intake workflow**.

You must work within the existing codebase, architecture, design system, authentication model, database, hosting, and deployment configuration wherever possible.

Do not rebuild the application from scratch. Do not introduce unnecessary dependencies or infrastructure. Inspect the existing implementation before proposing or making changes.

Your goal is to turn Oyokometa into a **hybrid digital media integrity business**: a useful public self-service platform combined with an enterprise solutions, integration, advisory, and managed-services business.

---

# 1. BUSINESS CONTEXT AND STRATEGIC DIRECTION

Website: https://oyokometa.xyz/

Oyokometa began as a platform for three core actions:

- **Analyze:** inspect an image's available metadata, technical characteristics, provenance signals, and supported analysis outputs.
- **Create:** register an image fingerprint and issue an Oyokometa platform-signed provenance record.
- **Verify:** check whether a file matches a previously registered record.

The existing self-service product remains valuable. Preserve it.

However, Oyokometa is expanding beyond the idea of monetizing every individual image analysis. The business will also help organizations solve digital media integrity and verification problems using a combination of:

1. Oyokometa's existing platform and proprietary capabilities.
2. Third-party APIs and specialist technology providers.
3. Custom integrations and workflow automation.
4. Technical assessments, advisory and implementation services.
5. Managed verification, reporting, and ongoing support.
6. New reusable software capabilities developed as recurring customer needs emerge.

For example, an insurer might need to screen images submitted with claims. A newsroom might need help evaluating suspicious images. A marketplace might need image-fraud controls. A financial institution might want to integrate AI-generated media detection into its existing review process.

Oyokometa should be able to understand the requirement, identify suitable technology, assemble a solution, and deliver an agreed outcome without necessarily developing every underlying technology itself.

## Strategic positioning

Position Oyokometa as:

**A digital media integrity and verification platform and solutions partner.**

The business helps organizations understand, assess, document, and manage the risks associated with digital images and other media.

The public app is the self-service entry point. Enterprise services are the commercial expansion. Repeatable, validated customer requirements may eventually become standardized software products.

Do not position Oyokometa merely as:
- An AI image detector.
- A generic metadata reader.
- A digital forensics laboratory that claims capabilities it does not possess.
- A reseller of third-party APIs with no independent value.
- An all-in-one forensic platform attempting to build every possible capability.

The differentiator is the combination of evidence-aware analysis, suitable technology selection, workflow integration, explainable reporting, and practical implementation.

---

# 2. PRIMARY OBJECTIVES

Build the following components.

### A. Dedicated About Us page

Explain:
- What Oyokometa is.
- The problem it addresses.
- Its core Analyze, Create, and Verify platform.
- Its broader digital media integrity services.
- Who the services are for.
- How Oyokometa assembles solutions using its own platform, third-party APIs, specialist partners, and human expertise.
- How prospective customers can engage Oyokometa.

### B. Service catalogue

Present the five core service categories clearly and professionally:

1. AI & Synthetic Media Detection.
2. Image Provenance & Forensic Assessment.
3. Visual Fraud & Claims Screening.
4. API Integration & Workflow Automation.
5. Advisory, Training & Custom Solutions.

Each service must have its own description, typical use cases, intended customers, and a clear call to action.

### C. Request a Solution page and client intake form

Build a structured intake experience that allows prospective customers to describe their problems in sufficient detail for Oyokometa to assess the opportunity.

The form must support all five service categories, mixed requirements, custom requests, one-off projects, pilots, and ongoing service engagements.

### D. Lead management

Persist submissions using the existing backend and database architecture where available.

Provide appropriate notifications, submission confirmation, status tracking, and a practical way for the business owner or authorized team members to review and follow up on enquiries.

### E. Progressive productization

Design the services and data model so repeated customer requests can later become standardized service packages, APIs, managed offerings, or software features without requiring a complete redesign.

---

# 3. PHASE ZERO: AUDIT THE EXISTING APPLICATION

Before writing code, inspect the repository and document:

- Framework and application structure.
- Existing routes and navigation.
- Design tokens, typography, colors, components, and responsive patterns.
- Current Analyze, Create, and Verify experiences.
- Authentication and account management.
- Existing database schema and migrations.
- Existing backend functions and API patterns.
- Current email or notification capabilities.
- File storage and upload configuration.
- Environment variable conventions.
- Hosting and deployment setup.
- Existing privacy policy, terms, and data-handling disclosures.
- Any existing contact, feedback, or enquiry functionality.

Identify the smallest implementation that satisfies the requirements.

Reuse the existing stack and services. Do not create a separate backend, duplicate user tables, introduce another authentication system, or replace working components without a clear reason.

If a required capability does not exist, implement the smallest compatible extension and document the decision.

Do not expose secrets or provider credentials in frontend code.

Deliver a short implementation plan, then proceed with implementation unless a genuine blocker requires clarification.

---

# 4. INFORMATION ARCHITECTURE AND NAVIGATION

Extend the current site without disrupting existing navigation.

Recommended public navigation:

- Analyze
- Create
- Verify
- Services
- About Us
- How It Works
- Pricing, if currently available
- Account / Sign In
- **Request a Solution** — primary business call to action

Use `/about` for the About Us page and `/request-solution` for the service request and client intake page unless the existing routing conventions suggest a more suitable path.

If the project already has an About or Services route, extend it instead of creating a competing duplicate.

The About Us page should link to the relevant service sections and pass the selected service category to the intake form where technically practical.

The intake form must remain accessible from the main navigation and from the footer.

Preserve all existing product routes and behavior.

---

# 5. ABOUT US PAGE: CONTENT AND STRUCTURE

## Section 1 — Hero

Use a strong, commercially credible introduction.

Suggested copy:

**Eyebrow:** DIGITAL MEDIA INTEGRITY & VERIFICATION

**Headline:** Understand the evidence. Build the right solution.

**Supporting copy:**

Oyokometa helps individuals and organizations assess digital media, understand provenance and authenticity signals, and build practical solutions for the risks associated with images and other digital content.

From self-service analysis and verification to enterprise integrations, specialist technology, advisory, and managed services, we help you move from uncertainty to an informed, evidence-based response.

**Primary CTA:** Request a Solution

**Secondary CTA:** Explore the Platform

The secondary CTA should lead to the existing self-service application or its relevant landing page. Determine the correct route from the codebase.

Do not invent customer logos, testimonials, awards, partnerships, statistics, or performance claims.

## Section 2 — The problem we solve

Headline:

**Digital media creates new opportunities—and new risks.**

Explain that organizations increasingly rely on images and other media for communication, journalism, claims, transactions, investigations, marketing, and decision-making.

However, metadata can be incomplete or altered, provenance may be unavailable, AI-generated content can be difficult to assess, and organizations often lack a consistent workflow for reviewing and documenting their findings.

Oyokometa helps organizations identify the evidence available, select appropriate analysis capabilities, interpret findings carefully, and incorporate suitable checks into their operations.

Avoid implying that every image can be conclusively authenticated.

## Section 3 — Our platform

Headline:

**Start with the image. Go further when you need to.**

Present three feature cards.

### Analyze

Inspect available image metadata, file characteristics, provenance information, and supported detection outputs.

CTA: Analyze an Image.

### Create

Register a file fingerprint and create an Oyokometa platform-signed provenance record.

Clearly explain that registration does not independently prove authorship, capture date, or the truth of the depicted event.

CTA: Create a Record.

### Verify

Check whether an image matches an existing Oyokometa provenance record.

Explain that an exact cryptographic match establishes a file match, not the truth of the image's contents.

CTA: Verify a File.

These cards must connect to the existing product experiences.

Do not imply that the public app already supports capabilities that are only planned.

## Section 4 — Our enterprise services

Headline:

**The right capabilities for your actual problem.**

Supporting copy:

Not every organization needs a new platform, and not every problem requires a custom-built model. Oyokometa works with you to understand the requirement, evaluate suitable technologies, and deliver a practical solution using the right combination of software, integrations, specialist providers, and expertise.

Display the five service categories described in Section 6 below.

Every service card should have a CTA that opens the request form with the appropriate category selected.

## Section 5 — How we work

Present a five-step engagement process.

1. **Understand:** Learn about your business, workflow, media risks, constraints, and desired outcome.
2. **Assess:** Determine the required capabilities, data sources, integrations, and evaluation criteria.
3. **Design:** Recommend an appropriate solution using existing tools, specialist APIs, Oyokometa capabilities, or custom development.
4. **Deliver:** Implement the agreed scope, test the solution, document its limitations, and support adoption.
5. **Improve:** Measure performance, review operational feedback, and productize repeated requirements where appropriate.

Emphasize that not every engagement requires custom software or a long implementation project.

Some clients may need an assessment, a technical recommendation, a short pilot, a training engagement, or a managed service.

## Section 6 — Who we serve

Create an audience section with these categories:

- Newsrooms, publishers, and fact-checking organizations.
- Insurers and claims management teams.
- Banks and financial institutions.
- Marketplaces, digital platforms, and online businesses.
- Legal practitioners, investigators, and compliance teams.
- Election observers, civic integrity organizations, and public-interest institutions.
- Enterprises, technology companies, and developers.

Describe these as intended customer segments, not confirmed customers or existing partnerships.

Each audience should link to the intake form, allowing the user to identify their organization type.

## Section 7 — Why Oyokometa

Focus on the intended service philosophy:

- **Evidence-aware:** distinguish technical observations, verification results, inferences, and declarations.
- **Technology-flexible:** use appropriate tools rather than forcing every problem into one product.
- **Practical:** design around existing business workflows and operational constraints.
- **Explainable:** communicate findings, limitations, and uncertainty clearly.
- **Integration-ready:** connect suitable capabilities to customer systems where feasible.
- **Progressive:** develop reusable capabilities as real customer needs emerge.

Do not claim that Oyokometa is the most accurate, industry-leading, independently certified, or superior to competitors unless such claims are substantiated.

## Section 8 — Call to action

Headline:

**Tell us what you need to solve.**

Supporting copy:

Whether you need to investigate suspicious media, introduce AI-generated content screening, integrate verification into an existing workflow, or explore a problem that requires a different approach, let's start with your requirements.

Primary CTA: Request a Solution.

Secondary CTA: Explore the Platform.

## Section 9 — Footer

Retain the existing footer conventions and add links to:

- About Us.
- Services.
- Request a Solution.
- Analyze, Create, and Verify.
- How It Works.
- Privacy Policy.
- Terms of Service.
- Existing support or contact channels.

Only link to policy pages that exist. If a necessary policy is absent, identify that gap instead of inventing a route.

---

# 6. SERVICE CATALOGUE: FIVE CORE OFFERINGS

Create a consistent data structure for the service catalogue so services can be displayed on the About page, a dedicated Services page if appropriate, and the intake form.

Use the following initial service definitions.

## Service 1 — AI & Synthetic Media Detection

**Description:**

Evaluate available technologies for identifying AI-generated images, synthetic media, deepfakes, and related content risks.

Possible engagements include:
- Evaluating third-party detection APIs.
- Benchmarking detection tools against representative customer media.
- Integrating suitable detection capabilities into existing workflows.
- Combining detector outputs with metadata and provenance signals.
- Developing review procedures for uncertain or conflicting results.

Potential customers: newsrooms, platforms, insurers, marketplaces, compliance teams, and enterprises.

Important limitation: detection outputs are probabilistic and may fail on unfamiliar generators, edited images, screenshots, or compressed media. Do not present a model score as conclusive proof of fraud or authenticity.

## Service 2 — Image Provenance & Forensic Assessment

**Description:**

Help clients inspect available technical evidence and document what can and cannot be established about a digital image.

Possible engagements include:
- Metadata and file-structure analysis.
- Cryptographic fingerprinting.
- Content Credentials and supported provenance checks.
- Comparison of image versions.
- Evidence-oriented reporting.
- Review of timestamp inconsistencies and technical signals.
- Recommendations for preserving original files and documenting handling.

Potential customers: journalists, investigators, legal teams, fact-checkers, and organizations handling disputed media.

Important limitation: Oyokometa must not represent a technical report as a conclusive determination of authorship, intent, truth, or legal admissibility.

Specialist forensic services should only be offered within demonstrated capabilities and appropriately qualified partnerships.

## Service 3 — Visual Fraud & Claims Screening

**Description:**

Design and evaluate workflows for organizations that receive images as part of claims, applications, listings, transactions, or other business processes.

Possible engagements include:
- Insurance claims image screening.
- Duplicate or near-duplicate image checks.
- Detection of suspicious patterns.
- Image submission review workflows.
- Escalation procedures for human review.
- Integration into existing case management systems.
- Pilot evaluations using customer-approved datasets.

Potential customers: insurers, financial institutions, marketplaces, and digital platforms.

Important limitation: screening tools should support human review and established decision policies. Do not automatically classify a customer as fraudulent based solely on an AI detector output.

## Service 4 — API Integration & Workflow Automation

**Description:**

Help organizations integrate suitable media analysis, detection, moderation, provenance, and verification capabilities into their existing systems.

Possible engagements include:
- Third-party API selection and integration.
- Provider orchestration.
- Normalization of outputs from multiple providers.
- Backend processing pipelines.
- Case management and reporting workflows.
- Usage tracking, cost controls, and monitoring.
- Enterprise API design and implementation.
- Integration with existing client applications and infrastructure.

Potential customers: technology companies, developers, enterprises, financial institutions, and platforms.

Use existing Oyokometa components and third-party providers where appropriate. Do not build a new version of an existing capability merely for the sake of owning it.

## Service 5 — Advisory, Training & Custom Solutions

**Description:**

Help organizations understand digital media integrity risks, select appropriate technologies, design operational procedures, and develop the capabilities needed to use these tools responsibly.

Possible engagements include:
- Digital media integrity assessments.
- Vendor and technology evaluation.
- Proof-of-concept design.
- Technical workshops.
- Staff training.
- Operational policy development.
- Solution architecture and implementation planning.
- Custom software and specialist partner coordination.

Potential customers: enterprises, newsrooms, legal teams, public-interest organizations, and technology businesses.

Clearly distinguish advisory deliverables from services requiring specialist forensic, legal, or other regulated expertise.

## Additional / custom requirement

Always include an option for a customer whose need does not fit neatly into one category.

Label it:

**Something else / Custom requirement**

Allow the customer to describe the problem in their own words.

---

# 7. REQUEST A SOLUTION PAGE

The intake experience is a core commercial feature, not a secondary contact form.

## Page introduction

**Eyebrow:** WORK WITH OYOKOMETA

**Headline:** Tell us what you need to solve.

**Supporting copy:**

Every organization has different requirements. Tell us about your challenge, your current workflow, and the outcome you need. We'll review the request and determine whether it is best addressed through an existing Oyokometa capability, a third-party technology, a custom integration, an advisory engagement, or a combination of these.

**Expectation-setting statement:**

Submitting a request does not commit you to a purchase or guarantee that Oyokometa can deliver every requested capability. We will assess feasibility, scope, data requirements, and appropriate next steps.

Use a multi-section form with a clear progress indicator. Avoid showing every possible field on the screen at once.

The form must be usable on mobile and desktop.

---

# 8. CLIENT INTAKE FORM: REQUIRED FIELDS

## Section A — Contact information

Required fields:

- Full name.
- Business email.
- Organization or company name.
- Job title or role.
- Country of operation.
- Preferred contact method.

Optional fields:

- Phone number.
- Organization website.
- LinkedIn or professional profile.
- Preferred time for a conversation.

Use a business email where available, but do not unnecessarily exclude legitimate individual practitioners.

Do not ask for government identification, bank details, passwords, or unrelated personal information.

## Section B — Organization profile

Ask the user to select one:

- Newsroom / Publisher / Fact-checker.
- Insurance / Claims.
- Banking / Financial Services.
- Marketplace / E-commerce.
- Technology Company / Developer.
- Legal / Investigation / Compliance.
- Election Observation / Civic Integrity.
- Government / Public Institution.
- Enterprise / Corporate.
- Individual Professional.
- Other.

Allow an optional description of the organization and its operating context.

## Section C — What do you need help with?

Allow multiple selections:

- AI-generated image detection.
- Deepfake or synthetic media assessment.
- Image provenance and metadata analysis.
- File verification and cryptographic records.
- Visual fraud or claims screening.
- Duplicate or similar-image detection.
- Content moderation or media risk screening.
- API integration.
- Workflow automation.
- Digital media integrity assessment.
- Training or advisory.
- Managed verification service.
- Custom software or solution design.
- Other / Not sure yet.

The user should be able to select multiple services because real-world projects may span several categories.

If the user arrives through a specific service CTA, preselect that service without preventing changes.

## Section D — Describe the problem

Required:

**What problem are you trying to solve?**

Use a generous multiline text field.

Suggested prompt:

"Describe the situation, what currently happens, why it is a problem, and what you would like to achieve."

Optional supporting questions:

- What triggers the need for this solution?
- What happens if the problem is not addressed?
- How is the problem handled today?
- What tools or providers do you currently use?
- What would a successful outcome look like?

Use progressive disclosure for supporting questions to avoid an overwhelming form.

## Section E — Media and technical requirements

Ask what kinds of media are involved:

- Photographs / Images.
- AI-generated images.
- Video.
- Audio.
- Documents containing images.
- Screenshots / Social media content.
- Multiple media types.
- Not yet determined.

Ask where the media originates:

- Direct uploads from users or customers.
- Social media or messaging platforms.
- Insurance or claims submissions.
- Internal company systems.
- Public websites.
- Newsroom or investigation workflows.
- APIs or automated feeds.
- Other.

Ask about approximate volume:

- Fewer than 100 files per month.
- 100–1,000 files per month.
- 1,001–10,000 files per month.
- 10,001–100,000 files per month.
- More than 100,000 files per month.
- Unknown / To be assessed.

Ask about the desired engagement:

- One-off assessment.
- Proof of concept / Pilot.
- API integration.
- Custom implementation.
- Ongoing managed service.
- Advisory or training.
- Not sure; recommend an approach.

Additional optional fields:

- Existing systems to integrate with.
- Required output format.
- Expected turnaround time.
- Security, privacy, data residency, or retention requirements.
- Any relevant technical documentation or non-sensitive sample specifications.

Do not require a customer to know the names of technical providers or models.

## Section F — Commercial context

Make these fields optional where appropriate.

Budget range:

- Under $1,000.
- $1,000–$5,000.
- $5,001–$15,000.
- $15,001–$50,000.
- More than $50,000.
- Not yet determined.
- Prefer to discuss.

These are preliminary qualification bands, not published prices or binding quotations. Keep them configurable so the business can change them without code restructuring.

Preferred currency:

- USD.
- NGN.
- Other / To be discussed.

Expected start:

- Immediately / Urgent.
- Within 30 days.
- Within 1–3 months.
- Within 3–6 months.
- Exploratory / No fixed date.

Decision status:

- Exploring options.
- Preparing an internal business case.
- Seeking a vendor or implementation partner.
- Budget approved.
- Procurement underway.
- Other.

Avoid making the form feel like a sales interrogation. Budget and procurement fields should be optional and may be placed in an expandable section.

## Section G — Supporting files

Allow an optional attachment only if the existing storage and security architecture supports it.

Possible attachments:
- Requirements document.
- Workflow diagram.
- API documentation.
- Redacted sample report.
- Non-sensitive example files.
- Technical specification.

Security requirements:
- Enforce file type and size limits.
- Validate uploads server-side.
- Use private storage and short-lived access links.
- Restrict access to authorized team members.
- Apply malware scanning where supported.
- Avoid public file URLs.
- Define retention and deletion rules.
- Never use submitted customer files to train models without explicit, separate authorization.

**Important:** warn customers not to upload sensitive images, personal data, confidential business records, or potentially evidentiary material until Oyokometa has provided an appropriate secure submission method and agreed on handling requirements.

If secure uploads cannot be implemented safely within the existing infrastructure, do not add them merely to complete the form. Let the customer describe the available materials and arrange a secure follow-up.

## Section H — Consent and submission

Include:

- Required acknowledgement that the requester has read the privacy notice.
- Optional, separate consent to receive future marketing or educational updates.
- Optional agreement to be contacted regarding the submitted request.
- A link to the privacy policy and terms where available.

Do not combine marketing consent with necessary communication about the submitted request.

Include reasonable anti-spam protection using the existing application approach.

---

# 9. CONDITIONAL INTAKE BEHAVIOUR

Make the form adapt to the selected service.

Examples:

### If AI & Synthetic Media Detection is selected

Show optional questions about:
- Image or video volume.
- Known sources of media.
- Whether the customer needs a one-time assessment or production screening.
- Acceptable false-positive and false-negative trade-offs.
- Whether results require human review.

### If Provenance & Forensic Assessment is selected

Ask:
- Whether original files are available.
- Whether multiple versions exist.
- Whether the customer needs a technical report or a broader workflow assessment.
- Whether the matter is time-sensitive.
- Whether there are special evidence-handling requirements.

Do not ask for detailed case evidence in an insecure intake form.

### If Visual Fraud & Claims Screening is selected

Ask:
- The type of claim or transaction.
- Approximate volume.
- Current review process.
- Whether there is an existing claims or case management system.
- Whether the objective is triage, duplicate detection, evidence documentation, or workflow automation.

### If API Integration is selected

Ask:
- Whether API documentation is available.
- The existing technology stack, if known.
- Whether the solution is internal or customer-facing.
- Expected throughput.
- Authentication and integration requirements.
- Whether a test environment is available.

### If Advisory, Training & Custom Solutions is selected

Ask:
- Desired outcome.
- Target audience.
- Expected participants or teams, if relevant.
- Preferred delivery format.
- Whether the engagement is exploratory, training-focused, or implementation-oriented.

These conditional sections should reveal only relevant questions. Do not make any category so complex that the form becomes unusable.

---

# 10. SUBMISSION CONFIRMATION AND FOLLOW-UP

After successful submission, show a dedicated confirmation state or page.

Suggested copy:

**Thank you. We've received your request.**

Your requirements have been submitted to Oyokometa for review. We'll assess the information provided and determine the appropriate next step.

Depending on your request, that may involve a clarification, a discovery call, a technical assessment, a proposed pilot, or a scoped engagement.

Your request is not yet a commitment to deliver a service, and no pricing or implementation timeline is confirmed until agreed.

Show a submission reference if the backend can reliably generate one.

Provide:
- A clear confirmation message.
- A return-to-platform link.
- A link to explore the existing Analyze, Create, and Verify tools.
- An optional calendar-booking link only if a real scheduling integration already exists.

Send a confirmation email if the current infrastructure supports it. Do not claim that an email was sent unless the delivery system reports success.

Notify the authorized Oyokometa team through the existing notification mechanism.

Email notifications should summarize the request and link to the secured internal record. Do not send sensitive attachments or unnecessary personal information in plain-text email.

---

# 11. BACKEND, DATABASE, AND LEAD MANAGEMENT

Inspect the existing database and reuse the current architecture.

If a suitable lead or contact table does not exist, introduce a properly designed client-request data model.

Suggested conceptual fields:

- Unique request ID.
- Creation timestamp.
- Request status.
- Contact name and email.
- Organization name and type.
- Country and preferred contact method.
- Selected service categories.
- Problem description.
- Media types and sources.
- Estimated volume.
- Engagement type.
- Budget range and currency, if provided.
- Expected start date.
- Technical and integration requirements.
- Privacy and retention requirements.
- Supporting file references, if implemented securely.
- Consent records and timestamps.
- Internal notes.
- Assigned team member, if relevant.
- Last updated timestamp.
- Follow-up history, if supported.

Use the existing database's conventions and avoid creating unnecessary fields that duplicate existing user profile information.

Suggested initial status values:

- New.
- Reviewing.
- Clarification Required.
- Qualified.
- Discovery Scheduled.
- Proposal in Progress.
- Proposal Sent.
- Pilot / Project Active.
- Won.
- Lost.
- Archived.

Treat these as configurable workflow states, not hardcoded business logic scattered across the frontend.

## Lead security

- Validate all inputs on the server.
- Enforce authorization for internal lead views and updates.
- Apply appropriate database row-level security where supported.
- Do not expose submitted enquiries through public APIs.
- Do not allow anonymous users to enumerate requests.
- Protect against spam and duplicate submissions.
- Use idempotency or other appropriate safeguards where needed.
- Keep credentials and privileged database access server-side.
- Apply retention and deletion controls.
- Record administrative access or status changes where appropriate.

If the current product has no internal administration interface, implement the minimum secure lead-review mechanism that fits the existing application. Do not create a public dashboard for customer submissions.

---

# 12. DESIGN AND USER EXPERIENCE

Follow the existing Oyokometa brand.

## Visual direction

- Deep black / charcoal backgrounds.
- White primary text.
- Warm amber / orange accents consistent with the logo.
- Clear hierarchy and generous spacing.
- Modern, premium typography.
- Restrained use of gradients, borders, and glow effects.
- Professional, enterprise-ready presentation.
- Minimal, purposeful motion.
- Responsive layouts that work on mobile, tablet, and desktop.

Use existing components and design tokens wherever possible.

Do not redesign the existing Analyze, Create, and Verify application as part of this task.

## Design principles

1. Make the business model understandable within seconds.
2. Explain the public product and enterprise services as complementary, not competing offerings.
3. Keep the service catalogue scannable.
4. Make the Request a Solution CTA prominent without making the site feel aggressive or sales-heavy.
5. Use progressive disclosure for the intake form.
6. Provide accessible labels, keyboard navigation, visible focus states, and meaningful error messages.
7. Preserve input values when validation fails.
8. Make loading, submission success, and submission failure states explicit.
9. Avoid unnecessary animations, decorative clutter, and excessive card layouts.
10. Ensure all navigation and buttons work.

Use Lucide icons or the icon library already installed in the project. Do not introduce a new icon library unless necessary.

Avoid generic stock imagery that makes Oyokometa appear to be an unrelated cybersecurity company. Prefer restrained technical illustrations, product screenshots already available in the codebase, and the existing brand identity.

---

# 13. SEARCH ENGINE OPTIMIZATION AND DISCOVERABILITY

Implement page-specific metadata consistent with the existing framework.

Suggested About Us title:

Oyokometa | Digital Media Integrity & Verification Solutions

Suggested description:

Explore Oyokometa's image analysis, provenance, verification, AI media assessment, enterprise integrations, and digital media integrity services.

Suggested Request a Solution title:

Request a Digital Media Integrity Solution | Oyokometa

Suggested description:

Tell Oyokometa about your digital media verification, AI detection, image fraud screening, API integration, advisory, or managed-service requirements.

Also implement where supported:
- Canonical URLs.
- Social sharing metadata.
- Appropriate Open Graph title, description, and image.
- A useful page heading structure.
- Descriptive links and button labels.
- Indexable public service content.
- No indexing of private client intake records or administrative pages.

Do not add fabricated structured data about reviews, ratings, awards, or partnerships.

---

# 14. PRODUCT AND COMMERCIAL ARCHITECTURE

Design the implementation around the hybrid business model.

The public application remains available as a self-service product.

The services catalogue and intake workflow should be independent of any particular third-party API provider.

Do not hardcode Hive or another vendor as the only possible solution. Providers may be evaluated, changed, combined, or replaced as requirements evolve.

The intake data should help Oyokometa understand:
- Which customer segments are enquiring.
- Which problems appear repeatedly.
- Which service categories generate qualified opportunities.
- What media volumes and integration requirements are common.
- Which requests could become standardized products.
- Which requests are better handled through advisory or managed services.

Where appropriate, create configurable service definitions rather than embedding all service descriptions and form mappings in multiple frontend components.

However, do not prematurely build a full CRM, vendor orchestration engine, billing platform, or complex service marketplace. The goal is to capture and manage real opportunities, not to build infrastructure before demand exists.

---

# 15. ANALYTICS AND COMMERCIAL MEASUREMENT

If an analytics system already exists, use it. Do not introduce a new analytics platform without a clear need.

Track appropriate events such as:

- About page viewed.
- Service category selected.
- Request a Solution CTA clicked.
- Intake form started.
- Service category selected in the form.
- Intake form completed.
- Intake form submission succeeded.
- Intake form submission failed.

Avoid sending personal data, raw problem descriptions, email addresses, or sensitive customer information to analytics services.

Provide a simple way to assess:
- Number of requests.
- Requests by service category.
- Qualified enquiries.
- Discovery meetings.
- Proposals issued.
- Projects won.
- Conversion by service category.

If the current infrastructure does not support a reporting dashboard, start with a secure database query or simple internal reporting mechanism rather than creating an elaborate analytics system.

---

# 16. TESTING AND ACCEPTANCE CRITERIA

Do not consider the work complete simply because the pages render.

Verify the following.

## About Us

- The page uses the existing brand and design system.
- Analyze, Create, and Verify remain accessible.
- All five service categories are represented.
- Service descriptions do not promise unimplemented capabilities.
- All calls to action lead to working routes.
- Content is readable and responsive.
- SEO and social metadata are present.
- No fabricated testimonials, customers, certifications, or performance claims appear.

## Intake form

- Required-field validation works.
- Optional fields can be left blank.
- Multiple service categories can be selected.
- Service-specific questions appear and disappear correctly.
- Selected values persist when the user moves between form steps.
- Submission creates one valid backend record.
- Duplicate submissions are handled appropriately.
- Error states explain what the user should do.
- Success confirmation is displayed only after a confirmed successful submission.
- Notifications behave according to the actual notification provider's result.
- Sensitive data is not exposed in public responses, logs, analytics, or email.
- Secure file upload is tested if implemented.
- The form is usable with keyboard navigation and screen readers.

## Backend

- Database migrations apply cleanly.
- Existing records and product functionality remain intact.
- Server-side validation and authorization work.
- Anonymous users cannot view or modify other people's submissions.
- Internal lead-review access is restricted.
- Secrets remain server-side.
- Retention and deletion behavior is documented.

## Regression

- Existing Analyze, Create, and Verify functionality remains operational.
- Existing authentication and navigation are not broken.
- No unrelated features are removed.
- The build and lint checks pass where configured.
- Relevant automated tests pass.
- A manual smoke test is completed on mobile and desktop.

---

# 17. IMPLEMENTATION DELIVERABLES

Complete the work and provide:

1. A concise summary of the existing architecture discovered.
2. The implemented About Us page.
3. The implemented service catalogue.
4. The implemented Request a Solution page and client intake form.
5. Database changes and migrations, if required.
6. Notification integration, if supported.
7. Secure lead-review access or the minimal administrative workflow implemented.
8. Any new environment variables, with descriptions but no exposed secrets.
9. Automated tests and manual verification results.
10. A list of changed files and routes.
11. Any required deployment steps.
12. Any known limitations, missing configuration, or external dependencies.
13. Recommended next steps for validating the commercial proposition.

Do not claim successful deployment, email delivery, database persistence, or external integration unless each has actually been tested and confirmed.

If an external service requires credentials or account configuration, implement the appropriate integration boundary, document the required configuration, and clearly identify what remains pending.

---

# 18. EXECUTION INSTRUCTIONS

Work in this order:

**Step 1:** Inspect the current codebase and architecture.

**Step 2:** Identify existing reusable components, routes, backend capabilities, and privacy controls.

**Step 3:** Implement the About Us page and service catalogue.

**Step 4:** Implement the multi-step intake form and conditional questions.

**Step 5:** Connect the form to secure persistence and notifications using the existing architecture.

**Step 6:** Implement the minimum viable lead-review workflow.

**Step 7:** Test validation, submission, authorization, responsiveness, accessibility, and regression behavior.

**Step 8:** Report completed work, test results, deployment requirements, and remaining limitations.

Do not stop after producing a plan or mockup. Implement the working feature within the available environment.

Do not ask me to choose implementation details that can be determined by inspecting the repository. Use sound engineering judgment and document important decisions.

If a genuinely essential requirement cannot be resolved from the codebase or existing configuration, isolate that dependency and proceed with the rest.

## Final principle

Build Oyokometa as a **hybrid digital media integrity business with a useful self-service product, a clear enterprise service offering, and a structured process for discovering and delivering customer solutions**.

The objective is not to turn Oyokometa into a massive all-in-one forensic application.

The objective is to make it easy for customers to understand what Oyokometa can help them accomplish, explain their actual problems, and engage the business—while allowing the underlying solution to use the most appropriate combination of Oyokometa's capabilities, third-party technologies, specialist partners, and custom implementation.

Build for the opportunities that customers demonstrate they will pay for, and productize the capabilities that prove reusable.