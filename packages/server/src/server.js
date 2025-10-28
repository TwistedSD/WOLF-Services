import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8787);
const REFRESH_MS = Number(process.env.REFRESH_MS || 5 * 60 * 1000);
const MAX_LIMIT = 100; // safe API page size (avoid 400s)

// Prefer explicit server-side env var, else reuse client-style env names if present
const WORLD_API_HTTP = (process.env.WORLD_API_HTTP || process.env.VITE_WORLD_API_HTTP || 'https://world-api-stillness.live.tech.evefrontier.com').replace(/\/+$/, '');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'killmails.json');
const META_FILE = path.join(DATA_DIR, 'killmails.meta.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(file, obj) {
  try {
    fs.writeFileSync(file, JSON.stringify(obj));
  } catch (e) {
    console.error('Failed to write', file, e?.message);
  }
}

function dedupeSort(items) {
  const map = new Map();
  for (const k of items || []) {
    if (!k || typeof k.id !== 'number') continue;
    map.set(k.id, k);
  }
  return Array.from(map.values()).sort((a, b) => String(b.time).localeCompare(String(a.time)));
}

async function fetchPage(offset, limit) {
  const size = Math.min(Math.max(1, limit || MAX_LIMIT), MAX_LIMIT);
  const url = `${WORLD_API_HTTP}/v2/killmails?limit=${size}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`upstream ${res.status}${detail ? ': ' + detail.slice(0, 200) : ''}`);
  }
  const json = await res.json();
  const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const list = raw.map((k) => ({
    id: Number(k?.id ?? k?.killmail_id ?? 0),
    time: String(k?.time ?? k?.timestamp ?? k?.createdAt ?? ''),
    solarSystemId: Number(k?.solarSystemId ?? k?.solarSystem?.id ?? k?.system?.id ?? 0),
    killer: {
      address: String(k?.killer?.address ?? ''),
      id: String(k?.killer?.id ?? ''),
      name: String(k?.killer?.name ?? k?.killerName ?? ''),
    },
    victim: {
      address: String(k?.victim?.address ?? ''),
      id: String(k?.victim?.id ?? ''),
      name: String(k?.victim?.name ?? k?.victimName ?? ''),
    },
  }));
  const metadata = json?.metadata ?? {};
  return { data: list, metadata };
}

async function refreshData() {
  try {
    console.log('[killmails] refresh start');
    const first = await fetchPage(0, MAX_LIMIT);
    const total = Number(first.metadata?.total ?? first.data.length);
    const metaLimit = Number((first.metadata?.limit ?? first.data.length) || MAX_LIMIT);
    const pageSize = Math.min(Math.max(1, metaLimit || MAX_LIMIT), MAX_LIMIT);

    let all = first.data;
    for (let offset = first.data.length; offset < total; offset += pageSize) {
      const page = await fetchPage(offset, pageSize);
      if (!page.data.length) break;
      all = all.concat(page.data);
    }

    const merged = dedupeSort(all);
    ensureDataDir();
    writeJson(DATA_FILE, merged);
    writeJson(META_FILE, { ts: Date.now(), total: merged.length });
    console.log('[killmails] refresh ok:', merged.length);
    return { ok: true, total: merged.length };
  } catch (e) {
    console.error('[killmails] refresh failed:', e?.message);
    return { ok: false, error: e?.message || 'refresh failed' };
  }
}

// In-memory cache for serving quickly
let cache = /** @type {any[]} */ ([]);
let cacheMeta = /** @type {{ ts: number|null, total: number }} */ ({ ts: null, total: 0 });

function loadCacheFromDisk() {
  cache = readJson(DATA_FILE, []);
  const meta = readJson(META_FILE, { ts: null, total: Array.isArray(cache) ? cache.length : 0 });
  cacheMeta = { ts: meta.ts || null, total: meta.total || (Array.isArray(cache) ? cache.length : 0) };
}

function startScheduler() {
  // Initial background refresh, then periodic
  refreshData().then(() => loadCacheFromDisk());
  setInterval(async () => {
    const r = await refreshData();
    if (r.ok) loadCacheFromDisk();
  }, REFRESH_MS).unref();
}

function paginate(list, offset, limit) {
  const total = list.length;
  const start = Math.max(0, Math.min(offset || 0, total));
  const size = Math.min(Math.max(1, limit || 50), 500);
  const data = list.slice(start, start + size);
  return { data, metadata: { total, limit: size, offset: start } };
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, lastUpdated: cacheMeta.ts, total: cacheMeta.total });
});

app.get('/api/killmails', (req, res) => {
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  const { data, metadata } = paginate(cache, offset, limit);
  res.json({ data, metadata });
});

// Boot
ensureDataDir();
loadCacheFromDisk();
startScheduler();

app.listen(PORT, () => {
  console.log(`Killmail server listening on http://localhost:${PORT}`);
});
