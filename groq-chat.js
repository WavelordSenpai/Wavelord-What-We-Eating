/**
 * netlify/functions/groq-chat.js — Wave Buddy brain (GROQ + GPT-OSS)
 * Browser NEVER talks to GROQ directly. It calls:
 *   POST /.netlify/functions/groq-chat
 *   body: { messages:[{role,content}], context, fast:false }
 *   OR legacy: { message:"...", spots:[...] }
 * Returns: { text:"...", model:"openai/gpt-oss-120b" }
 * Key lives ONLY in Netlify env var GROQ_API_KEY
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Llama models discontinued — now using OpenAI OSS models on Groq
const MODEL_CHAT = "openai/gpt-oss-120b";
const MODEL_FAST = "openai/gpt-oss-20b";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (statusCode, obj) => ({ statusCode, headers: CORS, body: JSON.stringify(obj) });

const SYSTEM_PROMPT = `You are "Wave Buddy", the friendly hamburger helper inside the app "What We Eating?" (by Wavelord) for Trinidad & Tobago.
STRICT RULES:
1. ONLY recommend restaurants ("spots") that appear in the DATA block below. NEVER invent a restaurant, menu item, price, phone number or opening hours.
2. Prices are TT$ and must be copied exactly from DATA. If a price or hours is missing, say you don't have it.
3. If DATA has "facts" computed by the app, trust them and rephrase them — do not recalculate differently.
4. If nothing in DATA matches, say so honestly and suggest the user add it (scan a menu photo).
5. Talk light Trini style ("Wah yuh feeling for?", "lime", "cheap eats") but stay easy for visitors to understand.
6. Keep replies SHORT: max 4 short lines + a short list if needed. Mention spot names exactly as written in DATA.`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return reply(405, { error: "POST only" });

  const key = process.env.GROQ_API_KEY;
  if (!key) return reply(500, { error: "GROQ_API_KEY is not set in Netlify environment variables" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return reply(400, { error: "Bad JSON" }); }

  // --- Support BOTH new + legacy app payloads ---
  let messages = [];
  if (Array.isArray(body.messages) && body.messages.length) {
    messages = body.messages.slice(-8).map(m => ({
      role: m && m.role === "assistant" ? "assistant" : "user",
      content: String((m && m.content) || "").slice(0, 600),
    })).filter(m => m.content.trim());
  } else if (body.message) {
    // legacy: app.js sends { message, spots }
    messages = [{ role: "user", content: String(body.message).slice(0, 600) }];
  }
  if (!messages.length) return reply(400, { error: "No messages" });

  // context can be string, object, or spots array
  let context = body.context || "";
  if (body.spots && !context) {
    context = "SPOTS:\n" + body.spots.map(s =>
      `- ${s.name} in ${s.area} | ⭐ ${s.rating} | ${"$".repeat(s.price||1)} | Hours: ${s.hours||"n/a"} | Menu: ${(s.menu||[]).map(i=>`${i.name} $${i.price}`).join(", ")}`
    ).join("\n");
  }
  if (typeof context !== "string") context = JSON.stringify(context);
  context = context.slice(0, 14000);

  const model = body.fast ? MODEL_FAST : MODEL_CHAT;

  const groqMessages = [
    { role: "system", content: SYSTEM_PROMPT + "\n\nDATA:\n" + (context || "(no spots sent)") },
    ...messages
  ];

  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      // Groq returns 400 if model is gone — surface it clearly
      return reply(r.status, { error: j?.error?.message || "Groq error", model });
    }

    const text = j?.choices?.[0]?.message?.content?.trim() || "";
    if (!text) return reply(500, { error: "Empty reply from Groq", model });

    return reply(200, { text, reply: text, model });
  } catch (e) {
    return reply(500, { error: String(e.message || e), model });
  }
};
