import { useEffect, useMemo, useRef, useState } from "react";

type Result = { id: string; name: string };

function parseResults(json: any): Result[] {
  if (!json) return [];
  const take = (arr: any[]): Result[] =>
    arr
      .map((x) => {
        const id = x?.id ?? x?.solarSystemId ?? x?.solarSystem?.id;
        const name = x?.name ?? x?.solarSystem?.name;
        if (id == null || !name) return null;
        return { id: String(id), name: String(name) } as Result;
      })
      .filter(Boolean) as Result[];

  // common shapes
  if (Array.isArray(json)) return take(json);
  if (Array.isArray(json?.data)) return take(json.data);
  if (Array.isArray(json?.items)) return take(json.items);
  if (Array.isArray(json?.results)) return take(json.results);
  return [];
}

export function useSolarSystemSearch(query: string, limit = 10) {
  const baseUrl =
    ((import.meta as any)?.env?.VITE_WORLD_API_HTTP as string | undefined) ??
    "https://world-api-stillness.live.tech.evefrontier.com";

  const q = query.trim();
  const shouldSearch = q.length >= 2;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const urls = useMemo(() => {
    if (!shouldSearch || !baseUrl) return [] as string[];
    const arr: string[] = [];
    // try a few common query param names
    const u1 = new URL("/v2/solarsystems", baseUrl);
    u1.searchParams.set("search", q);
    u1.searchParams.set("limit", String(limit));
    arr.push(u1.toString());

    const u2 = new URL("/v2/solarsystems", baseUrl);
    u2.searchParams.set("name", q);
    u2.searchParams.set("limit", String(limit));
    arr.push(u2.toString());

    const u3 = new URL("/v2/solarsystems", baseUrl);
    u3.searchParams.set("query", q);
    u3.searchParams.set("limit", String(limit));
    arr.push(u3.toString());

    return arr;
  }, [baseUrl, q, limit, shouldSearch]);

  useEffect(() => {
    abortRef.current?.abort();
    if (!shouldSearch || urls.length === 0) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    (async () => {
      let found: Result[] = [];
      for (const u of urls) {
        try {
          const r = await fetch(u, { signal: ctrl.signal });
          if (!r.ok) continue;
          const j = await r.json();
          const parsed = parseResults(j);
          if (parsed.length > 0) {
            found = parsed;
            break;
          }
        } catch (e) {
          if ((e as any)?.name === "AbortError") return;
          // continue to next candidate
        }
      }
      setResults(found);
      setIsLoading(false);
    })();
    return () => ctrl.abort();
  }, [urls, shouldSearch]);

  return { results, isLoading, error } as const;
}
