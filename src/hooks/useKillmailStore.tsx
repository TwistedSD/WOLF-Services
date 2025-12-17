import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Types
export type PlayerRef = {
  address: string;
  id: string;
  name: string;
};

export type Killmail = {
  id: number;
  time: string; // ISO 8601
  solarSystemId: number;
  victim: PlayerRef;
  killer: PlayerRef;
};

export type PagedResponse<T> = {
  data: T[];
  metadata?: { total?: number; limit?: number; offset?: number };
};

// Index types
type BySystem = Map<number, { total: number; ids: number[] }>;
export type PlayerKey = string; // id or address or name fallback
type ByPlayer = Map<
  PlayerKey,
  { name: string; address: string; total: number; ids: number[] }
>;

// Store
type Store = {
  ready: boolean;
  lastUpdated: number | null;
  killmails: Killmail[];
  bySystem: BySystem;
  byPlayer: ByPlayer;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const KillmailCtx = createContext<Store | null>(null);

const LS_KEY = "killmailCacheV2";
const PERSIST_LIMIT = Number(
  import.meta.env?.VITE_KILLMAIL_PERSIST_LIMIT ?? 5000
);
const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

const baseURL =
  (
    import.meta.env?.VITE_WORLD_API_HTTP as string | undefined
  )?.replace(/\/+$/, "") ||
  "https://world-api-stillness.live.tech.evefrontier.com";

// Optional: use a local/server cache for killmails if provided
const serverKillmailsBase = (
  import.meta.env?.VITE_KILLMAILS_BASE as string | undefined
)?.replace(/\/+$/, "");

// Robust page parser
function parsePage(json: any): PagedResponse<Killmail> {
  const raw = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json)
    ? json
    : [];
  const list: Killmail[] = raw.map((k: any) => {
    const id = Number(k?.id ?? k?.killmail_id ?? 0);
    const time = String(k?.time ?? k?.timestamp ?? k?.createdAt ?? "");
    const solarSystemId = Number(
      k?.solarSystemId ?? k?.solarSystem?.id ?? k?.system?.id ?? 0
    );
    const killer = {
      address: String(k?.killer?.address ?? ""),
      id: String(k?.killer?.id ?? ""),
      name: String(k?.killer?.name ?? k?.killerName ?? ""),
    } as PlayerRef;
    const victim = {
      address: String(k?.victim?.address ?? ""),
      id: String(k?.victim?.id ?? ""),
      name: String(k?.victim?.name ?? k?.victimName ?? ""),
    } as PlayerRef;
    return { id, time, solarSystemId, killer, victim };
  });
  const metadata = json?.metadata ?? {};
  return { data: list, metadata };
}

const MAX_LIMIT = 100; // Upstream API may reject >100 with 400; clamp to be safer

async function fetchPage(
  offset: number,
  limit: number
): Promise<PagedResponse<Killmail>> {
  const size = Math.min(Math.max(1, limit || MAX_LIMIT), MAX_LIMIT);
  const url = serverKillmailsBase
    ? `${serverKillmailsBase}/api/killmails?limit=${size}&offset=${offset}`
    : `${baseURL}/v2/killmails?limit=${size}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    const msg = `killmails ${res.status}${
      detail ? ": " + detail.slice(0, 200) : ""
    }`;
    throw new Error(msg);
  }
  const json = await res.json();
  return parsePage(json);
}

function buildIndexes(items: Killmail[]) {
  const bySystem: BySystem = new Map();
  const byPlayer: ByPlayer = new Map();
  for (const km of items) {
    // System index
    const sys = bySystem.get(km.solarSystemId) ?? {
      total: 0,
      ids: [] as number[],
    };
    sys.total += 1;
    sys.ids.push(km.id);
    bySystem.set(km.solarSystemId, sys);

    // Player index (killer only for kill counts)
    const key: PlayerKey = km.killer.id || km.killer.address || km.killer.name;
    const p = byPlayer.get(key) ?? {
      name: km.killer.name,
      address: km.killer.address,
      total: 0,
      ids: [] as number[],
    };
    p.total += 1;
    p.ids.push(km.id);
    byPlayer.set(key, p);
  }
  return { bySystem, byPlayer };
}

function dedupeSort(incoming: Killmail[]): Killmail[] {
  const map = new Map<number, Killmail>();
  for (const k of incoming) if (k && typeof k.id === "number") map.set(k.id, k);
  // newest first by time string (ISO-safe)
  return Array.from(map.values()).sort((a, b) => b.time.localeCompare(a.time));
}

export const KillmailProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ready, setReady] = useState(false);
  const [killmails, setKillmails] = useState<Killmail[]>([]);
  const [bySystem, setBySystem] = useState<BySystem>(new Map());
  const [byPlayer, setByPlayer] = useState<ByPlayer>(new Map());
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const refreshing = useRef(false);

  // Warm start from localStorage (persist only newest N for size)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; items: Killmail[] };
        if (Array.isArray(parsed?.items)) {
          const merged = dedupeSort(parsed.items);
          setKillmails(merged);
          const idx = buildIndexes(merged);
          setBySystem(idx.bySystem);
          setByPlayer(idx.byPlayer);
          setLastUpdated(parsed.ts ?? null);
        }
      }
    } catch {
      // ignore
    } finally {
      setReady(true);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    setError(null);
    try {
      // Fetch first page to get total
      const first = await fetchPage(0, MAX_LIMIT);
      const total = Number(first.metadata?.total ?? first.data.length);
      let all = first.data;

      // Determine page size from metadata or clamp to MAX_LIMIT
      const metaLimit = Number(
        (first.metadata?.limit ?? first.data.length) || MAX_LIMIT
      );
      const pageSize = Math.min(Math.max(1, metaLimit || MAX_LIMIT), MAX_LIMIT);

      // Fetch remaining pages with fixed page size the API accepts
      for (let offset = first.data.length; offset < total; offset += pageSize) {
        const page = await fetchPage(offset, pageSize);
        if (!page.data.length) break;
        all = all.concat(page.data);
      }

      // Merge and sort
      const merged = dedupeSort(all);
      setKillmails(merged);
      const idx = buildIndexes(merged);
      setBySystem(idx.bySystem);
      setByPlayer(idx.byPlayer);
      const ts = Date.now();
      setLastUpdated(ts);

      // Persist newest N
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({ ts, items: merged.slice(0, PERSIST_LIMIT) })
        );
      } catch {
        // ignore quota
      }
    } catch (e: any) {
      // Surface error for UI and logs
      const msg = e?.message
        ? String(e.message)
        : "Failed to refresh killmails";
      setError(msg);
    } finally {
      refreshing.current = false;
      setLoading(false);
    }
  }, []);

  // Auto refresh every 5 minutes (initial + interval)
  useEffect(() => {
    if (!ready) return;
    refresh();
    const t = window.setInterval(() => refresh(), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [ready, refresh]);

  const value = useMemo<Store>(
    () => ({
      ready,
      lastUpdated,
      killmails,
      bySystem,
      byPlayer,
      loading,
      error,
      refresh,
    }),
    [ready, lastUpdated, killmails, bySystem, byPlayer, loading, error, refresh]
  );

  return <KillmailCtx.Provider value={value}>{children}</KillmailCtx.Provider>;
};

export function useKillmailStore() {
  const ctx = useContext(KillmailCtx);
  if (!ctx)
    throw new Error("useKillmailStore must be used within KillmailProvider");
  return ctx;
}
