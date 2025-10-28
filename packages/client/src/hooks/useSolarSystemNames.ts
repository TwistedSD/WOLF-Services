import { useEffect, useMemo, useRef, useState } from "react";

type NamesMap = Record<string, string>; // key: id as string, value: name

// Module-level in-memory cache (survives across hook calls while app lives)
const memoryCache: NamesMap = {};
let loadedFromStorage = false;
const STORAGE_KEY = "solarSystemNamesCacheV1";

function loadFromStorage() {
  if (loadedFromStorage) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") {
        Object.assign(memoryCache, obj);
      }
    }
  } catch {}
  loadedFromStorage = true;
}

function persistToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
  } catch {}
}

function coerceNameFromJson(json: any): string | undefined {
  if (!json) return undefined;
  // Prefer common shapes
  return (
    json?.name ??
    json?.data?.name ??
    json?.solarSystem?.name ??
    json?.data?.solarSystem?.name
  );
}

export function useSolarSystemNames(ids: Array<string | number>) {
  const baseUrl =
    ((import.meta as any)?.env?.VITE_WORLD_API_HTTP as string | undefined) ??
    "https://world-api-stillness.live.tech.evefrontier.com";

  const wanted = useMemo(
    () =>
      Array.from(new Set(ids.map((x) => String(x)).filter((x) => !!x))),
    [ids]
  );

  const [names, setNames] = useState<NamesMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadFromStorage();
    const initial: NamesMap = {};
    for (const id of wanted) {
      if (memoryCache[id] != null) initial[id] = memoryCache[id];
    }
    setNames(initial);
  }, [wanted.join(",")]);

  useEffect(() => {
    const missing = wanted.filter((id: string) => names[id] == null);
    if (!baseUrl || missing.length === 0) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsLoading(true);

    (async () => {
      try {
        const results: NamesMap = {};
        await Promise.all(
          missing.map(async (id: string) => {
            try {
              const url = new URL(`/v2/solarsystems/${id}`, baseUrl).toString();
              const r = await fetch(url, { signal: ctrl.signal });
              if (!r.ok) return; // skip silently
              const json = await r.json();
              const name = coerceNameFromJson(json);
              if (name && typeof name === "string") {
                results[id] = name;
                memoryCache[id] = name;
              }
            } catch (e) {
              // ignore individual fetch errors
            }
          })
        );
        if (Object.keys(results).length > 0) {
          setNames((prev: NamesMap) => ({ ...prev, ...results }));
          persistToStorage();
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [baseUrl, wanted.join(","), names]);

  return { names, isLoading } as const;
}
