// Transactional email via Resend's REST API (free tier: 3,000/month).
// Without RESEND_API_KEY every email is logged instead, so local dev and
// first deployments work without any email setup.

interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(mail: Mail, log: (msg: string) => void = console.log): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "N.I.P.P.E.R.S. <bookings@nippers.org.uk>";
  if (!key) {
    log(`[email:dry-run] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) log(`[email] Resend failed ${res.status}: ${await res.text()}`);
}

const brand = {
  blue: "#2B7FD6",
  ink: "#1B2A41",
};

export function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f8fb;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink}">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e9f0">
    <div style="background:${brand.blue};color:#fff;padding:20px 24px;font-size:20px;font-weight:700">N.I.P.P.E.R.S.</div>
    <div style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">${title}</h1>${bodyHtml}</div>
    <div style="padding:16px 24px;font-size:12px;color:#6b7a90;border-top:1px solid #e5e9f0">
      Newhaven Inclusive Play Project Educational and Recreational Services · Registered charity 1087572<br>
      East Side Social Centre, Norton Terrace, Newhaven BN9 0BT · 07564 452837
    </div>
  </div></body></html>`;
}

export function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="background:${brand.blue};color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;display:inline-block">${label}</a></p>`;
}
