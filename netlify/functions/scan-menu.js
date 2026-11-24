function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function parseFallback(text) {
  const out = [];
  String(text || "").split("\n").forEach((line) => {
    line = line.trim(); if (!line) return;
    const m = line.match(/(.+?)\s*[-–—:]\s*\$?\s*(\d+(?:\.\d{1,2})?)/);
    if (m) out.push({ n: m[1].trim(), p: Number(m[2]) });
  });
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors(), body: "" };
  try {
    const body = JSON.parse(event.body || "{}");
    const imageBase64 = body.imageBase64 || body.image || "";
    if (!imageBase64) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "no image received", receivedKeys: Object.keys(body), hint: "app.js must send imageBase64" }) };
    }
    if (!process.env.GROQ_API_KEY) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "GROQ_API_KEY missing in Netlify" }) };
    }
    // Groq Vision
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Read this menu photo. Return ONLY valid JSON: {\"items\":[{\"n\":\"Item Name\",\"p\":123}]}. Prices as numbers, no $ sign. If you cannot read it, return {\"items\":[]}." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1200,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "Groq Vision failed: " + (data.error?.message || res.status), imageLength: imageBase64.length }) };
    }
    let raw = data.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsed = { items: [] };
    try { parsed = JSON.parse(raw); } catch (e) {
      const fb = parseFallback(raw);
      if (fb.length) parsed = { items: fb };
    }
    const items = (parsed.items || []).filter((it) => it.n).map((it) => ({ n: String(it.n).trim(), p: Number(it.p) || 0 }));
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ items, count: items.length, imageLength: imageBase64.length }) };
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "scan-menu crash: " + e.message }) };
  }
};
