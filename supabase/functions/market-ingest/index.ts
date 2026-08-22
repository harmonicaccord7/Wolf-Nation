import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store" };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: jsonHeaders });
  }

  const startedAt = new Date().toISOString();
  const url = Deno.env.get("SUPABASE_URL")!;
  const secretBundle = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);
  const admin = createClient(url, secretBundle.default, { auth: { persistSession: false } });

  const { data: provider, error: providerError } = await admin.from("data_providers").upsert({
    slug: "coingecko", name: "CoinGecko", provider_type: "market_data",
    base_url: "https://api.coingecko.com", enabled: true
  }, { onConflict: "slug" }).select("id").single();

  if (providerError) return new Response(JSON.stringify({ error: providerError.message }), { status: 500, headers: jsonHeaders });

  const { data: run, error: runError } = await admin.from("ingestion_runs").insert({
    provider_id: provider.id, job_type: "crypto_spot", status: "running", started_at: startedAt
  }).select("id").single();

  if (runError) return new Response(JSON.stringify({ error: runError.message }), { status: 500, headers: jsonHeaders });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true", {
      headers: { accept: "application/json", "user-agent": "KaporalIntelligence/0.3" }, signal: controller.signal
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`CoinGecko HTTP ${response.status}`);

    const payload = await response.json();
    const capturedAt = new Date().toISOString();
    const rows = [
      { symbol: "BTC", asset_type: "crypto", price: payload.bitcoin?.usd ?? null, change_24h: payload.bitcoin?.usd_24h_change ?? null, volume: payload.bitcoin?.usd_24h_vol ?? null, captured_at: capturedAt, provider: "CoinGecko", raw_payload: payload.bitcoin ?? {} },
      { symbol: "ETH", asset_type: "crypto", price: payload.ethereum?.usd ?? null, change_24h: payload.ethereum?.usd_24h_change ?? null, volume: payload.ethereum?.usd_24h_vol ?? null, captured_at: capturedAt, provider: "CoinGecko", raw_payload: payload.ethereum ?? {} }
    ];

    const { error: insertError } = await admin.from("market_snapshots").insert(rows);
    if (insertError) throw new Error(insertError.message);

    const completedAt = new Date().toISOString();
    await admin.from("ingestion_runs").update({ status: "success", rows_written: rows.length, completed_at: completedAt }).eq("id", run.id);
    await admin.from("data_providers").update({ last_success_at: completedAt }).eq("id", provider.id);

    return new Response(JSON.stringify({ ok: true, rows: rows.length, capturedAt, symbols: rows.map((row) => row.symbol) }), { headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion failure";
    const completedAt = new Date().toISOString();
    await admin.from("ingestion_runs").update({ status: "failed", message, completed_at: completedAt }).eq("id", run.id);
    await admin.from("data_providers").update({ last_error_at: completedAt }).eq("id", provider.id);
    return new Response(JSON.stringify({ ok: false, error: message }), { status: 502, headers: jsonHeaders });
  }
});
