/**
 * netlify/functions/scan-menu.js — "AI READ" for messy / handwritten menus (GROQ)
 * POST /.netlify/functions/scan-menu
 *   body: { image: "data:image/jpeg;base64,..." }  — from camera
 *   OR:   { text: "Beef Burger $85\nDoubles $12" } — from 【entity-Tesseract¦canonical_name=Tesseract】 OCR in app.js
 * returns: { items:[ {name, price, category} ] }
 * Env: GROQ_API_KEY (required), GROQ_VISION_MODEL (optional)
 */

// Vision model — Llama-4 Scout is discontinued, use Maverick (vision-capable)
const VISION_MODELS = [
  process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct", // fallback if Maverick is down
  "llama-3.2-11b-vision-preview" // last-resort fallback
];
// Text-only cleanup — GPT-OSS (Llama chat is discontinued)
const TEXT_MODEL = "openai/gpt-oss-120b";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const CATS = ["Beef","Chicken","Roti","Doubles","Pizza","Seafood","Sides","Drinks","Breakfast","Dessert","Other"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (statusCode, obj) => ({ statusCode, headers: CORS, body: JSON.stringify(obj) });

const PROMPT_TEXT = `You clean up OCR text from a restaurant menu in Trinidad & Tobago (prices are TT$).
Return ONLY JSON in exactly this shape:
{"items":[{"name":"Beef Burger","price":85,"category":"Beef"}]}
Rules:
- One entry per menu item that has a price. price is a plain number (no $ sign).
- category must be one of: ${CATS.join(", ")}.
- Fix OCR errors: "S85" -> 85, "Dubles" -> "Doubles", "Sorre1" -> "Sorrel".
- Do NOT invent items or prices. If a price is unreadable, skip that item.
- If you cannot read anything return {"items":[]}.`;

const PROMPT_VISION = `You read a photo of a restaurant menu from Trinidad & Tobago (prices are TT$).
Return ONLY JSON in exactly this shape:
{"items":[{"name":"Beef Burger","price":85,"category":"Beef"}]}
Rules:
- One entry per menu item that has a price. price is a plain number (no $ sign).
- category must be one of: ${CATS.join(", ")}.
- Do NOT invent items or prices. If a price is unreadable, skip that item.
- If you cannot read the menu at all return {"items":[]}.`;

function cleanItems(j){
  if(!j || !Array.isArray(j.items)) return [];
  return j.items
    .filter(i => i && typeof i.name === "string" && i.name.trim().length >= 2 && Number(i.price) > 0 && Number(i.price) <= 5000)
    .map(i => ({
      name: i.name.trim().slice(0,60),
      price: Math.round(Number(i.price)*100)/100,
      category: CATS.includes(i.category) ? i.category : "Other",
      cat: CATS.includes(i.category) ? i.category : "Other"
    }));
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
  // GPT-OSS sometimes wraps JSON in ```json fences
  content = content.replace(/```json|```/g,"").trim();
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
  const timer = setTimeout(() => ctrl.abort(), 25000);

  try {
    // --- MODE 1: TEXT from 【entity-Tesseract¦canonical_name=Tesseract】 (what your app.js actually sends) ---
    if (body.text && !body.image) {
      const text = String(body.text).slice(0, 8000);
      if (!text.trim()) return reply(200, { items: [] });
      const j = await callGroq(key, {
        model: TEXT_MODEL,
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: PROMPT_TEXT + "\n\nOCR TEXT:\n" + text }]
      }, ctrl.signal);
      clearTimeout(timer);
      return reply(200, { items: cleanItems(j), model: TEXT_MODEL });
    }

    // --- MODE 2: IMAGE (direct vision) ---
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
          max_tokens: 1500,
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
        if (!e.isModelError) break; // real error, don't try next model
        continue; // model retired — try next one
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
