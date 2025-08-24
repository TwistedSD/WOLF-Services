import { useEffect, useMemo, useState } from "react";

export type SmartAssembly = {
  id: string | number;
  name?: string;
  displayName?: string;
  metadata?: { name?: string; [k: string]: unknown };
  owner?: { id?: string | number; [k: string]: unknown } | string | number | null;
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

  const baseUrl = (import.meta.env.VITE_WORLD_API_HTTP as string | undefined) || (import.meta.env.VITE_GATEWAY_HTTP as string | undefined);
  const ownerId = params?.ownerId != null ? normalizeId(params.ownerId) : null;
  const ownerAddress = params?.ownerAddress && params.ownerAddress.startsWith("0x") ? params.ownerAddress.toLowerCase() : null;
  const indexerUrl = import.meta.env.VITE_MUD_INDEXER_HTTP as string | undefined;
  const worldAddress = import.meta.env.VITE_WORLD_ADDRESS as string | undefined;
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

      // If caller provided explicit IDs, fetch them directly for accuracy
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

      // Try filtered queries first if we have an ownerId or ownerAddress, with several common param names.
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
            // if 400/404 try next candidate, otherwise record error and continue
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

      const tryFetchAll = async (): Promise<SmartAssembly[]> => {
        const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v2/smartassemblies`, { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Request failed: ${res.status}`);
        }
        const data = (await res.json()) as SmartAssembly[] | { items?: SmartAssembly[] };
        const list = Array.isArray(data) ? data : Array.isArray((data as any)?.items) ? (data as any).items : [];
        return list;
      };

      // Indexer fallback: query ERC721 owners table for tokenIds owned by wallet
      const tryFetchFromIndexer = async (): Promise<SmartAssembly[] | null> => {
        if (!indexerUrl || !worldAddress || !ownerAddress) return null;
        try {
          const body = JSON.stringify([
            {
              address: worldAddress,
              query: `SELECT "tokenId", "owner" FROM erc721deploybl__Owners WHERE "owner" = '${ownerAddress}';`,
            },
          ]);
          const res = await fetch(indexerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: controller.signal,
          });
          if (!res.ok) return null;
          const j = await res.json();
          // Expect j.result like [ [ ["tokenId","owner"], [id, owner], ... ] ]
          const rows = Array.isArray(j?.result?.[0]) ? j.result[0] : [];
          const tokenIds: Array<string | number> = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (Array.isArray(row) && row.length > 0) tokenIds.push(row[0]);
          }
          if (tokenIds.length === 0) return [];
          // Enrich by fetching world API details per id if baseUrl exists
          const base = baseUrl?.replace(/\/$/, "");
          if (!base) {
            return tokenIds.map((id) => ({ id }));
          }
          const fetchOne = async (id: string | number): Promise<SmartAssembly> => {
            try {
              const r = await fetch(`${base}/v2/smartassemblies/${id}`, { signal: controller.signal });
              if (r.ok) {
                const obj = await r.json();
                // Accept object or { data }
                const s = (obj?.data ?? obj) as SmartAssembly;
                return s?.id ? s : { id } as SmartAssembly;
              }
            } catch {}
            return { id } as SmartAssembly;
          };
          const results = await Promise.all(tokenIds.map(fetchOne));
          return results.filter(Boolean) as SmartAssembly[];
        } catch {
          return null;
        }
      };

      try {
        // Priority: explicit IDs => filtered API => indexer => all+filter
        let list = (await tryFetchExplicitIds()) ?? [];
        if (list.length === 0) {
          list = (await tryFetchWithFilters()) ?? [];
        }
        if ((!list || list.length === 0) && (ownerId || ownerAddress)) {
          // Attempt Indexer-based ownership lookup by wallet address
          const idx = await tryFetchFromIndexer();
          if (idx && idx.length > 0) {
            setAssemblies(idx);
            return;
          }
          // Fallback: fetch all and filter client-side by common owner shapes.
          const all = await tryFetchAll();
          const ownerIdStr = ownerId != null ? String(ownerId) : null;
          const addrStr = ownerAddress;
          list = all.filter((a) => {
            const o = (a as any).owner;
            // Match by character id if provided
            if (ownerIdStr) {
              if (o == null) return false;
              if (typeof o === "string" || typeof o === "number") return String(o) === ownerIdStr;
              if (typeof o === "object") {
                const oid = (o as any).id ?? (o as any).ownerId ?? (o as any).smartCharacterId ?? (o as any).characterId;
                if (oid != null && String(oid) === ownerIdStr) return true;
              }
            }
            // Match by wallet address if provided
            if (addrStr) {
              const fields = [
                (a as any).ownerAddress,
                (a as any).wallet,
                (a as any).ownerWallet,
                (o as any)?.address,
                (o as any)?.wallet,
              ].filter(Boolean);
              return fields.some((f: any) => typeof f === "string" && f.toLowerCase() === addrStr);
            }
            return false;
          });
          setAssemblies(list);
        } else {
          // Either we have filtered results or no owner filter requested.
          if (!list || list.length === 0) {
            list = await tryFetchAll();
          }
          setAssemblies(list);
        }
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
  }, [baseUrl, ownerId]);

  // Keep a stable sorted list by name then id for nicer UX
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
