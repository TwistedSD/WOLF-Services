import React, { useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useConnection } from "src/providers/wallet";
import { useSmartCharacter } from "@/hooks/useSmartCharacter";
import {
  useSmartAssemblies,
  type SmartAssembly,
} from "@/hooks/useSmartAssemblies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

function useConnectedAddress(): string | null {
  const conn = useConnection() as any;
  // Try walletClient first (viem)
  const wcAccount = conn?.walletClient?.account;
  const wcAddress =
    typeof wcAccount === "string"
      ? wcAccount
      : wcAccount &&
        typeof wcAccount === "object" &&
        typeof wcAccount.address === "string"
      ? wcAccount.address
      : undefined;

  const direct =
    wcAddress ||
    (conn?.connectedProvider as any)?.provider?.selectedAddress ||
    conn?.account ||
    conn?.address ||
    conn?.selectedAccount ||
    conn?.connectedProvider?.account ||
    conn?.connectedProvider?.address ||
    (Array.isArray(conn?.connectedProvider?.accounts)
      ? conn.connectedProvider.accounts[0]
      : undefined) ||
    (Array.isArray(conn?.accounts) ? conn.accounts[0] : undefined);
  const addr = typeof direct === "string" ? direct : null;
  return addr && addr.startsWith("0x") ? addr.toLowerCase() : null;
}

function getAssemblyLabel(a: SmartAssembly): string {
  const id = a?.id != null ? String(a.id) : "";
  const typeLabel =
    (a as any)?.typeDetails?.name ||
    (a as any)?.assemblyType ||
    (a as any)?.smartAssemblyType ||
    (a as any)?.type?.name ||
    (a as any)?.type ||
    (a as any)?.metadata?.type ||
    (a as any)?.entityRecord?.typeName ||
    "Assembly";

  const solarName =
    (a as any)?.solarSystem?.name ||
    (a as any)?.location?.solarSystem?.name ||
    (a as any)?.location?.solarSystemName ||
    (a as any)?.solarSystemName ||
    (a as any)?.location?.solarSystemId ||
    (a as any)?.solarSystemId ||
    "";

  // Format: {typedetails} : {solarsystem}
  return `${String(typeLabel)}${solarName ? ` : ${String(solarName)}` : ""}`;
}

const SmartAssemblySelector: React.FC = () => {
  const address = useConnectedAddress();
  const {
    id: characterId,
    name: characterName,
    isLoading: scLoading,
    error: scError,
    assemblyIds,
  } = useSmartCharacter(address);
  const {
    assemblies,
    isLoading: asmLoading,
    error: asmError,
  } = useSmartAssemblies({
    ownerId: characterId,
    ownerAddress: address,
    ids: assemblyIds,
  });

  const [params, setParams] = useSearchParams();
  const selectedId = params.get("smartObjectId");

  const selectedExists = useMemo(
    () => assemblies.some((a) => String(a.id) === String(selectedId ?? "")),
    [assemblies, selectedId]
  );
  const currentValue = useMemo(
    () => (selectedExists ? String(selectedId) : ""),
    [selectedExists, selectedId]
  );

  // Auto-select from URL or first item when list loads
  useEffect(() => {
    if (asmLoading) return;
    if (assemblies.length === 0) return;

    const current = params.get("smartObjectId");
    const hasCurrent =
      current && assemblies.some((a) => String(a.id) === String(current));
    const nextId = hasCurrent ? current! : String(assemblies[0].id);

    if (current !== nextId) {
      params.set("smartObjectId", nextId);
      setParams(params, { replace: true });
    }
  }, [asmLoading, assemblies, params, setParams]);

  const onSelectId = useCallback(
    (value: string) => {
      params.set("smartObjectId", value);
      setParams(params, { replace: true });
    },
    [params, setParams]
  );

  if (!address) return null;

  return (
    <div className="p-3 border-b border-border space-y-2" aria-live="polite">
      {/* Smart Character state */}
      {scLoading && (
        <div className="text-sm text-muted-foreground">
          Loading Smart Character…
        </div>
      )}
      {!scLoading && scError && (
        <div className="text-sm text-red-500">
          Failed to load Smart Character: {scError}
        </div>
      )}
      {!scLoading && !scError && !characterId && (
        <div className="text-sm">No Smart Character linked to this wallet.</div>
      )}
      {!scLoading && !scError && characterId && (
        <div className="text-sm">
          Smart Character:{" "}
          <span className="font-semibold">
            {characterName ?? `#${characterId}`}
          </span>
        </div>
      )}

      {/* Assemblies dropdown */}
      {(characterId || assemblies.length > 0) && (
        <div className="flex items-center gap-2">
          <div className="text-sm">Smart Assembly:</div>
          <Select
            value={currentValue}
            onValueChange={onSelectId}
            disabled={asmLoading || !!asmError || assemblies.length === 0}
          >
            <SelectTrigger className="min-w-[280px] max-w-[520px]">
              <SelectValue
                placeholder={
                  asmLoading
                    ? "Loading assemblies…"
                    : asmError
                    ? "Failed to load assemblies"
                    : assemblies.length === 0
                    ? "No assemblies found"
                    : "Select an assembly"
                }
              />
            </SelectTrigger>
            {!asmLoading && !asmError && assemblies.length > 0 && (
              <SelectContent>
                {assemblies.map((a) => (
                  <SelectItem key={String(a.id)} value={String(a.id)}>
                    {getAssemblyLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            )}
          </Select>
          {!asmLoading && !asmError && assemblies.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({assemblies.length})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(SmartAssemblySelector);
