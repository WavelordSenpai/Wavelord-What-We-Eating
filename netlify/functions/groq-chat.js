const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Content-Type": "application/json",
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors(), body: "" };
  try {
    const body = JSON.parse(event.body || "{}");
    const message = body.message || "";
    const messages = body.messages || [];
    const context = body.context || "";
    const mode = body.mode || "general";

    if (!process.env.GROQ_API_KEY) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "GROQ_API_KEY missing in Netlify — set it in Site settings > Environment variables" }) };
    }
    if (!message && !messages.length) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "No message received" }) };
    }

    const foodPrompt = `You are Wave Buddy, a Trinidad food helper. ONLY recommend spots from the DATA block below. Copy prices EXACTLY as given. If a spot or price is not in DATA, say you don't have it. Max 4 lines. Be warm, Trini slang ok, short.\n\nDATA:\n${context}`;
    const generalPrompt = `You are Wave Buddy, a friendly general AI assistant. Answer ANY question — food or not. Be warm, helpful, concise, Trini slang ok. If the user asks about food, use the DATA block if relevant.\n\nDATA:\n${context}`;

    const sys = mode === "food" ? foodPrompt : generalPrompt;
    const chat = [{ role: "system", content: sys }];
    if (messages.length) chat.push(...messages.slice(-12));
    else chat.push({ role: "user", content: message });

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: chat, temperature: 0.7, max_tokens: 500 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "Groq failed: " + (data.error?.message || res.status), receivedKeys: Object.keys(body) }) };
    }
    const reply = data.choices?.[0]?.message?.content || "";
    if (!reply) return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "Groq returned empty reply" }) };
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ reply }) };
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "groq-chat crash: " + e.message }) };
  }
};
