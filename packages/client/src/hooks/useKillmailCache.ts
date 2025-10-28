import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

// Reuse a tolerant schema similar to useKillmails
const KillmailSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    killmail_id: z.union([z.string(), z.number()]).optional(),
    time: z.string().optional(),
    timestamp: z.string().optional(),
    createdAt: z.string().optional(),
    system: z
      .object({ name: z.string().optional(), id: z.union([z.string(), z.number()]).optional() })
      .passthrough()
      .optional(),
    solarSystem: z
      .object({ name: z.string().optional(), id: z.union([z.string(), z.number()]).optional() })
      .passthrough()
      .optional(),
    victim: z.any().optional(),
    attackers: z.array(z.any()).optional(),
  })
  .passthrough();

const KillmailsV2Schema = z
  .object({
    data: z.array(KillmailSchema),
    metadata: z
      .object({ limit: z.number().optional(), offset: z.number().optional(), total: z.number().optional() })
      .partial()
      .passthrough()
      .optional(),
  })
  .passthrough();

export type Killmail = z.infer<typeof KillmailSchema> & Record<string, unknown>;

const STORAGE_KEY = "killmailsCacheV1";
const STORAGE_META_KEY = "killmailsCacheMetaV1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getWhen(km: any): string {
  return km?.time || km?.timestamp || km?.createdAt || "";
}

function loadCache(): { items: Killmail[]; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const metaRaw = localStorage.getItem(STORAGE_META_KEY);
    if (!raw || !metaRaw) return null;
    const items = JSON.parse(raw) as Killmail[];
    const meta = JSON.parse(metaRaw) as { savedAt: number } | null;
    if (!items || !meta?.savedAt) return null;
    return { items, savedAt: meta.savedAt };
  } catch {
    return null;
  }
}

function saveCache(items: Killmail[]) {
  try {
    const persistLimit =
      Number(((import.meta as any)?.env?.VITE_KILLMAIL_PERSIST_LIMIT as string | undefined) ?? "") || 5000;
    const toPersist = items.slice(0, Math.max(0, persistLimit));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    localStorage.setItem(
      STORAGE_META_KEY,
      JSON.stringify({ savedAt: Date.now(), persistedCount: toPersist.length, totalInMemory: items.length })
    );
  } catch {}
}

async function fetchRecentKillmails(
  baseUrl: string,
  desiredCount: number | null = 1000,
  pageSize = 100
): Promise<Killmail[]> {
  const results: Killmail[] = [];
  let total: number | null = null;

  // Try to get total via metadata
  try {
    const metaUrl = new URL("/v2/killmails", baseUrl);
    metaUrl.searchParams.set("limit", "1");
    metaUrl.searchParams.set("offset", "0");
    const mr = await fetch(metaUrl.toString());
    if (mr.ok) {
      const mj = await mr.json();
      const m = KillmailsV2Schema.safeParse(mj);
      if (m.success) total = m.data.metadata?.total ?? null;
    }
  } catch {}

  const targetTotal = desiredCount == null ? (total ?? Infinity) : desiredCount;
  const maxPages = desiredCount == null ? Infinity : Math.ceil(desiredCount / pageSize);
  const plannedPages = Math.ceil(((typeof total === "number" ? total : targetTotal) as number) / pageSize);
  const toFetch = Math.min(plannedPages, maxPages);

  for (let i = 0; i < toFetch; i++) {
    let url: URL;
    if (typeof total === "number") {
      // newest-first via computed offset near the end
      const desiredOffset = Math.max(0, total - (i + 1) * pageSize);
      url = new URL("/v2/killmails", baseUrl);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(desiredOffset));
    } else {
      // fallback: simple paging, assume API returns newest first; we'll sort after
      url = new URL("/v2/killmails", baseUrl);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(i * pageSize));
    }
    try {
      const r = await fetch(url.toString());
      if (!r.ok) break;
      const j = await r.json();
      let arr: Killmail[] = [];
      const v2 = KillmailsV2Schema.safeParse(j);
      if (v2.success) arr = v2.data.data as Killmail[];
      else if (Array.isArray(j)) arr = j as Killmail[];
      else if (Array.isArray((j as any)?.data)) arr = (j as any).data as Killmail[];

      if (arr.length === 0) break;
      results.push(...arr);
      if (typeof total === "number") {
        const cap = desiredCount == null ? total : Math.min(total, desiredCount);
        if (results.length >= cap) break;
      } else {
        if (arr.length < pageSize) break;
        if (desiredCount != null && results.length >= desiredCount) break;
      }
    } catch {
      break;
    }
  }

  // Dedup and sort newest-first
  const byKey: Record<string, Killmail> = {};
  for (const km of results) {
    const key = String((km as any)?.id ?? (km as any)?.killmail_id ?? `${getWhen(km)}:${Math.random()}`);
    byKey[key] = km;
  }
  const list = Object.values(byKey);
  list.sort((a, b) => new Date(getWhen(b)).getTime() - new Date(getWhen(a)).getTime());
  return desiredCount == null ? list : list.slice(0, desiredCount);
}

export function useKillmailCache() {
  const baseUrl =
    ((import.meta as any)?.env?.VITE_WORLD_API_HTTP as string | undefined) ??
    "https://world-api-stillness.live.tech.evefrontier.com";

  const [killmails, setKillmails] = useState<Killmail[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!baseUrl) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchAllRaw = ((import.meta as any)?.env?.VITE_KILLMAIL_CACHE_FETCH_ALL as string | undefined) ?? "true";
      const fetchAll = String(fetchAllRaw).toLowerCase() === "true";
      const desired = fetchAll
        ? null
        : Number(((import.meta as any)?.env?.VITE_KILLMAIL_CACHE_COUNT as string | undefined) ?? "") || 1000;
      const pageSize = Number(((import.meta as any)?.env?.VITE_KILLMAIL_CACHE_PAGE_SIZE as string | undefined) ?? "") || 100;
      const list = await fetchRecentKillmails(baseUrl, desired, pageSize);
      setKillmails(list);
      setLastUpdated(Date.now());
      saveCache(list);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  // Bootstrap from cache or fetch
  useEffect(() => {
    const cached = loadCache();
    const now = Date.now();
    if (cached) {
      setKillmails(cached.items);
      setLastUpdated(cached.savedAt);
      if (now - cached.savedAt > CACHE_TTL_MS) {
        void refresh();
      }
    } else {
      void refresh();
    }

    // Schedule refresh every 5 minutes
    const id = window.setInterval(() => {
      void refresh();
    }, CACHE_TTL_MS);
    timerRef.current = id as unknown as number;
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
    };
  }, [refresh]);

  const getBySystem = useCallback(
    (systemId: string | number | null | undefined): Killmail[] => {
      if (systemId == null) return [];
      const sid = String(systemId);
      const list = killmails.filter((km: any) => {
        const sysId = km?.solarSystemId ?? km?.solarSystem?.id ?? km?.system?.id;
        return sysId != null && String(sysId) === sid;
      });
      // already sorted when stored, but ensure order
      return [...list].sort(
        (a, b) => new Date(getWhen(b)).getTime() - new Date(getWhen(a)).getTime()
      );
    },
    [killmails]
  );

  return { killmails, lastUpdated, isLoading, error, refresh, getBySystem } as const;
}
