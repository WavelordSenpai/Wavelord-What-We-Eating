const STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const STT_MODELS = [
  process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo",
  "whisper-large-v3"
];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (s, o) => ({ statusCode: s, headers: CORS, body: JSON.stringify(o) });
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return reply(405, { error: "POST only" });
  const key = process.env.GROQ_API_KEY;
  if (!key) return reply(500, { error: "GROQ_API_KEY not set" });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return reply(400, { error: "Bad JSON" }); }
  if (!body.audio) return reply(400, { error: "No audio" });
  const clean = String(body.audio).replace(/^data:[^,[STRIPPED] "").replace(/\s/g, "");
  const buf = Buffer.from(clean, "base64");
  if (buf.length === 0) return reply(400, { error: "Empty audio" });
  if (buf.length > 10_000_000) return reply(413, { error: "Clip too long — keep it under ~20 seconds" });
  const mime = String(body.mime || "audio/webm").split(";")[0] || "audio/webm";
  const ext = mime.includes("mp4") || mime.includes("m4a") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : mime.includes("mp3") ? "mp3" : "webm";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    let lastErr = "";
    for (const model of STT_MODELS) {
      const form = new FormData();
      form.append("file", new File([buf], "clip." + ext, { type: mime }));
      form.append("model", model);
      form.append("language", "en");
      form.append("response_format", "json");
      form.append("prompt", "Restaurant name, area in Trinidad (San Juan, St James, Chaguanas, Westmoorings), menu item and price in dollars.");
      const res = await fetch(STT_URL, { method: "POST", headers: { Authorization: "Bearer " + key }, body: form, signal: ctrl.signal });
      const text = await res.text().catch(() => "");
      if (res.ok) {
        try { const d = JSON.parse(text); return reply(200, { text: String(d.text || "").trim(), model }); }
        catch { return reply(200, { text: "", model }); }
      }
      lastErr = text.slice(0, 300);
      if (!/model|decommission|not found|deprecated/i.test(lastErr)) return reply(502, { error: "GROQ error " + res.status, detail: lastErr });
    }
    return reply(502, { error: "All Whisper models failed", detail: lastErr });
  } catch (e) {
    return reply(504, { error: e.name === "AbortError" ? "GROQ timed out" : String(e.message || e) });
  } finally { clearTimeout(timer); }
};
