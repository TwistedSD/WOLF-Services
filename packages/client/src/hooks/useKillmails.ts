import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { zodErrorToError } from "@/utils/validation";

// Minimal, flexible schema: accept unknown fields but ensure a few common ones if present
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

// Primary v2 shape: { data: Killmail[], metadata: { total, limit, offset } }
const KillmailsV2Schema = z
  .object({
    data: z.array(KillmailSchema),
    metadata: z
      .object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.number().optional(),
      })
      .partial()
      .passthrough()
      .optional(),
  })
  .passthrough();

// Secondary generic/wrapped shape fallbacks
const KillmailsResponseSchema = z
  .object({
    items: z.array(KillmailSchema).optional(),
    data: z.array(KillmailSchema).optional(),
    total: z.number().optional(),
    next: z.any().optional(),
    prev: z.any().optional(),
  })
  .passthrough();

export type Killmail = z.infer<typeof KillmailSchema> & Record<string, unknown>;

type Options = {
  pageSize?: number; // default 50
  page?: number; // default 1
  refreshKey?: number | string; // change to force refetch
  systemId?: string | number; // optional system filter
};

export function useKillmails(options: Options = {}) {
  const { pageSize = 50, page = 1, refreshKey, systemId } = options;
  const baseUrl = ((import.meta as any)?.env?.VITE_WORLD_API_HTTP as string | undefined) ??
    "https://world-api-stillness.live.tech.evefrontier.com";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [killmails, setKillmails] = useState<Killmail[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const urls = useMemo(() => {
    if (!baseUrl) return [] as string[];
    const offset = (page - 1) * pageSize;
    const candidates: string[] = [];
    // Candidate 0: plain v2 endpoint (only when viewing first page)
    if (page === 1) {
      const u = new URL("/v2/killmails", baseUrl);
      if (systemId != null) u.searchParams.set("solarSystemId", String(systemId));
      candidates.push(u.toString());
    }
    // Candidate 1: v2 with limit/offset
    {
      const u = new URL("/v2/killmails", baseUrl);
      u.searchParams.set("limit", String(pageSize));
      u.searchParams.set("offset", String(Math.max(0, offset)));
      if (systemId != null) u.searchParams.set("solarSystemId", String(systemId));
      candidates.push(u.toString());
    }
    // Candidate 2: v2 with page/size
    {
      const u = new URL("/v2/killmails", baseUrl);
      u.searchParams.set("page", String(page));
      u.searchParams.set("size", String(pageSize));
      if (systemId != null) u.searchParams.set("solarSystemId", String(systemId));
      candidates.push(u.toString());
    }
    // Candidate 3: non-v2 path
    {
      const u = new URL("/killmails", baseUrl);
      u.searchParams.set("limit", String(pageSize));
      u.searchParams.set("offset", String(Math.max(0, offset)));
      if (systemId != null) u.searchParams.set("solarSystemId", String(systemId));
      candidates.push(u.toString());
    }
    return candidates;
  }, [baseUrl, page, pageSize, refreshKey, systemId]);

  useEffect(() => {
    if (!baseUrl) {
      setError(new Error("VITE_WORLD_API_HTTP is not set"));
      return;
    }
    if (!urls.length) return;
    setIsLoading(true);
    setError(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      let found: Killmail[] | null = null;
      let foundTotal: number | null = null;
      let used: string | null = null;
      let lastErr: unknown = null;

      // Preferred path: get total, then page newest->oldest by computing offset from total
      try {
        const metaUrl = new URL("/v2/killmails", baseUrl);
        metaUrl.searchParams.set("limit", "1");
        metaUrl.searchParams.set("offset", "0");
        if (systemId != null) metaUrl.searchParams.set("solarSystemId", String(systemId));
        const mr = await fetch(metaUrl.toString(), { signal: ctrl.signal });
        if (mr.ok) {
          const mj = await mr.json();
          const m = KillmailsV2Schema.safeParse(mj);
          if (m.success) {
            const total = m.data.metadata?.total;
            if (typeof total === "number") {
              setTotal(total);
              // Compute offset for newest-first paging
              const desiredOffset = Math.max(0, total - page * pageSize);
              const dataUrl = new URL("/v2/killmails", baseUrl);
              dataUrl.searchParams.set("limit", String(pageSize));
              dataUrl.searchParams.set("offset", String(desiredOffset));
              if (systemId != null) dataUrl.searchParams.set("solarSystemId", String(systemId));
              const dr = await fetch(dataUrl.toString(), { signal: ctrl.signal });
              if (dr.ok) {
                const dj = await dr.json();
                const dv2 = KillmailsV2Schema.safeParse(dj);
                if (dv2.success) {
                  const arr = dv2.data.data;
                  const safe = arr.map((x: unknown) => {
                    const res = KillmailSchema.safeParse(x);
                    return res.success ? (res.data as Killmail) : (x as any);
                  });
                  found = safe;
                  foundTotal = total;
                  used = dataUrl.toString();
                }
              }
            }
          }
        }
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        lastErr = e;
      }

      // If preferred path didn't yield results, try candidates
      if (found == null) for (const candidate of urls) {
        try {
          const r = await fetch(candidate, { signal: ctrl.signal });
          if (!r.ok) throw new Error(`Failed to fetch killmails: ${r.status}`);
          const json = await r.json();

          // 1) Prefer v2 shape with metadata
          const v2 = KillmailsV2Schema.safeParse(json);
          if (v2.success) {
            const arr = v2.data.data ?? [];
            const safe = arr.map((x: unknown) => {
              const res = KillmailSchema.safeParse(x);
              return res.success ? (res.data as Killmail) : (x as any);
            });
            found = safe;
            foundTotal = v2.data.metadata?.total ?? null;
            used = candidate;
            // do not break immediately; if array empty, continue to try other shapes
            if (safe.length > 0) break;
            continue;
          }

          // 2) Generic wrapped shapes
          const wrapped = KillmailsResponseSchema.safeParse(json);
          if (wrapped.success) {
            const arr = (wrapped.data.items ?? wrapped.data.data ?? []) as unknown[];
            const safe = arr.map((x: unknown) => {
              const res = KillmailSchema.safeParse(x);
              return res.success ? (res.data as Killmail) : (x as any);
            });
            const maybeTotal = wrapped.data.total ?? null;
            found = safe;
            foundTotal = typeof maybeTotal === "number" ? maybeTotal : null;
            used = candidate;
            if (safe.length > 0) break;
            continue;
          }

          // 3) Accept array body
          if (Array.isArray(json)) {
            const safe = json.map((x: unknown) => {
              const res = KillmailSchema.safeParse(x);
              return res.success ? (res.data as Killmail) : (x as any);
            });
            found = safe;
            foundTotal = null;
            used = candidate;
            if (safe.length > 0) break;
            continue;
          }

          // 4) Last-chance keys
          const arr =
            (json as any)?.killmails ?? (json as any)?.results ?? (json as any)?.data ?? [];
          const safe = Array.isArray(arr)
            ? (arr as unknown[]).map((x: unknown) => {
                const res = KillmailSchema.safeParse(x);
                return res.success ? (res.data as Killmail) : (x as any);
              })
            : [];
          found = safe;
          const maybeTotal = (json as any)?.total ?? (json as any)?.metadata?.total;
          foundTotal = typeof maybeTotal === "number" ? maybeTotal : null;
          used = candidate;
          if (safe.length > 0) break;
        } catch (e) {
          if ((e as any)?.name === "AbortError") return;
          lastErr = e;
          continue;
        }
      }

      if (found == null) {
        if (lastErr) setError(zodErrorToError(lastErr, "Killmails error:"));
        setIsLoading(false);
        return;
      }

      setKillmails(found);
      setTotal(foundTotal);
      setSourceUrl(used);
      setIsLoading(false);
    })();

    return () => ctrl.abort();
  }, [urls]);

  return { isLoading, error, killmails, total, sourceUrl } as const;
}
