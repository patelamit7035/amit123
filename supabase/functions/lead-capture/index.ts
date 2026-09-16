/**
 * Public lead capture endpoint.
 *
 * POST { code, name, email, phone, source, company? }
 *
 * Stores the lead (attributed to the affiliate who owns the link), emails the
 * lead and the admin, forwards the lead to the FunnelOS automation webhook, and
 * writes an entry into email_log for every send.
 *
 * Deploy:  supabase functions deploy lead-capture --no-verify-jwt
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminEmail, forwardToFunnelos, sendEmail, welcomeEmail } from "../_shared/notify.ts";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

interface Payload {
  code?: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  /** Honeypot: real people never see this field, bots fill it in. */
  company?: string;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  if ((body.company || "").trim() !== "") {
    // Silently accept so the bot does not learn anything, but store nothing.
    return json({ lead: null, emailSent: false, forwardedToFunnelos: false, warning: "ignored" });
  }

  const code = (body.code || "").trim().toUpperCase();
  const name = (body.name || "").trim().slice(0, 80);
  const email = (body.email || "").trim().toLowerCase().slice(0, 120);
  const phone = (body.phone || "").trim().slice(0, 20);
  const source = (body.source || "referral-page").trim().slice(0, 200);

  if (!code) return json({ error: "This form is not linked to an affiliate yet" }, 400);
  if (!name || !email || !phone) return json({ error: "Name, email and phone are all required" }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address" }, 400);
  if (phone.replace(/\D/g, "").length < 7) return json({ error: "Enter a valid phone number" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Server is not configured" }, 500);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: leadRow, error } = await db.rpc("submit_lead", {
    p_code: code,
    p_name: name,
    p_email: email,
    p_phone: phone,
    p_source: source,
  });

  if (error) {
    const message = error.message || "Could not submit the form";
    const status = /no longer active/i.test(message) ? 404 : 400;
    return json({ error: message }, status);
  }

  const lead = Array.isArray(leadRow) ? leadRow[0] : leadRow;
  if (!lead) return json({ error: "Could not submit the form" }, 400);

  // Everything below is best effort: the lead is already safely stored.
  const [{ data: settings }, { data: product }, { data: affiliate }] = await Promise.all([
    db.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("products").select("name").eq("id", lead.product_id).maybeSingle(),
    db.from("profiles").select("full_name, referral_code, email").eq("id", lead.affiliate_id).maybeSingle(),
  ]);

  const ctx = {
    brandName: settings?.brand_name || "FunnelOS",
    fromEmail: settings?.notify_from_email || "",
    adminEmail: settings?.notify_admin_email || "",
    whatsappNumber: settings?.whatsapp_number || "",
    lead: { name, email, phone, source },
    product: { name: product?.name || "our offer" },
    affiliate: {
      fullName: affiliate?.full_name || "an affiliate",
      referralCode: affiliate?.referral_code || code,
    },
  };

  const logs: { lead_id: string; to_email: string; template: string; status: string; error: string }[] = [];

  const welcome = welcomeEmail(ctx);
  const welcomeResult = await sendEmail(email, ctx.fromEmail, welcome.subject, welcome.html);
  logs.push({
    lead_id: lead.id,
    to_email: email,
    template: "lead-welcome",
    status: welcomeResult.ok ? "sent" : welcomeResult.error === "no_email_provider_configured" ? "queued" : "failed",
    error: welcomeResult.error,
  });

  if (ctx.adminEmail) {
    const notification = adminEmail(ctx);
    const adminResult = await sendEmail(ctx.adminEmail, ctx.fromEmail, notification.subject, notification.html);
    logs.push({
      lead_id: lead.id,
      to_email: ctx.adminEmail,
      template: "lead-notification",
      status: adminResult.ok ? "sent" : adminResult.error === "no_email_provider_configured" ? "queued" : "failed",
      error: adminResult.error,
    });
  }

  const forwarded = await forwardToFunnelos(settings?.funnelos_webhook_url || "", {
    event: "affiliate.lead.created",
    lead: { id: lead.id, name, email, phone, source, createdAt: lead.created_at },
    product: { id: lead.product_id, name: ctx.product.name },
    affiliate: { id: lead.affiliate_id, name: ctx.affiliate.fullName, code: ctx.affiliate.referralCode },
  });

  if (logs.length > 0) await db.from("email_log").insert(logs);

  return json({
    lead,
    emailSent: welcomeResult.ok,
    forwardedToFunnelos: forwarded,
    warning: welcomeResult.ok ? undefined : welcomeResult.error,
  });
});
