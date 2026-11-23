const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODELS = [
  process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-vl-32b",
  "moonshotai/kimi-k2-instruct-0905"
];
const TEXT_MODEL = "openai/gpt-oss-120b";
const CATS = ["Beef","Chicken","Roti","Doubles","Pizza","Seafood","Sides","Drinks","Breakfast","Dessert","Korean","Noodles","Rice","Asian","Other"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (s, o) => ({ statusCode: s, headers: CORS, body: JSON.stringify(o) });
const SHARED_RULES = `
Rules:
- KEEP THE FULL ITEM NAME EXACTLY as on the menu. Do NOT shorten it.
  GOOD: "BEEF RAMYUN", "DOUBLE BEEF BURGER", "BEEF BURGER"
  BAD: "Beef", "Burger" alone.
- NEVER list the same item twice. If menu shows it in 2 columns, list it ONCE.
- One entry per menu item that has a price. price is a plain number (no $).
- category must be one of: ${CATS.join(", ")}.
- If name contains RAMYUN / RAMEN / KIMCHI / BIBIMBAP / BULGOGI / DONKATSU / MANDU -> category "Korean".
- Menus are often 2 columns. Read left column top-to-bottom, then right column. Do NOT mix prices.
- Do NOT invent items or prices. If price unreadable, skip item.
- Fix OCR: "S85" -> 85, "Dubles" -> "Doubles".
- If you cannot read anything return {"items":[]}.
`;
const PROMPT_TEXT = `You clean up OCR text from a restaurant menu in Trinidad & Tobago (prices are TT$).\nReturn ONLY JSON: {"items":[{"name":"Beef Burger","price":85,"category":"Beef"}]}\n${SHARED_RULES}`;
const PROMPT_VISION = `You read a photo of a restaurant menu from Trinidad & Tobago (prices are TT$).\nReturn ONLY JSON: {"items":[{"name":"Beef Burger","price":85,"category":"Beef"}]}\n${SHARED_RULES}`;
function normalizeName(n){ return n.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim(); }
function cleanItems(j){
  if(!j || !Array.isArray(j.items)) return [];
  const seen = new Map();
  for(const i of j.items){
    if(!i || typeof i.name !== "string") continue;
    let name = i.name.trim().replace(/^\d{1,3}[.)]\s*/, "").replace(/\s{2,}/g," ").slice(0,80);
    if(name.length < 2) continue;
    const price = Number(i.price);
    if(!(price > 0 && price <= 5000)) continue;
    name = name.replace(/\b\w/g, c => c.toUpperCase());
    let cat = CATS.includes(i.category) ? i.category : "Other";
    if(/ramyun|ramen|kimchi|bibimbap|bulgogi|donkatsu|mandu/i.test(name)) cat = "Korean";
    const key = normalizeName(name);
    if(!seen.has(key)) seen.set(key, { name, price: Math.round(price*100)/100, category: cat, cat });
  }
  return [...seen.values()];
}
async function callGroq(key, payload, signal){
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify(payload), signal
  });
  const j = await res.json().catch(() => ({}));
  if(!res.ok){
    const msg = j?.error?.message || "Groq error";
    const err = new Error(msg); err.status = res.status;
    err.isModelError = /model|decommission|not found|deprecated|not exist/i.test(msg);
    throw err;
  }
  let content = j?.choices?.[0]?.message?.content || "";
  content = content.replace(/```json|```/g,"").trim();
  const s = content.indexOf("{"), e = content.lastIndexOf("}");
  if(s >= 0 && e > s) content = content.slice(s, e+1);
  try { return JSON.parse(content); } catch { return { items: [] }; }
}
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return reply(405, { error: "POST only" });
  const key = process.env.GROQ_API_KEY;
  if (!key) return reply(500, { error: "GROQ_API_KEY not set" });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return reply(400, { error: "Bad JSON" }); }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    if (body.text && !body.image) {
      const text = String(body.text).slice(0, 12000);
      if (!text.trim()) return reply(200, { items: [] });
      const j = await callGroq(key, { model: TEXT_MODEL, temperature: 0, max_tokens: 8000, response_format: { type: "json_object" }, messages: [{ role: "user", content: PROMPT_TEXT + "\n\nOCR TEXT:\n" + text }] }, ctrl.signal);
      clearTimeout(timer);
      return reply(200, { items: cleanItems(j), model: TEXT_MODEL });
    }
    let image = String(body.image || "");
    if (!image) return reply(400, { error: "No image or text" });
    if (!image.startsWith("data:")) image = "data:image/jpeg;base64," + image;
    if (image.length > 5_000_000) return reply(413, { error: "Image too big" });
    let lastErr = null;
    for (const model of VISION_MODELS) {
      try {
        const j = await callGroq(key, { model, temperature: 0, max_tokens: 8000, response_format: { type: "json_object" }, messages: [{ role: "user", content: [{ type: "text", text: PROMPT_VISION }, { type: "image_url", image_url: { url: image } }] }] }, ctrl.signal);
        clearTimeout(timer);
        return reply(200, { items: cleanItems(j), model });
      } catch (e) { lastErr = e; if (!e.isModelError) break; continue; }
    }
    clearTimeout(timer);
    return reply(500, { error: lastErr?.message || "Vision failed" });
  } catch (e) {
    clearTimeout(timer);
    return reply(504, { error: e.name === "AbortError" ? "Groq timed out" : String(e.message || e) });
  }
};
