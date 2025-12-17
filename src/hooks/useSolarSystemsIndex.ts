import { useEffect, useMemo, useRef, useState } from "react";

export type SolarSystem = { id: string; name: string };

type Index = {
  list: SolarSystem[];
  idToName: Record<string, string>;
  nameToId: Record<string, string>; // key is lowercased trimmed name
};

const STORAGE_KEY = "solarSystemsIndexV1";
const STORAGE_META_KEY = "solarSystemsIndexMetaV1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

function buildIndex(list: SolarSystem[]): Index {
  const idToName: Record<string, string> = {};
  const nameToId: Record<string, string> = {};
  for (const item of list) {
    const id = String(item.id);
    const name = String(item.name || "");
    if (!name) continue;
    idToName[id] = name;
    nameToId[normalizeName(name)] = id;
  }
  return { list, idToName, nameToId };
}

function loadFromStorage(): Index | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const metaRaw = localStorage.getItem(STORAGE_META_KEY);
    if (!raw || !metaRaw) return null;
    const meta = JSON.parse(metaRaw) as { savedAt: number } | null;
    if (!meta || !meta.savedAt) return null;
    if (Date.now() - meta.savedAt > MAX_AGE_MS) return null;
    const arr = JSON.parse(raw) as SolarSystem[];
    if (!Array.isArray(arr)) return null;
    return buildIndex(arr);
  } catch {
    return null;
  }
}

function persistToStorage(list: SolarSystem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem(
      STORAGE_META_KEY,
      JSON.stringify({ savedAt: Date.now() })
    );
  } catch {}
}

async function fetchAllSystems(baseUrl: string): Promise<SolarSystem[]> {
  // Try v2 endpoint with pagination; stop at 10k items as safety
  const maxItems = 10000;
  // Upstream may reject large pages (>= 200) with 400; keep it conservative
  const pageSize = 100;
  let offset = 0;
  let total: number | null = null;
  const results: SolarSystem[] = [];

  // First, attempt a metadata call to get total
  try {
    const metaUrl = new URL("/v2/solarsystems", baseUrl);
    metaUrl.searchParams.set("limit", "1");
    metaUrl.searchParams.set("offset", "0");
    const mr = await fetch(metaUrl.toString());
    if (mr.ok) {
      const mj = await mr.json();
      const mt = (mj?.metadata?.total as number | undefined) ?? undefined;
      if (typeof mt === "number") total = mt;
    }
  } catch {}

  while (results.length < maxItems) {
    const url = new URL("/v2/solarsystems", baseUrl);
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));
    const r = await fetch(url.toString());
    if (!r.ok) break;
    const j = await r.json();
    const arr: any[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
    const mapped = arr
      .map((x) => {
        const id = String(x?.id ?? x?.system?.id ?? "");
        const name = String(x?.name ?? x?.system?.name ?? "");
        if (!id || !name) return null;
        return { id, name } as SolarSystem;
      })
      .filter(Boolean) as SolarSystem[];
    if (mapped.length === 0) break;
    results.push(...mapped);
    offset += mapped.length;
    if (typeof total === "number" && offset >= total) break;
  }

  // Deduplicate by id
  const byId: Record<string, SolarSystem> = {};
  for (const s of results) byId[s.id] = s;
  return Object.values(byId);
}

export function useSolarSystemsIndex() {
  const baseUrl =
    (import.meta.env?.VITE_WORLD_API_HTTP as string | undefined) ??
    "https://world-api-stillness.live.tech.evefrontier.com";

  const [index, setIndex] = useState<Index | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const bootstrappedRef = useRef(false);
  const inflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    const cached = loadFromStorage();
    if (cached) {
      setIndex(cached);
      return;
    }
    if (!baseUrl) return;
    setIsLoading(true);
    (async () => {
      try {
        const list = await fetchAllSystems(baseUrl);
        if (list.length > 0) {
          persistToStorage(list);
          setIndex(buildIndex(list));
        } else {
          setIndex(buildIndex([]));
        }
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [baseUrl]);

  // Helpers
  const search = useMemo(() => {
    return (query: string, limit = 10): SolarSystem[] => {
      if (!index || !query) return [];
      const q = normalizeName(query);
      // simple case-insensitive substring search
      const scored = index.list
        .map((s: SolarSystem) => ({
          s,
          pos: normalizeName(s.name).indexOf(q),
        }))
        .filter((x: { s: SolarSystem; pos: number }) => x.pos >= 0)
        .sort(
          (a: { s: SolarSystem; pos: number }, b: { s: SolarSystem; pos: number }) =>
            a.pos - b.pos || a.s.name.localeCompare(b.s.name)
        )
        .slice(0, limit)
        .map((x: { s: SolarSystem; pos: number }) => x.s);
      return scored;
    };
  }, [index]);

  const getNameById = useMemo(() => {
    return (id: string | number | null | undefined): string | undefined => {
      if (!index || id == null) return undefined;
      return index.idToName[String(id)];
    };
  }, [index]);

  const getIdByName = useMemo(() => {
    return (name: string | null | undefined): string | undefined => {
      if (!index || !name) return undefined;
      return index.nameToId[normalizeName(name)];
    };
  }, [index]);

  // On-demand ensure one system name by id; caches to storage and state
  const ensureNames = useMemo(() => {
    return async (ids: Array<string | number>): Promise<void> => {
      const unique = Array.from(new Set(ids.map((x) => String(x)).filter(Boolean)));
      if (unique.length === 0 || !baseUrl) return;
      const missing = unique.filter((id) => !index?.idToName[id] && !inflightRef.current.has(id));
      if (missing.length === 0) return;

      // Mark inflight
      missing.forEach((id) => inflightRef.current.add(id));

      try {
        // Fetch with gentle concurrency; keep it simple with Promise.all on small batches
        const fetchOne = async (id: string): Promise<SolarSystem | null> => {
          try {
            const u = new URL(`/v2/solarsystems/${id}`, baseUrl);
            const r = await fetch(u.toString());
            if (!r.ok) return null;
            const j = await r.json();
            const sys = j?.data ?? j;
            const name: string | undefined = sys?.name ?? sys?.solarSystem?.name;
            if (!name) return null;
            return { id, name };
          } catch {
            return null;
          }
        };

        // Chunk to avoid too many concurrent requests
        const chunkSize = 5;
        const updates: SolarSystem[] = [];
        for (let i = 0; i < missing.length; i += chunkSize) {
          const chunk = missing.slice(i, i + chunkSize);
          const res = await Promise.all(chunk.map((id) => fetchOne(id)));
          for (const s of res) if (s) updates.push(s);
        }

        if (updates.length > 0) {
          // Merge into index
          setIndex((prev: Index | null) => {
            const base = prev ?? buildIndex([]);
            const mergedList = [...base.list];
            const idToName = { ...base.idToName };
            const nameToId = { ...base.nameToId };
            for (const s of updates) {
              if (!idToName[s.id]) mergedList.push(s);
              idToName[s.id] = s.name;
              nameToId[normalizeName(s.name)] = s.id;
            }
            const next: Index = { list: mergedList, idToName, nameToId };
            // Persist
            persistToStorage(next.list);
            return next;
          });
        }
      } finally {
        // Clear inflight marks
        missing.forEach((id) => inflightRef.current.delete(id));
      }
    };
  }, [baseUrl, index]);

  return {
    isLoading,
    error,
    hasIndex: !!index && index.list.length > 0,
    count: index?.list.length ?? 0,
    search,
    getNameById,
    getIdByName,
    ensureNames,
  } as const;
}
