/** Enterprise service catalogue and intake vocabulary. Providers are not named here. */

export const SOLUTION_SERVICES = [
  {
    id: "ai-detection",
    title: "AI & Synthetic Media Detection",
    summary: "Assess AI-generated and synthetic images, then fit a check into the review you already run.",
    useCases: [
      "Compare tools on your own images",
      "Add a check to an existing workflow",
      "Combine scores with metadata and provenance",
      "Write a procedure for uncertain results",
    ],
    customers: "Newsrooms, platforms, insurers, and marketplaces.",
    limitation: "A score is a signal. It is not proof of fraud or authenticity.",
  },
  {
    id: "provenance",
    title: "Image Provenance & Forensic Assessment",
    summary: "Inspect an image and record what the file can and cannot establish.",
    useCases: [
      "Metadata and file structure",
      "Fingerprints and version comparison",
      "Content Credentials",
      "A written evidence report",
    ],
    customers: "Journalists, investigators, legal teams, and fact-checkers.",
    limitation: "A report does not prove authorship, intent, or truth.",
  },
  {
    id: "claims",
    title: "Visual Fraud & Claims Screening",
    summary: "Screen images that arrive with a claim, application, or listing.",
    useCases: [
      "Claims and listing screening",
      "Duplicate and near-duplicate checks",
      "Escalation to a person",
      "A pilot on your own files",
    ],
    customers: "Insurers, banks, marketplaces, and platforms.",
    limitation: "A check supports human review. It does not label a person or a claim as fraud.",
  },
  {
    id: "integration",
    title: "API Integration & Workflow Automation",
    summary: "Connect a media check to the systems you already use.",
    useCases: [
      "Choose a suitable API",
      "Normalise results from more than one provider",
      "Usage and cost reporting",
      "An internal or customer-facing workflow",
    ],
    customers: "Technology teams, enterprises, and financial institutions.",
    limitation: "We connect a tool that already does the job.",
  },
  {
    id: "advisory",
    title: "Advisory, Training & Custom Solutions",
    summary: "Help a team choose an approach and use it with a clear sense of its limits.",
    useCases: [
      "Assessment and tool evaluation",
      "Training and operating procedures",
      "A proof of concept or plan",
      "Coordination of a custom build",
    ],
    customers: "Enterprises, newsrooms, legal teams, and public-interest organisations.",
    limitation: "Advice is not a substitute for specialist forensic or legal work.",
  },
] as const;

export const CUSTOM_SERVICE = {
  id: "custom",
  title: "Something else / Custom requirement",
  summary: "Tell us about a problem that does not fit the list above.",
} as const;

export const SOLUTION_SERVICE_IDS = [...SOLUTION_SERVICES.map((service) => service.id), CUSTOM_SERVICE.id] as const;

export type SolutionServiceId = (typeof SOLUTION_SERVICE_IDS)[number];

export const SOLUTION_NEEDS = [
  { id: "ai-image", label: "AI-generated image detection" },
  { id: "deepfake", label: "Deepfake or synthetic media assessment" },
  { id: "provenance", label: "Image provenance and metadata analysis" },
  { id: "verification", label: "File verification and cryptographic records" },
  { id: "claims", label: "Visual fraud or claims screening" },
  { id: "duplicates", label: "Duplicate or similar-image detection" },
  { id: "moderation", label: "Content moderation or media risk screening" },
  { id: "api", label: "API integration" },
  { id: "workflow", label: "Workflow automation" },
  { id: "assessment", label: "Digital media integrity assessment" },
  { id: "training", label: "Training or advisory" },
  { id: "managed", label: "Managed verification service" },
  { id: "custom-software", label: "Custom software or solution design" },
  { id: "unsure", label: "Other / Not sure yet" },
] as const;

export const SOLUTION_ORGANIZATIONS = [
  { id: "newsroom", label: "Newsroom / Publisher / Fact-checker" },
  { id: "insurance", label: "Insurance / Claims" },
  { id: "banking", label: "Banking / Financial Services" },
  { id: "marketplace", label: "Marketplace / E-commerce" },
  { id: "technology", label: "Technology Company / Developer" },
  { id: "legal", label: "Legal / Investigation / Compliance" },
  { id: "civic", label: "Election Observation / Civic Integrity" },
  { id: "government", label: "Government / Public Institution" },
  { id: "enterprise", label: "Enterprise / Corporate" },
  { id: "individual", label: "Individual Professional" },
  { id: "other", label: "Other" },
] as const;

export const SOLUTION_CONTACT_METHODS = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "either", label: "Either email or phone" },
] as const;

export const SOLUTION_MEDIA_TYPES = [
  { id: "photos", label: "Photographs / Images" },
  { id: "ai-images", label: "AI-generated images" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "documents", label: "Documents containing images" },
  { id: "screenshots", label: "Screenshots / Social media content" },
  { id: "mixed", label: "Multiple media types" },
  { id: "unknown", label: "Not yet determined" },
] as const;

export const SOLUTION_MEDIA_SOURCES = [
  { id: "uploads", label: "Direct uploads from users or customers" },
  { id: "social", label: "Social media or messaging platforms" },
  { id: "claims", label: "Insurance or claims submissions" },
  { id: "internal", label: "Internal company systems" },
  { id: "web", label: "Public websites" },
  { id: "newsroom", label: "Newsroom or investigation workflows" },
  { id: "feeds", label: "APIs or automated feeds" },
  { id: "other", label: "Other" },
] as const;

