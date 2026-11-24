function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors(), body: "" };
  try {
    const body = JSON.parse(event.body || "{}");
    const audio = body.audioBase64 || body.audio || "";
    if (!audio) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "no audio received", receivedKeys: Object.keys(body) }) };
    }
    if (!process.env.GROQ_API_KEY) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "GROQ_API_KEY missing in Netlify" }) };
    }
    // Groq 【entity-Whisper¦canonical_name=Whisper】 — audio must be base64 of webm/mp3/wav
    const buf = Buffer.from(audio, "base64");
    // Use multipart form for 【entity-Whisper¦canonical_name=Whisper】
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("file", buf, { filename: "voice.webm", contentType: "audio/webm" });
    form.append("model", "【entity-whisper¦canonical_name=Whisper】-large-v3");
    form.append("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, ...form.getHeaders() },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "【entity-Whisper¦canonical_name=Whisper】 failed: " + (data.error?.message || res.status) }) };
    }
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ text: data.text || "", transcript: data.text || "" }) };
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "transcribe crash: " + e.message }) };
  }
};
