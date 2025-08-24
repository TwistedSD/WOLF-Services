import { useEffect, useMemo, useState } from "react";

export type SmartCharacter = {
  id?: string | number;
  name?: string;
  characterName?: string;
  metadata?: { name?: string; [k: string]: unknown };
  character?: { name?: string; [k: string]: unknown };
  [k: string]: unknown;
};

export type UseSmartCharacterResult = {
  character: SmartCharacter | null;
  name: string | null;
  id: string | null;
  assemblyIds: string[];
  isLoading: boolean;
  error: string | null;
};

export function useSmartCharacter(address?: string | null): UseSmartCharacterResult {
  const [character, setCharacter] = useState<SmartCharacter | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = (import.meta.env.VITE_WORLD_API_HTTP as string | undefined) || (import.meta.env.VITE_GATEWAY_HTTP as string | undefined);

  useEffect(() => {
    if (!address) {
      setCharacter(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (!baseUrl) {
      setCharacter(null);
      setError("Missing VITE_WORLD_API_HTTP");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
  const base = `${baseUrl.replace(/\/$/, "")}/v2/smartcharacters`;

    setIsLoading(true);
    setError(null);

    const run = async () => {
      try {
        const candidates = [
          `${base}/${address}`,
          `${base}?owner=${encodeURIComponent(address)}`,
          `${base}?address=${encodeURIComponent(address)}`,
          `${base}?wallet=${encodeURIComponent(address)}`,
        ];

        let found: SmartCharacter | null = null;
        let lastError: string | null = null;
        for (const url of candidates) {
          if (import.meta.env.DEV) console.debug("[useSmartCharacter] fetching", url);
          try {
            const res = await fetch(url, {
              signal: controller.signal,
              headers: { Accept: "application/json" },
            });
            if (!res.ok) {
              if (res.status === 404) {
                // try next shape
                continue;
              }
              const text = await res.text().catch(() => "");
              lastError = text || `Request failed: ${res.status}`;
              continue;
            }
            const json = await res.json();
            const value = Array.isArray(json)
              ? json[0]
              : (json?.item ?? json?.data ?? json?.character ?? json);
            if (value) {
              found = value as SmartCharacter;
              break;
            }
          } catch (e: any) {
            if (controller.signal.aborted) return;
            lastError = e?.message ?? String(e);
          }
        }
        if (found) {
          setCharacter(found);
          setError(null);
        } else {
          // If no candidate worked but we had a non-404 error captured, surface it; otherwise treat as not linked
          setCharacter(null);
          setError(lastError);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [address, baseUrl]);

  const name = useMemo(() => {
    if (!character) return null;
    return (
      character.name ??
      character.characterName ??
      character.metadata?.name ??
      character.character?.name ??
      (character.id != null ? `Character #${character.id}` : null)
    );
  }, [character]);

  const id = useMemo(() => {
    const raw =
      character?.id ??
      // fallback paths seen in some payloads
      (character as any)?.characterId ??
      (character as any)?.metadata?.id;
    if (raw == null) return null;
    return String(raw);
  }, [character]);

  const assemblyIds = useMemo(() => {
    if (!character) return [] as string[];
    const candidates: any[] = [];
    const pushArr = (arr: any) => {
      if (Array.isArray(arr)) candidates.push(...arr);
    };
    pushArr((character as any).smartAssemblies);
    pushArr((character as any).assemblies);
    pushArr((character as any).ownedSmartAssemblies);
    pushArr((character as any).items);
    // Sometimes wrapped under { items: [...] }
    if (Array.isArray((character as any)?.smartAssemblies?.items))
      pushArr((character as any).smartAssemblies.items);
    if (Array.isArray((character as any)?.assemblies?.items))
      pushArr((character as any).assemblies.items);

    const ids = candidates
      .map((entry) => {
        if (entry == null) return null;
        if (typeof entry === "string" || typeof entry === "number") return String(entry);
        const e: any = entry;
        return (
          (e.id != null && String(e.id)) ||
          (e.smartObjectId != null && String(e.smartObjectId)) ||
          (e.smartAssemblyId != null && String(e.smartAssemblyId)) ||
          (e.tokenId != null && String(e.tokenId)) ||
          null
        );
      })
      .filter((v: any): v is string => typeof v === "string");

    // Deduplicate
    return Array.from(new Set(ids));
  }, [character]);

  return { character, name, id, assemblyIds, isLoading, error };
}
