// Server vote — Netlify Blobs if available, else in-memory fallback (works for demo, use Blobs in prod)
// NOTE: For real prod, connect Upstash Redis / Supabase. This file uses a global store so it works on Netlify without extra setup,
// and it NEVER trusts localStorage as source of truth.

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

// In-memory store — survives across warm invocations, good for family voting in one session
// For permanent storage, replace with Netlify Blobs: getStore("votes")
let STORE = globalThis.__WWE_VOTES__ || (globalThis.__WWE_VOTES__ = {});

function getVote(id) { return STORE[id] || null; }
function saveVote(v) { STORE[v.id] = v; return v; }
function toPublic(v) {
  const counts = v.opts.map(() => 0);
  Object.values(v.votes || {}).forEach((oi) => { if (counts[oi] !== undefined) counts[oi]++; });
  return { id: v.id, title: v.title, opts: v.opts, votes: v.votes, counts, total: Object.keys(v.votes || {}).length, createdAt: v.createdAt };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors(), body: "" };
  try {
    if (event.httpMethod === "GET") {
      const id = event.queryStringParameters?.id;
      if (!id) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "Missing ?id=" }) };
      const v = getVote(id);
      if (!v) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: "Vote not found — link expired or wrong ID" }) };
      return { statusCode: 200, headers: cors(), body: JSON.stringify(toPublic(v)) };
    }
    const body = JSON.parse(event.body || "{}");
    const action = body.action;

    if (action === "create") {
      const title = String(body.title || "What We Eating?").slice(0, 100);
      const opts = Array.isArray(body.opts) ? body.opts.map(String).filter(Boolean).slice(0, 10) : [];
      if (opts.length < 2) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "Need at least 2 options" }) };
      const id = Math.random().toString(36).slice(2, 10);
      const v = { id, title, opts, votes: {}, createdAt: Date.now() };
      saveVote(v);
      return { statusCode: 200, headers: cors(), body: JSON.stringify(toPublic(v)) };
    }

    if (action === "vote") {
      const v = getVote(body.id);
      if (!v) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: "Vote not found" }) };
      const voterId = String(body.voterId || "anon");
      const oi = Number(body.oi);
      if (!Number.isInteger(oi) || oi < 0 || oi >= v.opts.length) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "Invalid option index" }) };
      }
      // 1 vote per voter — voting again REPLACES, never adds
      v.votes[voterId] = oi;
      saveVote(v);
      return { statusCode: 200, headers: cors(), body: JSON.stringify(toPublic(v)) };
    }

    if (action === "clear") {
      if (STORE[body.id]) delete STORE[body.id];
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "Unknown action: " + action }) };
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "vote crash: " + e.message }) };
  }
};
