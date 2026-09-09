import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const H = { "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0" };
const encoder = new TextEncoder();
const DEFAULT_SITE = "https://www.kaporalintelligence.com";
const DEFAULT_FROM = "KAPORAL Market Letter <intelligence@kaporalintelligence.com>";

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: H }); }
function validEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254; }
function randomToken() { const b = new Uint8Array(32); crypto.getRandomValues(b); return Array.from(b, x => x.toString(16).padStart(2, "0")).join(""); }
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value)); return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join(""); }

async function sendConfirmation(email: string, token: string, unsubscribeToken: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = (Deno.env.get("NEWSLETTER_FROM_EMAIL") || DEFAULT_FROM).trim();
  const site = (Deno.env.get("SITE_URL") || DEFAULT_SITE).replace(/\/$/, "");
  if (!apiKey) return { sent: false, reason: "resend_api_key_missing" };
  const confirm = `${site}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const unsubscribe = `${site}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Confirm your KAPORAL Market Letter subscription",
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#101820"><p style="font-size:12px;letter-spacing:.12em;font-weight:700;color:#9b7938">KAPORAL INTELLIGENCE</p><h1 style="font-size:28px;margin:12px 0">Confirm your Market Letter subscription</h1><p>Confirm that you want to receive the KAPORAL Market Letter.</p><p style="margin:26px 0"><a href="${confirm}" style="background:#d9b76a;color:#101820;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Confirm subscription</a></p><p>If you did not request this, no action is required.</p><p style="font-size:12px;color:#666;margin-top:28px">You can unsubscribe at any time: <a href="${unsubscribe}">unsubscribe</a>.</p></div>`
    })
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    console.error("newsletter_resend", response.status, detail);
    return { sent: false, reason: `resend_http_${response.status}` };
  }
  return { sent: true, reason: "sent" };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const secretMap = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secret = secretMap.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) return json({ error: "Service credential unavailable" }, 500);
  const db = createClient(url, secret, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  try {
    if (action === "subscribe") {
      const email = String(body?.email ?? "").trim().toLowerCase();
      const source = String(body?.source ?? "website").slice(0, 80);
      if (!validEmail(email)) return json({ ok: false, error: "invalid_email" }, 400);
      const { data: existing } = await db.from("newsletter_subscribers").select("status,last_confirmation_sent_at").eq("email", email).maybeSingle();
      if (existing?.status === "confirmed") return json({ ok: true, status: "already_confirmed" });
      if (existing?.last_confirmation_sent_at && Date.now() - Date.parse(existing.last_confirmation_sent_at) < 10 * 60e3) return json({ ok: true, status: "pending", delivery: "recently_sent" });
      const confirmToken = randomToken(), unsubscribeToken = randomToken();
      const confirmHash = await sha256(confirmToken), unsubscribeHash = await sha256(unsubscribeToken);
      const expires = new Date(Date.now() + 48 * 3600e3).toISOString();
      const { error } = await db.from("newsletter_subscribers").upsert({ email, status: "pending", source, consent_at: new Date().toISOString(), confirm_token_hash: confirmHash, confirm_expires_at: expires, unsubscribe_token_hash: unsubscribeHash, unsubscribed_at: null }, { onConflict: "email" });
      if (error) throw error;
      const delivery = await sendConfirmation(email, confirmToken, unsubscribeToken);
      if (delivery.sent) await db.from("newsletter_subscribers").update({ last_confirmation_sent_at: new Date().toISOString() }).eq("email", email);
      return json({ ok: true, status: "pending", delivery: delivery.reason });
    }
    if (action === "confirm") {
      const token = String(body?.token ?? ""); if (token.length < 40) return json({ ok: false, status: "invalid" }, 400);
      const hash = await sha256(token), now = new Date().toISOString();
      const { data, error } = await db.from("newsletter_subscribers").update({ status: "confirmed", confirmed_at: now, confirm_token_hash: null, confirm_expires_at: null }).eq("confirm_token_hash", hash).eq("status", "pending").gt("confirm_expires_at", now).select("id").maybeSingle();
      if (error) throw error;
      return json({ ok: Boolean(data), status: data ? "confirmed" : "invalid_or_expired" }, data ? 200 : 400);
    }
    if (action === "unsubscribe") {
      const token = String(body?.token ?? ""); if (token.length < 40) return json({ ok: false, status: "invalid" }, 400);
      const hash = await sha256(token);
      const { data, error } = await db.from("newsletter_subscribers").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).eq("unsubscribe_token_hash", hash).neq("status", "unsubscribed").select("id").maybeSingle();
      if (error) throw error;
      return json({ ok: true, status: data ? "unsubscribed" : "already_or_invalid" });
    }
    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    console.error("newsletter", error);
    return json({ ok: false, error: "newsletter_operation_failed" }, 500);
  }
});
