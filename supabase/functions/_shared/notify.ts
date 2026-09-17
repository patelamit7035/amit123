/**
 * Outbound notifications for a new lead: email through whichever free provider
 * is configured, and a webhook post into the FunnelOS automation.
 *
 * Provider is chosen by which secret is present:
 *   RESEND_API_KEY  → Resend      (free tier: 3,000 emails/month)
 *   BREVO_API_KEY   → Brevo       (free tier: 300 emails/day)
 * With neither set the lead is still stored and the email is logged as queued.
 */

export interface LeadEmailContext {
  brandName: string;
  fromEmail: string;
  adminEmail: string;
  whatsappNumber: string;
  lead: { name: string; email: string; phone: string; source: string };
  product: { name: string };
  affiliate: { fullName: string; referralCode: string };
}

export type EmailResult = { ok: boolean; error: string };

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string,
  );

export function welcomeEmail(ctx: LeadEmailContext): { subject: string; html: string } {
  const name = escapeHtml(ctx.lead.name.split(" ")[0] || "there");
  const product = escapeHtml(ctx.product.name);
  const brand = escapeHtml(ctx.brandName);
  const whatsapp = ctx.whatsappNumber
    ? `<p style="margin:16px 0">Prefer WhatsApp? <a href="https://wa.me/${ctx.whatsappNumber.replace(/\D/g, "")}">Message us here</a>.</p>`
    : "";
  return {
    subject: `${brand}: your ${product} details are on the way`,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
  <h2 style="color:#111827">Thanks, ${name}!</h2>
  <p>We have your details for <strong>${product}</strong>. Someone from the ${brand} team will reach out shortly on the number you shared.</p>
  ${whatsapp}
  <p style="color:#6b7280;font-size:13px;margin-top:24px">You are getting this because you filled in the ${brand} form.</p>
</div>`,
  };
}

export function adminEmail(ctx: LeadEmailContext): { subject: string; html: string } {
  const rows = [
    ["Name", ctx.lead.name],
    ["Email", ctx.lead.email],
    ["Phone", ctx.lead.phone],
    ["Product", ctx.product.name],
    ["Affiliate", `${ctx.affiliate.fullName} (${ctx.affiliate.referralCode})`],
    ["Source", ctx.lead.source],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280">${escapeHtml(label)}</td><td style="padding:6px 0"><strong>${escapeHtml(value)}</strong></td></tr>`,
    )
    .join("");
  return {
    subject: `New affiliate lead: ${ctx.lead.name} - ${ctx.product.name}`,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
  <h2 style="color:#111827">New lead from an affiliate link</h2>
  <table style="border-collapse:collapse;font-size:14px">${rows}</table>
</div>`,
  };
}

export async function sendEmail(
  to: string,
  from: string,
  subject: string,
  html: string,
): Promise<EmailResult> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const brevoKey = Deno.env.get("BREVO_API_KEY");
  const sender = from || "onboarding@resend.dev";

  try {
    if (resendKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: sender, to: [to], subject, html }),
      });
      if (response.ok) return { ok: true, error: "" };
      return { ok: false, error: `Resend ${response.status}: ${(await response.text()).slice(0, 200)}` };
    }

    if (brevoKey) {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoKey, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { email: sender },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (response.ok) return { ok: true, error: "" };
      return { ok: false, error: `Brevo ${response.status}: ${(await response.text()).slice(0, 200)}` };
    }
  } catch (error) {
    return { ok: false, error: String(error).slice(0, 200) };
  }

  return { ok: false, error: "no_email_provider_configured" };
}

/** Hands the lead to the FunnelOS automation (WhatsApp / email sequences). */
export async function forwardToFunnelos(webhookUrl: string, payload: unknown): Promise<boolean> {
  if (!webhookUrl) return false;
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}
