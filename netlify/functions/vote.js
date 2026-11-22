/**
 * netlify/functions/vote.js — Live shared voting for What We Eating?
 * Matches app.js:
 *   POST /.netlify/functions/vote { action:"create", title, opts } -> { id, title, opts, counts, total, votes }
 *   POST /.netlify/functions/vote { action:"vote", id, voterId, oi } -> { id, title, opts, counts, total, votes }
 *   POST /.netlify/functions/vote { action:"clear", id } -> { ok:true }
 *   GET  /.netlify/functions/vote?id=XXXX -> { id, title, opts, counts, total, votes }
 *
 * Storage: Netlify Blobs if enabled (permanent), else in-memory fallback (works for testing,
 * resets if Netlify function sleeps). Enable Blobs: Netlify -> Site settings -> Blobs -> Enable.
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (code, obj) => ({ statusCode: code, headers: CORS, body: JSON.stringify(obj) });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// In-memory fallback — survives while function is warm
globalThis.__WWE_VOTES__ = globalThis.__WWE_VOTES__ || new Map();

async function getStore() {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore("【entity-wwe¦canonical_name=WWE】-votes");
  } catch (e) {
    return null;
  }
}

async function loadVote(id) {
  if (!id) return null;
  const store = await getStore();
  if (store) {
    try {
      const v = await store.get(id, { type: "json" });
      if (v) return v;
    } catch (e) {}
  }
  return globalThis.__WWE_VOTES__.get(id) || null;
}

async function saveVote(v) {
  globalThis.__WWE_VOTES__.set(v.id, v);
  const store = await getStore();
  if (store) {
    try { await store.setJSON(v.id, v); } catch (e) {}
  }
  return v;
}

async function deleteVote(id) {
  globalThis.__WWE_VOTES__.delete(id);
  const store = await getStore();
  if (store) {
    try { await store.delete(id); } catch (e) {}
  }
}

function countsFor(v) {
  const counts = (v.opts || []).map(() => 0);
  Object.values(v.votes || {}).forEach((oi) => {
    if (counts[oi] !== undefined) counts[oi]++;
  });
  return counts;
}

function publicVote(v) {
  return {
    id: v.id,
    title: v.title,
    opts: v.opts,
    counts: countsFor(v),
    total: Object.keys(v.votes || {}).length,
    votes: v.votes || {},
    createdAt: v.createdAt || null,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  // GET ?id=xxx — app.js polls this every 3s for live counts
  if (event.httpMethod === "GET") {
    const id = (event.queryStringParameters || {}).id;
    if (!id) return reply(400, { error: "Missing id" });
    const v = await loadVote(id);
    if (!v) return reply(404, { error: "Vote not found" });
    return reply(200, publicVote(v));
  }

  if (event.httpMethod !== "POST") return reply(405, { error: "POST or GET only" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return reply(400, { error: "Bad JSON" });
  }

  // CREATE — app.js: { action:"create", title, opts }
  if (body.action === "create") {
    const title = String(body.title || "What We Eating?").slice(0, 100);
    const opts = [...new Set((body.opts || []).map((s) => String(s).trim()).filter(Boolean))].slice(0, 10);
    if (opts.length < 2) return reply(400, { error: "Need at least 2 options" });
    const v = { id: uid(), title, opts, votes: {}, createdAt: new Date().toISOString() };
    await saveVote(v);
    return reply(200, publicVote(v));
  }

  // VOTE — app.js: { action:"vote", id, voterId, oi }
  // 1 per voterId, can change vote (updates same voterId)
  if (body.action === "vote") {
    const id = body.id;
    const voterId = String(body.voterId || "anon").slice(0, 100);
    const oi = Number(body.oi);
    if (!id) return reply(400, { error: "Missing id" });
    const v = await loadVote(id);
    if (!v) return reply(404, { error: "Vote not found" });
    if (!(oi >= 0 && oi < v.opts.length)) return reply(400, { error: "Bad option" });
    v.votes = v.votes || {};
    v.votes[voterId] = oi;
    await saveVote(v);
    return reply(200, publicVote(v));
  }

  // CLEAR — app.js: { action:"clear", id }
  if (body.action === "clear") {
    const id = body.id;
    if (id) await deleteVote(id);
    return reply(200, { ok: true });
  }

  return reply(400, { error: "Unknown action" });
};
