import { useEffect, useMemo, useState } from "react";

export type SmartAssembly = {
  id: string | number;
  name?: string;
  displayName?: string;
  typeDetails?: { name?: string; [k: string]: unknown };
  assemblyType?: string;
  smartAssemblyType?: string;
  type?: { name?: string; [k: string]: unknown } | string;
  solarSystem?: { name?: string; [k: string]: unknown };
  location?: {
    solarSystem?: { name?: string };
    solarSystemName?: string;
    solarSystemId?: string | number;
  };
  solarSystemName?: string;
  solarSystemId?: string | number;
  metadata?: { name?: string; type?: string; [k: string]: unknown };
  owner?: { id?: string | number; [k: string]: unknown } | string | number | null;
  networkNodeId?: string | number;
  networkId?: string | number;
  nodeId?: string | number;
  linkedAssemblies?: Array<{ id?: string | number } | string | number>;
  [k: string]: unknown;
};

export type UseSmartAssembliesParams = {
  ownerId?: string | number | null;
  ownerAddress?: string | null;
  ids?: Array<string | number> | null;
};

export type UseSmartAssembliesResult = {
  assemblies: SmartAssembly[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

function normalizeId(v: unknown): string | null {
  if (v == null) return null;
  try {
    const s = String(v);
    return s;
  } catch {
    return null;
  }
}

export function useSmartAssemblies(params?: UseSmartAssembliesParams): UseSmartAssembliesResult {
  const [assemblies, setAssemblies] = useState<SmartAssembly[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const baseUrl = import.meta.env.VITE_WORLD_API_HTTP || import.meta.env.VITE_GATEWAY_HTTP;
  const ownerId = params?.ownerId != null ? normalizeId(params.ownerId) : null;
  const ownerAddress = params?.ownerAddress && params.ownerAddress.startsWith("0x") ? params.ownerAddress.toLowerCase() : null;
  const explicitIds = Array.isArray(params?.ids) ? params!.ids!.map((x) => normalizeId(x)!).filter(Boolean) : null;

  const refresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!baseUrl) {
      setAssemblies([]);
      setError("Missing VITE_WORLD_API_HTTP");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setIsLoading(true);
      setError(null);

      // If caller provided explicit IDs, fetch them directly with batching to avoid rate limits
      const tryFetchExplicitIds = async (): Promise<SmartAssembly[] | null> => {
        if (!explicitIds || explicitIds.length === 0) return null;
        const base = `${baseUrl.replace(/\/$/, "")}/v2/smartassemblies`;

        const fetchOne = async (id: string): Promise<SmartAssembly | null> => {
          try {
            const r = await fetch(`${base}/${id}`, { signal: controller.signal });
            if (!r.ok) {
              console.warn(`[useSmartAssemblies] Failed to fetch assembly ${id}: ${r.status}`);
              return null;
            }
            const obj = await r.json();
            const s = (obj?.data ?? obj) as SmartAssembly;
            // Return any assembly with an ID - be lenient with validation
            // The component can handle assemblies with minimal data
            if (s?.id != null) {
              return s;
            }
            console.warn(`[useSmartAssemblies] No ID in response for assembly ${id}`, s);
            return null;
          } catch (e) {
            if (!controller.signal.aborted) {
              console.warn(`[useSmartAssemblies] Error fetching assembly ${id}:`, e);
            }
            return null;
          }
        };

        // Fetch in batches to avoid overwhelming the API
        const batchSize = 5;
        const allResults: SmartAssembly[] = [];

        for (let i = 0; i < explicitIds.length; i += batchSize) {
          const batch = explicitIds.slice(i, i + batchSize);
          const results = await Promise.all(batch.map(fetchOne));
          const validBatch = results.filter(Boolean) as SmartAssembly[];
          allResults.push(...validBatch);

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < explicitIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        if (import.meta.env.DEV) {
          console.log(`[useSmartAssemblies] Fetched ${allResults.length}/${explicitIds.length} assemblies via explicit IDs`);
        }

        // Return partial results - better to show some assemblies than none
        if (allResults.length > 0) {
          if (allResults.length < explicitIds.length) {
            console.warn(`[useSmartAssemblies] Only got ${allResults.length}/${explicitIds.length} assemblies, showing partial results`);
          }
          return allResults;
        }
        // If we got no assemblies, try the filtered approach
        console.warn(`[useSmartAssemblies] Got no assemblies from explicit IDs, trying filtered approach`);
        return null;
      };

      // Try filtered queries with ownerId or ownerAddress (with pagination)
      const tryFetchWithFilters = async (): Promise<SmartAssembly[] | null> => {
        const base = `${baseUrl.replace(/\/$/, "")}/v2/smartassemblies`;
        const queries: string[] = [];
        if (ownerId) {
          queries.push(
            `owner=${encodeURIComponent(ownerId)}`,
            `ownerId=${encodeURIComponent(ownerId)}`,
            `smartCharacterId=${encodeURIComponent(ownerId)}`,
            `characterId=${encodeURIComponent(ownerId)}`
          );
        }
        if (ownerAddress) {
          queries.push(
            `owner=${encodeURIComponent(ownerAddress)}`,
            `ownerAddress=${encodeURIComponent(ownerAddress)}`,
            `wallet=${encodeURIComponent(ownerAddress)}`,
            `ownerWallet=${encodeURIComponent(ownerAddress)}`,
            `address=${encodeURIComponent(ownerAddress)}`
          );
        }
        if (queries.length === 0) return null;

        // Try each query parameter, with pagination support
        for (const q of queries) {
          try {
            const allResults: SmartAssembly[] = [];
            let offset = 0;
            const limit = 100; // Fetch 100 at a time
            let hasMore = true;

            // Paginate through all results
            while (hasMore && allResults.length < 1000) { // Safety limit of 1000 assemblies
              const url = `${base}?${q}&limit=${limit}&offset=${offset}`;
              if (import.meta.env.DEV) console.debug("[useSmartAssemblies] fetching", url);
              const res = await fetch(url, { signal: controller.signal });

              if (!res.ok) {
                if (![400, 404].includes(res.status)) {
                  const text = await res.text().catch(() => "");
                  if (import.meta.env.DEV) console.warn("[useSmartAssemblies] non-404 error", res.status, text);
                }
                break; // Try next query param
              }

              const data = (await res.json()) as SmartAssembly[] | { data?: SmartAssembly[]; items?: SmartAssembly[]; metadata?: { total?: number } };
              const list = Array.isArray(data)
                ? data
                : Array.isArray((data as any)?.data)
                  ? (data as any).data
                  : Array.isArray((data as any)?.items)
                    ? (data as any).items
                    : [];

              if (list.length === 0) {
                hasMore = false;
              } else {
                allResults.push(...list);
                offset += list.length;

                // Check if we've fetched everything based on metadata.total
                const total = (data as any)?.metadata?.total;
                if (typeof total === 'number' && offset >= total) {
                  hasMore = false;
                }

                // If we got fewer results than limit, we're probably done
                if (list.length < limit) {
                  hasMore = false;
                }
              }
            }

            if (allResults.length > 0) {
              if (import.meta.env.DEV) console.debug(`[useSmartAssemblies] Found ${allResults.length} assemblies using ${q}`);
              return allResults;
            }
          } catch (e) {
            if (controller.signal.aborted) return null;
            if (import.meta.env.DEV) console.warn("[useSmartAssemblies] Error with query", q, e);
          }
        }
        return null;
      };

      try {
        // Priority: explicit IDs => filtered API
        let list = (await tryFetchExplicitIds()) ?? [];
        if (list.length === 0) {
          list = (await tryFetchWithFilters()) ?? [];
        }
        setAssemblies(list);
      } catch (e: any) {
        if (!controller.signal.aborted) {
          setAssemblies([]);
          setError(e?.message ?? "Failed to load smart assemblies");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [baseUrl, ownerId, ownerAddress, refreshTrigger]);

  // Keep a stable sorted list by name then id
  const sorted = useMemo(() => {
    const label = (a: SmartAssembly) =>
      a.name ?? a.displayName ?? a.metadata?.name ?? (a.id != null ? `Assembly #${a.id}` : "Assembly");
    return [...assemblies].sort((a, b) => {
      const la = label(a);
      const lb = label(b);
      if (la === lb) return String(a.id).localeCompare(String(b.id));
      return la.localeCompare(lb);
    });
  }, [assemblies]);

  return { assemblies: sorted, isLoading, error, refresh };
}
