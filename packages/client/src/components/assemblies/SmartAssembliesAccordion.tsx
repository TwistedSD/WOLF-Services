import React, { useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useConnection } from "@/providers/wallet";
import { useSmartCharacter } from "@/hooks/useSmartCharacter";
import {
  useSmartAssemblies,
  type SmartAssembly,
} from "@/hooks/useSmartAssemblies";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Eye, LogOut } from "lucide-react";
import SmartAssemblyInfoPanel from "./SmartAssemblyInfoPanel";
import PrimaryLogo from "@/assets/primary.png";
// Helper to format durations as d/h/m for compact display
function formatDurationDHm(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds)) return "-";
  const sec = Math.max(0, Math.floor(seconds));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "<1m";
}

function useConnectedAddress(): string | null {
  const conn = useConnection() as any;
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

function getTypeName(a: SmartAssembly): string {
  return (
    (a as any)?.typeDetails?.name ||
    (a as any)?.assemblyType ||
    (a as any)?.smartAssemblyType ||
    (a as any)?.type?.name ||
    (a as any)?.type ||
    (a as any)?.metadata?.type ||
    (a as any)?.metadata?.name ||
    (a as any)?.entityRecord?.typeName ||
    "Assembly"
  );
}

function getSolarSystem(a: SmartAssembly): string {
  return (
    (a as any)?.solarSystem?.name ||
    (a as any)?.location?.solarSystem?.name ||
    (a as any)?.location?.solarSystemName ||
    (a as any)?.solarSystemName ||
    (a as any)?.location?.solarSystemId ||
    (a as any)?.solarSystemId ||
    ""
  );
}

function getLabel(a: SmartAssembly): string {
  const type = getTypeName(a);
  const sys = getSolarSystem(a);
  return `${type}${sys ? ` : ${sys}` : ""}`;
}

function isPortable(a: SmartAssembly): boolean {
  const t = getTypeName(a).toLowerCase();
  // Exclude network nodes and any storage variant
  if (t.includes("network node") || t === "node" || t.endsWith(" node"))
    return false;
  if (t.includes("storage")) return false;
  // Only allow explicitly named portable gear
  return (
    t.includes("portable refinery") ||
    t.includes("portable printer") ||
    t.includes("refuge")
  );
}

function isNetworkNode(a: SmartAssembly): boolean {
  const t = getTypeName(a).toLowerCase();
  return t.includes("network node") || t === "node" || t.endsWith(" node");
}

function getNetworkId(a: SmartAssembly): string | null {
  const cands: any[] = [
    (a as any)?.networkNodeId,
    (a as any)?.networkId,
    (a as any)?.nodeId,
    (a as any)?.networkNode?.id,
    (a as any)?.network?.id,
    (a as any)?.connectedTo?.id,
    (a as any)?.parentId,
  ];
  for (const c of cands) {
    if (c != null) return String(c);
  }
  return null;
}

function getLinkedAssemblyIds(node: SmartAssembly): string[] {
  const candidates: any[] = [
    (node as any)?.linkedAssemblies,
    (node as any)?.networkNode?.linkedAssemblies,
    (node as any)?.connections?.linkedAssemblies,
    (node as any)?.children,
    (node as any)?.assemblies,
    (node as any)?.attachedAssemblies,
  ];
  const ids = new Set<string>();
  for (const arr of candidates) {
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const id = (item as any)?.id ?? item;
        if (id != null) ids.add(String(id));
      }
    }
  }
  return Array.from(ids);
}

