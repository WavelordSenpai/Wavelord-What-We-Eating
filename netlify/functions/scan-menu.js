/**
 * netlify/functions/scan-menu.js — "AI READ" for messy / handwritten menus (GROQ)
 * POST /.netlify/functions/scan-menu
 *   body: { image: "data:image/jpeg;base64,..." }
 *   OR:   { text: "Beef Burger $85\nDoubles $12" }
 * returns: { items:[ {name, price, category} ] }
 * Env: GROQ_API_KEY (required), GROQ_VISION_MODEL (optional)
 */

const VISION_MODELS = [
  process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.2-11b-vision-preview"
];
const TEXT_MODEL = "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// FIX 1: Added Korean + Noodles + Rice + Asian — so RAMYUN is not forced to Beef
const CATS = ["Beef","Chicken","Roti","Doubles","Pizza","Seafood","Sides","Drinks","Breakfast","Dessert","Korean","Noodles","Rice","Asian","Other"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (statusCode, obj) => ({ statusCode, headers: CORS, body: JSON.stringify(obj) });

// FIX 2: Prompt now says KEEP FULL NAME — never shorten BEEF RAMYUN to Beef
const SHARED_RULES = `
Rules:
- KEEP THE FULL ITEM NAME EXACTLY as on the menu. Do NOT shorten it.
  GOOD: "BEEF RAMYUN", "CHICKEN RAMYUN", "ORIGINAL RAMYUN", "KIMCHI RAMYUN", "BEEF DONKATSU"
  BAD: "Beef", "Chicken", "Ramyun" alone.
- If menu is numbered like "27. ORIGINAL RAMYUN $51", keep name as "ORIGINAL RAMYUN", price 51. Drop the number.
- One entry per menu item that has a price. price is a plain number (no $ sign).
- category must be one of: ${CATS.join(", ")}.
- If name contains RAMYUN / RAMEN / KIMCHI / BIBIMBAP / BULGOGI / DONKATSU / MANDU -> category "Korean".
- If name contains NOODLES / RAMYUN / RAMEN -> category "Korean" (not "Sides").
- Menus are often 2 columns. Read left column top-to-bottom, then right column. Do NOT mix prices from the next column.
- Do NOT invent items or prices. If a price is unreadable, skip that item.
- Fix OCR errors: "S85" -> 85, "Dubles" -> "Doubles", "Sorre1" -> "Sorrel", "RAMYUN" stays "RAMYUN" not "RAMEN".
- Keep unusual / foreign names as-is. Do not translate Korean names to English.
- If you cannot read anything return {"items":[]}.
`;

const PROMPT_TEXT = `You clean up OCR text from a restaurant menu in Trinidad & Tobago (prices are TT$).
Return ONLY JSON in exactly this shape:
{"items":[{"name":"Beef Burger","price":85,"category":"Beef"}]}
${SHARED_RULES}`;

const PROMPT_VISION = `You read a photo of a restaurant menu from Trinidad & Tobago (prices are TT$).
Return ONLY JSON in exactly this shape:
{"items":[{"name":"Beef Burger","price":85,"category":"Beef"}]}
${SHARED_RULES}`;

function cleanItems(j){
  if(!j || !Array.isArray(j.items)) return [];
  const seen = new Set();
  return j.items
    .filter(i => i && typeof i.name === "string" && i.name.trim().length >= 2 && Number(i.price) > 0 && Number(i.price) <= 5000)
    .map(i => {
      // FIX 3: Don't cut Korean names, normalize casing but keep full words
      let name = i.name.trim().replace(/^\d{1,3}[.)]\s*/, "").replace(/\s{2,}/g, " ").slice(0,80);
      // Title-case but keep RAMYUN / KIMCHI readable
      name = name.replace(/\b\w/g, c => c.toUpperCase());
      let cat = CATS.includes(i.category) ? i.category : "Other";
      // Auto-fix: if Groq forgot, still catch Korean names
      if (/ramyun|ramen|kimchi|bibimbap|bulgogi|donkatsu|mandu/i.test(name)) cat = "Korean";
      return { name, price: Math.round(Number(i.price)*100)/100, category: cat, cat };
    })
    .filter(i => {
      const k = i.name.toLowerCase() + "|" + i.price;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

async function callGroq(key, payload, signal){
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify(payload),
    signal
  });
  const j = await res.json().catch(() => ({}));
  if(!res.ok){
    const msg = j?.error?.message || "Groq error";
    const err = new Error(msg);
    err.status = res.status;
    err.isModelError = /model|decommission|not found|deprecated/i.test(msg);
    throw err;
  }
  let content = j?.choices?.[0]?.message?.content || "";
  content = content.replace(/```json|```/g,"").trim();
  // Handle Groq sometimes returning text + JSON
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) content = content.slice(start, end + 1);
  try { return JSON.parse(content); }
  catch(e){ return { items: [] }; }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return reply(405, { error: "POST only" });

  const key = process.env.GROQ_API_KEY;
  if (!key) return reply(500, { error: "GROQ_API_KEY is not set in Netlify environment variables" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return reply(400, { error: "Bad JSON" }); }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);

  try {
    if (body.text && !body.image) {
      const text = String(body.text).slice(0, 12000);
      if (!text.trim()) return reply(200, { items: [] });
      const j = await callGroq(key, {
        model: TEXT_MODEL,
        temperature: 0,
        // FIX 4: 1500 -> 4000 tokens, so long Korean menus don't get cut off
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: PROMPT_TEXT + "\n\nOCR TEXT:\n" + text }]
      }, ctrl.signal);
      clearTimeout(timer);
      return reply(200, { items: cleanItems(j), model: TEXT_MODEL });
    }

    let image = String(body.image || "");
    if (!image) return reply(400, { error: "No image or text" });
    if (!image.startsWith("data:")) image = "data:image/jpeg;base64," + image;
    if (image.length > 5_000_000) return reply(413, { error: "Image too big — app should compress to 1200px" });

    let lastErr = null;
    for (const model of VISION_MODELS) {
      try {
        const j = await callGroq(key, {
          model,
          temperature: 0,
          max_tokens: 4000,
          response_format: { type: "json_object" },
          messages: [{
            role: "user",
            content: [
              { type: "text", text: PROMPT_VISION },
              { type: "image_url", image_url: { url: image } }
            ]
          }]
        }, ctrl.signal);
        clearTimeout(timer);
        return reply(200, { items: cleanItems(j), model });
      } catch (e) {
        lastErr = e;
        if (!e.isModelError) break;
        continue;
      }
    }
    clearTimeout(timer);
    return reply(500, { error: lastErr?.message || "Vision failed" });

  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") return reply(504, { error: "Groq timed out" });
    return reply(500, { error: String(e.message || e) });
  }
};
