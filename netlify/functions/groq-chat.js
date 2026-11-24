exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  const key = process.env.GROQ_API_KEY;
  if (!key) return { statusCode: 500, headers, body: JSON.stringify({ error: "GROQ_API_KEY missing in Netlify" }) };
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch(e) {}
  const messages = body.messages || [];
  const spots = body.spots || body.context || "";
  const spotsText = typeof spots === "string" ? spots : JSON.stringify(spots).slice(0, 8000);
  const system = `You are Wave Buddy for "What We Eating?" - Trinidad & Tobago food finder.\nYou have these real spots with real TT$ prices:\n${spotsText}\nRules:\n- Use ONLY these prices. Never invent a price.\n- If a price is not in the list, say "price not listed yet" - NEVER say $999.\n- If user asks general chat, answer normally, don't force food.\n- Short answers, friendly, Trini vibe.`;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "system", content: system }, ...messages, ...(messages.length ? [] : [{ role: "user", content: body.message || "Hi" }])],
        temperature: 0.7,
        max_tokens: 600
      })
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data?.error?.message || "Groq error" }) };
    return { statusCode: 200, headers, body: JSON.stringify({ reply: data.choices?.[0]?.message?.content || "No reply" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