const SmartAssembliesAccordion: React.FC = () => {
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
  const clearedRef = useRef(false);

  // Ensure no default selection: clear any pre-existing URL param once on mount
  useEffect(() => {
    if (clearedRef.current) return;
    if (params.has("smartObjectId")) {
      params.delete("smartObjectId");
      setParams(params, { replace: true });
    }
    clearedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const hasSelected = useMemo(
    () =>
      !!selectedId &&
      assemblies.some((a) => String(a.id) === String(selectedId)),
    [assemblies, selectedId]
  );

  const onSelectId = useCallback(
    (value: string) => {
      params.set("smartObjectId", value);
      setParams(params, { replace: true });
    },
    [params, setParams]
  );

  // Do not auto-select; details only shown when user clicks View.

  const { portable, groups } = useMemo(() => {
    const portable = assemblies.filter(isPortable);
    const nodes = assemblies.filter(isNetworkNode);
    const nodeMap = new Map<string, SmartAssembly>();
    nodes.forEach((n) => nodeMap.set(String(n.id), n));
    const asmById = new Map<string, SmartAssembly>(
      assemblies.map((a) => [String((a as any)?.id), a])
    );

    type Group = {
      id: string;
      node: SmartAssembly | null;
      children: SmartAssembly[];
    };
    const groupMap = new Map<string, Group>();

    // Seed groups with nodes
    for (const n of nodes) {
      const id = String(n.id);
      groupMap.set(id, { id, node: n, children: [] });
    }

    // Attach children to their node group; create virtual group if node missing but networkId present
    for (const a of assemblies) {
      if (isPortable(a) || isNetworkNode(a)) continue;
      const nid = getNetworkId(a);
      if (!nid) continue; // skip non-networked
      const key = String(nid);
      const grp = groupMap.get(key) ?? { id: key, node: null, children: [] };
      grp.children.push(a);
      groupMap.set(key, grp);
    }

    // Also attach children from each node's linkedAssemblies by matching IDs to known assemblies
    for (const n of nodes) {
      const key = String(n.id);
      const grp = groupMap.get(key) ?? { id: key, node: n, children: [] };
      grp.node = grp.node ?? n;
      const existingIds = new Set(
        grp.children.map((c) => String((c as any)?.id))
      );
      const linkedIds = getLinkedAssemblyIds(n);
      for (const id of linkedIds) {
        const child = asmById.get(String(id));
        if (child && !existingIds.has(String((child as any)?.id))) {
          grp.children.push(child);
          existingIds.add(String((child as any)?.id));
        }
      }
      groupMap.set(key, grp);
    }

    // Sort portable and groups by label; children by label
    const cmpAsm = (a: SmartAssembly, b: SmartAssembly) =>
      getLabel(a).localeCompare(getLabel(b));
    portable.sort(cmpAsm);

    const groups: Group[] = Array.from(groupMap.values());
    for (const g of groups) {
      g.children.sort(cmpAsm);
    }
    groups.sort((a, b) => {
      const la = a.node ? getLabel(a.node) : `Network ${a.id}`;
      const lb = b.node ? getLabel(b.node) : `Network ${b.id}`;
      return la.localeCompare(lb);
    });

    return { portable, groups };
  }, [assemblies]);

  const { connectedProvider, handleDisconnect } = useConnection();
  const isConnected = connectedProvider?.connected === true || !!address;
  if (!address) return null;

  return (
    <div className="p-3 space-y-4" aria-live="polite">
      {/* Assemblies accordions */}
      {!hasSelected && (
        <>
          <Accordion
            type="multiple"
            className="border rounded my-6"
            style={{ borderColor: "var(--primary)" }}
          >
            <AccordionItem value="portable">
              <AccordionTrigger className="px-3">
                Portable structures ({portable.length})
              </AccordionTrigger>
              <AccordionContent className="px-3">
                {asmLoading && (
                  <div className="text-sm text-muted-foreground px-2">
                    Loading assemblies…
                  </div>
                )}
                {!asmLoading && asmError && (
                  <div className="text-sm text-red-500 px-2">
                    Failed to load assemblies
                  </div>
                )}
                {!asmLoading && !asmError && portable.length === 0 && (
                  <div className="text-sm text-muted-foreground px-2">
                    No portable structures
                  </div>
                )}
                {!asmLoading && !asmError && portable.length > 0 && (
                  <ul className="divide-y divide-border">
                    {portable.map((a: SmartAssembly) => {
                      const value = String(a.id);
                      const selected = String(selectedId ?? "") === value;
                      return (
                        <li
                          key={value}
                          className="flex items-center justify-between gap-2 px-3 py-2 border-l-2 border-transparent"
                          style={{
                            borderLeftColor: selected
                              ? "var(--primary)"
                              : "transparent",
                          }}
                        >
                          <div className="text-sm">{getLabel(a)}</div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSelectId(value)}
                            title="View details"
                          >
                            <Eye className="size-4" />
                            <span className="sr-only">View</span>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Accordion
            type="multiple"
            className="border rounded my-6"
            style={{ borderColor: "var(--primary)" }}
          >
            <AccordionItem value="networked">
              <AccordionTrigger className="px-3">
                Network nodes ({groups.length})
              </AccordionTrigger>
              <AccordionContent className="px-3">
                {asmLoading && (
                  <div className="text-sm text-muted-foreground px-2">
                    Loading assemblies…
                  </div>
                )}
                {!asmLoading && asmError && (
                  <div className="text-sm text-red-500 px-2">
                    Failed to load assemblies
                  </div>
                )}
                {!asmLoading && !asmError && groups.length === 0 && (
                  <div className="text-sm text-muted-foreground px-2">
                    No networked structures
                  </div>
                )}

                {!asmLoading && !asmError && groups.length > 0 && (
                  <Accordion type="multiple" className="ml-1 mt-2 mb-2">
                    {groups.map((g) => {
                      const nodeId = g.node ? String(g.node.id) : undefined;
                      const nodeSelected = nodeId
                        ? String(selectedId ?? "") === nodeId
                        : false;
                      const label = g.node
                        ? getLabel(g.node)
                        : `Network node ${g.id}`;
                      // Compute fuel/time and status for node (if exists)
                      const MAX_FUEL = 3571;
                      let timeText = "-";
                      let isOnline = false;
                      if (g.node) {
                        const n: any = g.node as any;
                        const burningRaw =
                          n?.networkNode?.burn?.isBurning ?? n?.burn?.isBurning;
                        isOnline =
                          burningRaw === true ||
                          burningRaw === "true" ||
                          burningRaw === 1 ||
                          burningRaw === "1";
                        const burnRateInSec = Number(
                          n?.networkNode?.fuel?.burnRateInSec ??
                            n?.fuel?.burnRateInSec ??
                            n?.burnRateInSec ??
                            n?.fuel?.burnRateSec ??
                            n?.burnRateSec
                        );
                        const amount = Number(
                          n?.networkNode?.fuel?.amount ??
                            n?.fuel?.amount ??
                            n?.fuelAmount ??
                            n?.amount ??
                            n?.fuel?.balance
                        );
                        const effRaw = Number(
                          n?.networkNode?.fuel?.efficiency ??
                            n?.fuel?.efficiency ??
                            n?.fuelEfficiency ??
                            n?.efficiency ??
                            n?.fuel?.fuelEfficiency ??
                            1
                        );
                        const efficiency = Number.isFinite(effRaw)
                          ? effRaw <= 1
                            ? effRaw
                            : effRaw / 100
                          : 1;
                        const clamped = Math.max(
                          0,
                          Math.min(
                            Number.isFinite(amount) ? amount : 0,
                            MAX_FUEL
                          )
                        );
                        const perUnit = Number.isFinite(burnRateInSec)
                          ? burnRateInSec * efficiency
                          : undefined;
                        const remaining =
                          perUnit != null ? clamped * perUnit : undefined;
                        timeText = formatDurationDHm(remaining);
                      }
                      return (
                        <AccordionItem key={g.id} value={`node-${g.id}`}>
                          <AccordionTrigger>
                            <div
                              className="flex w-full items-center justify-between gap-2 border-l-2 border-transparent px-3"
                              style={{
                                borderLeftColor: nodeSelected
                                  ? "var(--primary)"
                                  : "transparent",
                              }}
                            >
                              <div className="flex-1 text-left">
                                {label} ({g.children.length})
                              </div>
                              {g.node && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                                  <span
                                    className={`inline-block h-2 w-2 rounded-full ${
                                      isOnline ? "bg-green-500" : "bg-red-500"
                                    }`}
                                    aria-label={isOnline ? "Online" : "Offline"}
                                  />
                                  <span>{timeText}</span>
                                </div>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {/* Node row with View (if node exists) */}
                            {g.node && (
                              <div
                                className="flex items-center justify-between gap-2 px-3 py-2 border-l-2 border-transparent"
                                style={{
                                  borderLeftColor: nodeSelected
                                    ? "var(--primary)"
                                    : "transparent",
                                }}
                              >
                                <div className="text-sm font-medium">
                                  {getLabel(g.node)}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onSelectId(String(g.node!.id))}
                                  title="View details"
                                >
                                  <Eye className="size-4" />
                                  <span className="sr-only">View</span>
                                </Button>
                              </div>
                            )}
                            {/* Children */}
                            {g.children.length > 0 ? (
                              <ul className="ml-4 border-l pl-2 divide-y divide-border">
                                {g.children.map((c) => {
                                  const cid = String(c.id);
                                  const sel = String(selectedId ?? "") === cid;
                                  return (
                                    <li
                                      key={cid}
                                      className="flex items-center justify-between gap-2 px-3 py-2 border-l-2 border-transparent"
                                      style={{
                                        borderLeftColor: sel
                                          ? "var(--primary)"
                                          : "transparent",
                                      }}
                                    >
                                      <div className="text-sm">
                                        {getLabel(c)}
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onSelectId(cid)}
                                        title="View details"
                                      >
                                        <Eye className="size-4" />
                                        <span className="sr-only">View</span>
                                      </Button>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <div className="text-sm text-muted-foreground px-2 py-1">
                                No attached assemblies
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}

      {/* Details Panel */}
      {hasSelected ? <SmartAssemblyInfoPanel assemblies={assemblies} /> : null}
    </div>
  );
};

export default React.memo(SmartAssembliesAccordion);
