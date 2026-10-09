export async function sendMagicLink(email: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Oyokometa <noreply@localhost>";
  if (!key) {
    console.log(JSON.stringify({ msg: "magic_link_dev", email, url }));
    return { sent: false, url };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Sign in to Oyokometa",
      text: `Open this link to sign in. It expires in 15 minutes.\n\n${url}`,
    }),
  });
  if (!res.ok) {
    console.error("resend_failed", await res.text());
    return { sent: false, url };
  }
  return { sent: true, url };
}

export async function sendDisputeLink(email: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Oyokometa <noreply@localhost>";
  if (!key) {
    console.log(JSON.stringify({ msg: "dispute_link_dev", email, url }));
    return { sent: false, url };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Confirm your Oyokometa dispute",
      text: `Confirm this complaint about a public registration. It does not prove authorship or ownership.\n\n${url}`,
    }),
  });
  if (!res.ok) {
    console.error("resend_failed", await res.text());
    return { sent: false, url };
  }
  return { sent: true, url };
}

export async function sendReportLink(email: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Oyokometa <noreply@localhost>";
  if (!key) {
    console.log(JSON.stringify({ msg: "report_link_dev", email, url }));
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your Oyokometa report is ready",
      text: `Your report is available (not attached):\n${url}`,
    }),
  });
}
