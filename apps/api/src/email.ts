import { Resend } from "resend";
import type { BankDetails } from "./bank.js";
import { publicAppOrigin } from "./origin.js";
import { renderHtml, renderText, type MailBody } from "./email-template.js";

export class EmailDeliveryError extends Error {
  constructor(message = "Could not send email") {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export type { MailBody };

function fromAddress() {
  return process.env.EMAIL_FROM ?? "Oyokometa <noreply@localhost>";
}

export async function sendTransactional(mail: MailBody): Promise<{ sent: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new EmailDeliveryError("Email is not configured");
    }
    console.log(JSON.stringify({ msg: "email_dev", subject: mail.subject, to: mail.to, url: mail.ctaUrl ?? null }));
    return { sent: false };
  }
  const resend = new Resend(key);
  const result = await resend.emails.send({
    from: fromAddress(),
    to: mail.to,
    subject: mail.subject,
    html: renderHtml(mail),
    text: renderText(mail),
  });
  const error = result?.error;
  const data = result?.data;
  if (error) {
    console.error(JSON.stringify({ msg: "resend_failed", message: error.message }));
    throw new EmailDeliveryError("Could not send email");
  }
  return { sent: true, id: data?.id };
}

export async function sendVerifyEmail(email: string, url: string) {
  const out = await sendTransactional({
    to: email,
    subject: "Confirm your Oyokometa email",
    kicker: "Account",
    heading: "Confirm this email",
    preheader: "Confirm your email to buy credits and register files.",
    paragraphs: [
      "Confirm this address to finish creating your account. You can sign in now; credits, reports and registration wait until the address is confirmed.",
    ],
    ctaLabel: "Confirm email",
    ctaUrl: url,
  });
  return { sent: out.sent, url };
}

export async function sendPasswordReset(email: string, url: string) {
  const out = await sendTransactional({
    to: email,
    subject: "Reset your Oyokometa password",
    kicker: "Account",
    heading: "Choose a new password",
    preheader: "This reset link expires in 30 minutes.",
    paragraphs: [
      "Use the button below to choose a new password. The link expires in 30 minutes and can be used once.",
      "If you did not ask to reset a password, you can ignore this message.",
    ],
    ctaLabel: "Reset password",
    ctaUrl: url,
  });
  return { sent: out.sent, url };
}

export async function sendMagicLink(email: string, url: string) {
  const out = await sendTransactional({
    to: email,
    subject: "Sign in to Oyokometa",
    kicker: "Account",
    heading: "Sign in to continue",
    preheader: "Your sign-in link expires in 15 minutes. No password is used.",
    paragraphs: [
      "Use the button below to sign in. The link expires in 15 minutes. No password is used.",
      "If you did not request this, you can ignore the message.",
    ],
    ctaLabel: "Sign in",
    ctaUrl: url,
  });
  return { sent: out.sent, url };
}

export async function sendDisputeLink(email: string, url: string) {
  const out = await sendTransactional({
    to: email,
    subject: "Confirm your Oyokometa dispute",
    kicker: "Public record",
    heading: "Confirm this complaint",
    preheader: "Confirm a complaint about a public registration. This does not prove authorship.",
    paragraphs: [
      "Confirm this complaint about a public registration. It does not prove authorship or ownership.",
      "The link can be used once.",
    ],
    ctaLabel: "Confirm complaint",
    ctaUrl: url,
  });
  return { sent: out.sent, url };
}

export async function sendReportLink(email: string, url: string) {
  await sendTransactional({
    to: email,
    subject: "Your Oyokometa report is ready",
    kicker: "Deep analysis",
    heading: "Your report is ready",
    preheader: "Open the signed-in report. The PDF is not attached.",
    paragraphs: [
      "The report is available while you are signed in. The PDF is not attached, because reports can contain personal data.",
      "Open Account → Reports to download the issued PDF and JSON.",
    ],
    ctaLabel: "Open reports",
    ctaUrl: url,
  });
}

export async function sendTransferInstructions(input: {
  email: string;
  amountLabel: string;
  credits: number;
  reference: string;
  bank: BankDetails;
  payUrl: string;
}) {
  await sendTransactional({
    to: input.email,
    subject: `Bank transfer for Oyokometa credits (${input.reference})`,
    kicker: "Credits",
    heading: "Transfer these exact details",
    preheader: `Send ${input.amountLabel} with narration ${input.reference}.`,
    paragraphs: [
      `Send ${input.amountLabel} for ${input.credits} credits. Put the reference in the narration or payment description so the deposit can be matched.`,
      "Keep this email until the transfer is matched.",
    ],
    details: [
      { label: "Reference", value: input.reference },
      { label: "Amount", value: input.amountLabel },
      { label: "Credits", value: String(input.credits) },
      { label: "Bank", value: input.bank.bank_name },
      { label: "Account name", value: input.bank.account_name },
      { label: "Account number", value: input.bank.account_number },
    ],
    ctaLabel: "Open payment",
    ctaUrl: input.payUrl,
  });
}

export async function sendCreditsReceipt(input: {
  email: string;
  credits: number;
  reference: string;
  balance: number;
}) {
  const origin = publicAppOrigin();
  await sendTransactional({
    to: input.email,
    subject: "Credits added to your Oyokometa account",
    kicker: "Credits",
    heading: "Credits are on your account",
    preheader: `${input.credits} credits added. Balance ${input.balance}.`,
    paragraphs: ["These credits can be spent on Deep Analysis, reports, and registration."],
    details: [
      { label: "Reference", value: input.reference },
      { label: "Added", value: `${input.credits} credits` },
      { label: "Balance", value: `${input.balance} credits` },
    ],
    ctaLabel: "View account",
    ctaUrl: `${origin}/account`,
  });
}

export async function sendAdminNotice(subject: string, paragraphs: string[]) {
  const to = process.env.ADMIN_EMAIL?.trim();
  if (!to) return;
  try {
    await sendTransactional({
      to,
      subject,
      kicker: "Operations",
      heading: subject,
      paragraphs,
    });
  } catch (err) {
    console.error(JSON.stringify({ msg: "admin_email_failed", message: (err as Error).message }));
  }
}