export const SOLUTION_VOLUMES = [
  { id: "under-100", label: "Fewer than 100 files per month" },
  { id: "100-1000", label: "100–1,000 files per month" },
  { id: "1001-10000", label: "1,001–10,000 files per month" },
  { id: "10001-100000", label: "10,001–100,000 files per month" },
  { id: "over-100000", label: "More than 100,000 files per month" },
  { id: "unknown", label: "Unknown / To be assessed" },
] as const;

export const SOLUTION_ENGAGEMENTS = [
  { id: "assessment", label: "One-off assessment" },
  { id: "pilot", label: "Proof of concept / Pilot" },
  { id: "api", label: "API integration" },
  { id: "implementation", label: "Custom implementation" },
  { id: "managed", label: "Ongoing managed service" },
  { id: "advisory", label: "Advisory or training" },
  { id: "unsure", label: "Not sure; recommend an approach" },
] as const;

export const SOLUTION_BUDGETS = [
  { id: "under-1000", label: "Under $1,000" },
  { id: "1000-5000", label: "$1,000–$5,000" },
  { id: "5001-15000", label: "$5,001–$15,000" },
  { id: "15001-50000", label: "$15,001–$50,000" },
  { id: "over-50000", label: "More than $50,000" },
  { id: "undetermined", label: "Not yet determined" },
  { id: "discuss", label: "Prefer to discuss" },
] as const;

export const SOLUTION_CURRENCIES = [
  { id: "USD", label: "USD" },
  { id: "NGN", label: "NGN" },
  { id: "other", label: "Other / To be discussed" },
] as const;

export const SOLUTION_STARTS = [
  { id: "urgent", label: "Immediately / Urgent" },
  { id: "30-days", label: "Within 30 days" },
  { id: "1-3-months", label: "Within 1–3 months" },
  { id: "3-6-months", label: "Within 3–6 months" },
  { id: "exploratory", label: "Exploratory / No fixed date" },
] as const;

export const SOLUTION_DECISIONS = [
  { id: "exploring", label: "Exploring options" },
  { id: "business-case", label: "Preparing an internal business case" },
  { id: "seeking", label: "Seeking a vendor or implementation partner" },
  { id: "approved", label: "Budget approved" },
  { id: "procurement", label: "Procurement underway" },
  { id: "other", label: "Other" },
] as const;

export const SOLUTION_STATUSES = [
  { id: "new", label: "New" },
  { id: "reviewing", label: "Reviewing" },
  { id: "clarification_required", label: "Clarification Required" },
  { id: "qualified", label: "Qualified" },
  { id: "discovery_scheduled", label: "Discovery Scheduled" },
  { id: "proposal_in_progress", label: "Proposal in Progress" },
  { id: "proposal_sent", label: "Proposal Sent" },
  { id: "pilot_active", label: "Pilot / Project Active" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "archived", label: "Archived" },
] as const;

export type SolutionStatusId = (typeof SOLUTION_STATUSES)[number]["id"];

export const SOLUTION_AUDIENCES = [
  {
    id: "newsroom",
    label: "Newsrooms, publishers, and fact-checking organisations",
    detail: "Assess suspicious images and document what the available evidence supports.",
  },
  {
    id: "insurance",
    label: "Insurers and claims management teams",
    detail: "Screen images that arrive with a claim, then hand uncertain cases to a person.",
  },
  {
    id: "banking",
    label: "Banks and financial institutions",
    detail: "Add media checks to a review process the institution already runs.",
  },
  {
    id: "marketplace",
    label: "Marketplaces, digital platforms, and online businesses",
    detail: "Look for image fraud, duplicates, and synthetic media in listings or uploads.",
  },
  {
    id: "legal",
    label: "Legal practitioners, investigators, and compliance teams",
    detail: "Inspect a file and record what can and cannot be established.",
  },
  {
    id: "civic",
    label: "Election observers, civic integrity organisations, and public-interest institutions",
    detail: "Check images that circulate during a public event, without treating a tool score as a verdict.",
  },
  {
    id: "enterprise",
    label: "Enterprises, technology companies, and developers",
    detail: "Integrate a check, or start with an assessment of what is worth building.",
  },
] as const;

const ids = (rows: readonly { id: string }[]) => new Set(rows.map((row) => row.id));

export const SOLUTION_ID_SETS = {
  services: ids(SOLUTION_SERVICE_IDS.map((id) => ({ id }))),
  needs: ids(SOLUTION_NEEDS),
  organizations: ids(SOLUTION_ORGANIZATIONS),
  contactMethods: ids(SOLUTION_CONTACT_METHODS),
  mediaTypes: ids(SOLUTION_MEDIA_TYPES),
  mediaSources: ids(SOLUTION_MEDIA_SOURCES),
  volumes: ids(SOLUTION_VOLUMES),
  engagements: ids(SOLUTION_ENGAGEMENTS),
  budgets: ids(SOLUTION_BUDGETS),
  currencies: ids(SOLUTION_CURRENCIES),
  starts: ids(SOLUTION_STARTS),
  decisions: ids(SOLUTION_DECISIONS),
  statuses: ids(SOLUTION_STATUSES),
};

export function solutionTitle(id: string) {
  return SOLUTION_SERVICES.find((service) => service.id === id)?.title ?? (id === CUSTOM_SERVICE.id ? CUSTOM_SERVICE.title : id);
}

export function solutionLabel(rows: readonly { id: string; label: string }[], id: string | null | undefined) {
  if (!id) return "";
  return rows.find((row) => row.id === id)?.label ?? id;
}
