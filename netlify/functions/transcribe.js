/**
 * netlify/functions/transcribe.js — Voice Add fallback (GROQ Whisper)
 * POST /.netlify/functions/transcribe
 *   body: { audio:"<base64 audio>", mime:"audio/webm" }
 * returns: { text:"Beef King Grill San Juan Beef Burger 85" }
 * Env: GROQ_API_KEY (required), GROQ_STT_MODEL (optional)
 */

const STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
// Turbo first, plain v3 as fallback — if Groq retires one, the other saves you
const STT_MODELS = [
  process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo",
  "whisper-large-v3",
  "distil-whisper-large-v3-en"
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (statusCode, obj) => ({ statusCode, headers: CORS, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return reply(405, { error: "POST only" });

  const key = process.env.GROQ_API_KEY;
  if (!key) return reply(500, { error: "GROQ_API_KEY is not set in Netlify environment variables" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return reply(400, { error: "Bad JSON" }); }
  if (!body.audio) return reply(400, { error: "No audio" });

  const buf = Buffer.from(String(body.audio).replace(/^data:[^,]+,/, ""), "base64");
  if (buf.length === 0) return reply(400, { error: "Empty audio" });
  if (buf.length > 4_000_000) return reply(413, { error: "Clip too long — keep it under ~10 seconds" });

  const mime = String(body.mime || "audio/webm").split(";")[0];
  const ext = mime.includes("mp4") || mime.includes("m4a") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);

  try {
    let lastErr = null;
    for (const model of STT_MODELS) {
      const form = new FormData();
      form.append("file", new Blob([buf], { type: mime }), "clip." + ext);
      form.append("model", model);
      form.append("language", "en");
      form.append("response_format", "json");
      form.append("prompt", "Restaurant name, area in Trinidad (San Juan, St James, Chaguanas, Westmoorings), menu item and price in dollars.");

      const res = await fetch(STT_URL, { method: "POST", headers: { Authorization: "Bearer " + key }, body: form, signal: ctrl.signal });
      const text = await res.text().catch(() => "");

      if (res.ok) {
        try {
          const data = JSON.parse(text);
          return reply(200, { text: String(data.text || "").trim(), model });
        } catch(e) { return reply(200, { text: "", model }); }
      }

      lastErr = text.slice(0, 300);
      // Only try next model if it's a model error — not a quota / auth error
      if (!/model|decommission|not found|deprecated/i.test(lastErr)) {
        return reply(502, { error: "GROQ error " + res.status, detail: lastErr });
      }
      // else: try next model in list
    }
    return reply(502, { error: "All Whisper models failed", detail: lastErr });
  } catch (e) {
    return reply(504, { error: e.name === "AbortError" ? "GROQ timed out" : String(e.message || e) });
  } finally {
    clearTimeout(timer);
  }
};
