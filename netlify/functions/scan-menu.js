exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  const key = process.env.GROQ_API_KEY;
  if (!key) return { statusCode: 500, headers, body: JSON.stringify({ error: "GROQ_API_KEY missing" }) };
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch(e) {}
  let image = body.image || body.imageBase64 || "";
  if (!image) return { statusCode: 400, headers, body: JSON.stringify({ error: "no image received" }) };
  if (!image.startsWith("data:")) image = "data:image/jpeg;base64," + image;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: [
          { type: "text", text: "Read this menu photo. Return ONLY JSON array like: [{\"name\":\"Doubles\",\"price\":\"25\"}]. Use exact TT$ prices from photo. No extra text." },
          { type: "image_url", image_url: { url: image } }
        ]}],
        temperature: 0,
        max_tokens: 1000
      })
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data?.error?.message || "Groq vision error" }) };
    let txt = data.choices?.[0]?.message?.content || "[]";
    txt = txt.replace(/```json|```/g, "").trim();
    let items = [];
    try { items = JSON.parse(txt); } catch(e) { items = []; }
    return { statusCode: 200, headers, body: JSON.stringify({ items, count: items.length }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
