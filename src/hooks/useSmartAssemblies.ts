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

  const baseUrl = import.meta.env.VITE_WORLD_API_HTTP || import.meta.env.VITE_GATEWAY_HTTP;
  const ownerId = params?.ownerId != null ? normalizeId(params.ownerId) : null;
  const ownerAddress = params?.ownerAddress && params.ownerAddress.startsWith("0x") ? params.ownerAddress.toLowerCase() : null;
  const explicitIds = Array.isArray(params?.ids) ? params!.ids!.map((x) => normalizeId(x)!).filter(Boolean) : null;

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

      // If caller provided explicit IDs, fetch them directly
      const tryFetchExplicitIds = async (): Promise<SmartAssembly[] | null> => {
        if (!explicitIds || explicitIds.length === 0) return null;
        const base = `${baseUrl.replace(/\/$/, "")}/v2/smartassemblies`;
        const fetchOne = async (id: string): Promise<SmartAssembly | null> => {
          try {
            const r = await fetch(`${base}/${id}`, { signal: controller.signal });
            if (!r.ok) return { id } as SmartAssembly;
            const obj = await r.json();
            const s = (obj?.data ?? obj) as SmartAssembly;
            return s?.id != null ? s : ({ id } as SmartAssembly);
          } catch {
            return { id } as SmartAssembly;
          }
        };
        const results = await Promise.all(explicitIds.map(fetchOne));
        return results.filter(Boolean) as SmartAssembly[];
      };

      // Try filtered queries with ownerId or ownerAddress
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

        for (const q of queries) {
          try {
            const url = `${base}?${q}`;
            if (import.meta.env.DEV) console.debug("[useSmartAssemblies] fetching", url);
            const res = await fetch(url, { signal: controller.signal });
            if (res.ok) {
              const data = (await res.json()) as SmartAssembly[] | { items?: SmartAssembly[] };
              const list = Array.isArray(data) ? data : Array.isArray((data as any)?.items) ? (data as any).items : [];
              return list;
            }
            if (![400, 404].includes(res.status)) {
              const text = await res.text().catch(() => "");
              if (import.meta.env.DEV) console.warn("[useSmartAssemblies] non-404 error", res.status, text);
            }
          } catch (e) {
            if (controller.signal.aborted) return null;
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
  }, [baseUrl, ownerId, ownerAddress]);

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

  return { assemblies: sorted, isLoading, error };
}
