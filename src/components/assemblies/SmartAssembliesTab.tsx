import React, { useState, useMemo } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { useSmartCharacter } from "../../hooks/useSmartCharacter";
import {
  useSmartAssemblies,
  SmartAssembly,
} from "../../hooks/useSmartAssemblies";

interface SmartAssembliesTabProps {
  walletAddress: string | null;
}

// Helper to format durations as d/h/m
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

function getTypeName(a: SmartAssembly): string {
  return (
    a.typeDetails?.name ||
    a.assemblyType ||
    a.smartAssemblyType ||
    (typeof a.type === "object" ? a.type?.name : a.type) ||
    a.metadata?.type ||
    a.metadata?.name ||
    "Assembly"
  );
}

function getSolarSystem(a: SmartAssembly): string {
  return (
    a.solarSystem?.name ||
    a.location?.solarSystem?.name ||
    a.location?.solarSystemName ||
    a.solarSystemName ||
    (a.location?.solarSystemId ? String(a.location.solarSystemId) : "") ||
    (a.solarSystemId ? String(a.solarSystemId) : "") ||
    ""
  );
}

function getLabel(a: SmartAssembly): string {
  const type = getTypeName(a);
  const sys = getSolarSystem(a);
  return `${type}${sys ? ` : ${sys}` : ""}`;
}

function isNetworkNode(a: SmartAssembly): boolean {
  const t = getTypeName(a).toLowerCase();
  return t.includes("network node") || t === "node" || t.endsWith(" node");
}

function isStorage(a: SmartAssembly): boolean {
  const t = getTypeName(a).toLowerCase();
  return t.includes("storage") || t.includes("warehouse") || t.includes("silo");
}

function isManufacturing(a: SmartAssembly): boolean {
  const t = getTypeName(a).toLowerCase();
  return (
    t.includes("refinery") ||
    t.includes("printer") ||
    t.includes("factory") ||
    t.includes("fabricator") ||
    t.includes("assembler") ||
    t.includes("forge")
  );
}

function isTurret(a: SmartAssembly): boolean {
  const t = getTypeName(a).toLowerCase();
  return t.includes("turret") || t.includes("gun") || t.includes("weapon");
}

function getNetworkId(a: SmartAssembly): string | null {
  const cands: any[] = [
    a.networkNodeId,
    a.networkId,
    a.nodeId,
    (a as any).networkNode?.id,
    (a as any).network?.id,
    (a as any).connectedTo?.id,
    (a as any).parentId,
  ];
  for (const c of cands) {
    if (c != null) return String(c);
  }
  return null;
}

function getLinkedAssemblyIds(node: SmartAssembly): string[] {
  const candidates: any[] = [
    node.linkedAssemblies,
    (node as any).networkNode?.linkedAssemblies,
    (node as any).connections?.linkedAssemblies,
    (node as any).children,
    (node as any).assemblies,
    (node as any).attachedAssemblies,
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

function getNodeFuelInfo(node: SmartAssembly): {
  status: string;
  timeText: string;
} {
  const MAX_FUEL = 3571;
  const n: any = node as any;

  // Use state field from API
  const state = (n?.state ?? "").toLowerCase();
  let status = "Offline";
  if (state === "online") {
    status = "Online";
  } else if (state === "destroyed") {
    status = "Destroyed";
  } else if (state === "offline") {
    status = "Offline";
  } else {
    // Fallback to old detection method
    const burningRaw = n?.networkNode?.burn?.isBurning ?? n?.burn?.isBurning;
    const isOnline =
      burningRaw === true ||
      burningRaw === "true" ||
      burningRaw === 1 ||
      burningRaw === "1";
    const isDestroyed =
      n?.isDestroyed || n?.destroyed || n?.status === "destroyed";

    if (isDestroyed) {
      status = "Destroyed";
    } else if (isOnline) {
      status = "Online";
    }
  }

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
    Math.min(Number.isFinite(amount) ? amount : 0, MAX_FUEL)
  );

  const perUnit = Number.isFinite(burnRateInSec)
    ? burnRateInSec * efficiency
    : undefined;

  const remaining = perUnit != null ? clamped * perUnit : undefined;

  const timeText = formatDurationDHm(remaining);

  return { status, timeText };
}

function getAssemblyStatus(a: SmartAssembly): string {
  const n: any = a as any;

  // Use state field from API
  const state = (n?.state ?? "").toLowerCase();
  if (state === "online") return "Online";
  if (state === "destroyed") return "Destroyed";
  if (state === "offline") return "Offline";

  // Fallback to old detection method
  const isDestroyed =
    n?.isDestroyed || n?.destroyed || n?.status === "destroyed";
  if (isDestroyed) return "Destroyed";

  const burningRaw = n?.burn?.isBurning ?? n?.isBurning ?? n?.online;
  const isOnline =
    burningRaw === true ||
    burningRaw === "true" ||
    burningRaw === 1 ||
    burningRaw === "1";

  return isOnline ? "Online" : "Offline";
}

function formatStorageNumber(num: number): string {
  if (num === 0) return "0";

  // Convert from wei to a more readable format
  // EVE Frontier uses very large numbers, typically in the range of 10^20+
  // We'll convert to a sensible unit
  if (num >= 1e18) {
    return (num / 1e18).toFixed(0);
  } else if (num >= 1e15) {
    return (num / 1e15).toFixed(0);
  } else if (num >= 1e12) {
    return (num / 1e12).toFixed(0);
  } else if (num >= 1e9) {
    return (num / 1e9).toFixed(0);
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(0);
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(0);
  }
  return num.toFixed(0);
}

function getStorageInfo(storage: SmartAssembly): {
  current: string;
  max: string;
  percentage: number;
} {
  const s: any = storage as any;

  // API returns capacity in wei (very large numbers), convert to readable units
  const usedCapacity =
    s?.storage?.mainInventory?.usedCapacity ??
    s?.storage?.used ??
    s?.currentCapacity ??
    0;
  const capacity =
    s?.storage?.mainInventory?.capacity ??
    s?.storage?.max ??
    s?.maxCapacity ??
    1000;

  const currentNum = Number(usedCapacity);
  const maxNum = Number(capacity);
  const percentage = maxNum > 0 ? Math.round((currentNum / maxNum) * 100) : 0;

  return {
    current: formatStorageNumber(currentNum),
    max: formatStorageNumber(maxNum),
    percentage,
  };
}

function getStorageItems(
  storage: SmartAssembly
): Array<{ name: string; quantity: number }> {
  const s: any = storage as any;

  // API structure: storage.mainInventory.items[]
  const items = s?.storage?.mainInventory?.items ?? [];

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item: any) => ({
      name: item.name ?? item.typeName ?? "Unknown Item",
      quantity: Number(item.quantity ?? 0),
    }))
    .filter((item: any) => item.quantity > 0);
}

export const SmartAssembliesTab: React.FC<SmartAssembliesTabProps> = ({
  walletAddress,
}) => {
  const {
    id: characterId,
    isLoading: charLoading,
    error: charError,
    assemblyIds,
  } = useSmartCharacter(walletAddress);
  const {
    assemblies,
    isLoading: asmLoading,
    error: asmError,
    refresh: refreshAssemblies,
  } = useSmartAssemblies({
    ownerId: characterId,
    ownerAddress: walletAddress,
    ids: assemblyIds,
  });

  const [showDataDelay, setShowDataDelay] = useState(false);
  const [refreshingNode, setRefreshingNode] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Combine loading states
  const isLoading = charLoading || asmLoading;

  // Give data a few seconds to load fully before showing "no assemblies" message
  React.useEffect(() => {
    // Track that we've started loading at least once
    if (isLoading) {
      setHasLoadedOnce(true);
    }

    // Only apply delay after initial load completes with no data
    if (!isLoading && hasLoadedOnce && assemblies.length === 0 && !showDataDelay) {
      const timer = setTimeout(() => {
        setShowDataDelay(false);
      }, 3000); // Wait 3 seconds for data to fully load
      return () => clearTimeout(timer);
    }

    if (assemblies.length > 0) {
      setShowDataDelay(false);
    }
  }, [isLoading, assemblies.length, hasLoadedOnce, showDataDelay]);

  const handleRefreshAll = () => {
    refreshAssemblies();
    setShowDataDelay(true);
  };

  const handleRefreshNode = async (nodeId: string) => {
    setRefreshingNode(nodeId);
    refreshAssemblies();
    // Clear refreshing state after a delay
    setTimeout(() => setRefreshingNode(null), 1000);
  };

  const [openNodes, setOpenNodes] = useState<Set<string>>(new Set());
  const [openStorageItems, setOpenStorageItems] = useState<Set<string>>(
    new Set()
  );
  const [openStorageCategory, setOpenStorageCategory] = useState<Set<string>>(
    new Set()
  );
  const [openManufacturingCategory, setOpenManufacturingCategory] = useState<
    Set<string>
  >(new Set());
  const [openTurretsCategory, setOpenTurretsCategory] = useState<Set<string>>(
    new Set()
  );

  const toggleNode = (nodeId: string) => {
    const newSet = new Set(openNodes);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    setOpenNodes(newSet);
  };

  const toggleStorageItems = (storageId: string) => {
    const newSet = new Set(openStorageItems);
    if (newSet.has(storageId)) {
      newSet.delete(storageId);
    } else {
      newSet.add(storageId);
    }
    setOpenStorageItems(newSet);
  };

  const toggleCategory = (
    categoryKey: string,
    categoryType: "storage" | "manufacturing" | "turrets"
  ) => {
    let newSet: Set<string>;
    if (categoryType === "storage") {
      newSet = new Set(openStorageCategory);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      setOpenStorageCategory(newSet);
    } else if (categoryType === "manufacturing") {
      newSet = new Set(openManufacturingCategory);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      setOpenManufacturingCategory(newSet);
    } else {
      newSet = new Set(openTurretsCategory);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      setOpenTurretsCategory(newSet);
    }
  };

  const groups = useMemo(() => {
    const nodes = assemblies.filter(isNetworkNode);
    const asmById = new Map<string, SmartAssembly>(
      assemblies.map((a) => [String(a.id), a])
    );

    type Group = {
      id: string;
      node: SmartAssembly | null;
      storage: SmartAssembly[];
      manufacturing: SmartAssembly[];
      turrets: SmartAssembly[];
    };
    const groupMap = new Map<string, Group>();

    for (const n of nodes) {
      const id = String(n.id);
      groupMap.set(id, {
        id,
        node: n,
        storage: [],
        manufacturing: [],
        turrets: [],
      });
    }

    for (const a of assemblies) {
      if (isNetworkNode(a)) continue;
      const nid = getNetworkId(a);
      if (!nid) continue;
      const key = String(nid);
      const grp = groupMap.get(key) ?? {
        id: key,
        node: null,
        storage: [],
        manufacturing: [],
        turrets: [],
      };

      if (isStorage(a)) {
        grp.storage.push(a);
      } else if (isManufacturing(a)) {
        grp.manufacturing.push(a);
      } else if (isTurret(a)) {
        grp.turrets.push(a);
      }

      groupMap.set(key, grp);
    }

    for (const n of nodes) {
      const key = String(n.id);
      const grp = groupMap.get(key) ?? {
        id: key,
        node: n,
        storage: [],
        manufacturing: [],
        turrets: [],
      };
      grp.node = grp.node ?? n;
      const existingIds = new Set([
        ...grp.storage.map((c) => String(c.id)),
        ...grp.manufacturing.map((c) => String(c.id)),
        ...grp.turrets.map((c) => String(c.id)),
      ]);
      const linkedIds = getLinkedAssemblyIds(n);
      for (const id of linkedIds) {
        const child = asmById.get(String(id));
        if (
          child &&
          !existingIds.has(String(child.id)) &&
          !isNetworkNode(child)
        ) {
          if (isStorage(child)) {
            grp.storage.push(child);
          } else if (isManufacturing(child)) {
            grp.manufacturing.push(child);
          } else if (isTurret(child)) {
            grp.turrets.push(child);
          }
          existingIds.add(String(child.id));
        }
      }
      groupMap.set(key, grp);
    }

    const groups: Group[] = Array.from(groupMap.values());
    groups.sort((a, b) => {
      const la = a.node ? getSolarSystem(a.node) : `Network ${a.id}`;
      const lb = b.node ? getSolarSystem(b.node) : `Network ${b.id}`;
      return la.localeCompare(lb);
    });

    return groups;
  }, [assemblies]);

  const error = charError || asmError;

  if (isLoading || showDataDelay) {
    return (
      <div className="p-3">
        <p className="text-foreground-muted text-sm">
          Loading assemblies… (this may take a few seconds)
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <p className="text-error text-sm">Error loading assemblies: {error}</p>
      </div>
    );
  }

  if (!characterId) {
    return (
      <div className="p-3">
        <p className="text-foreground-muted text-sm">
          No character found. Please ensure your wallet is connected to a
          character in-game.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {/* Refresh All Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleRefreshAll}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-background-lighter hover:bg-background-hover border-2 transition-colors disabled:opacity-50"
          style={{ borderColor: "var(--primary)" }}
          title="Refresh all assemblies"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh All</span>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="space-y-3">
          <div className="text-sm text-foreground-muted px-2 py-2">
            No network nodes found. Your assemblies may still be loading.
          </div>
          <button
            onClick={handleRefreshAll}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm bg-background-lighter hover:bg-background-hover border-2 transition-colors"
            style={{ borderColor: "var(--primary)" }}
          >
            <RefreshCw size={16} />
            <span>Try Refreshing</span>
          </button>
        </div>
      ) : (
        groups.map((group) => {
          const isOpen = openNodes.has(group.id);
          const { status, timeText } = group.node
            ? getNodeFuelInfo(group.node)
            : { status: "Unknown", timeText: "-" };
          const systemName = group.node
            ? getSolarSystem(group.node)
            : `Network ${group.id}`;

          const statusColor =
            status === "Online"
              ? "text-green-500"
              : status === "Destroyed"
              ? "text-red-500"
              : "text-foreground-muted";

          return (
            <div
              key={group.id}
              className="border-2 mb-4"
              style={{ borderColor: "var(--primary)" }}
            >
              {/* Network Node Header */}
              <div className="w-full px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => toggleNode(group.id)}
                  className="flex-1 flex items-center justify-between text-left hover:bg-background-lighter transition-colors pr-2"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {systemName}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs ${statusColor}`}>{status}</span>
                    <span className="text-xs text-foreground-muted">
                      Fuel: {timeText}
                    </span>
                    <span className="text-foreground-muted">
                      {isOpen ? "−" : "+"}
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshNode(group.id);
                  }}
                  disabled={refreshingNode === group.id}
                  className="ml-2 p-2 hover:bg-background-lighter transition-colors disabled:opacity-50"
                  title="Refresh this network node"
                >
                  <RefreshCw
                    size={14}
                    className={refreshingNode === group.id ? "animate-spin" : ""}
                  />
                </button>
              </div>

              {isOpen && (
                <div className="px-4 pb-3">
                  {/* Storage Section */}
                  {group.storage.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleCategory(group.id, "storage")}
                        className="w-full flex items-center justify-between px-2 py-2 hover:bg-background-lighter transition-colors"
                      >
                        <div className="text-xs font-semibold text-foreground-muted uppercase">
                          Storage ({group.storage.length})
                        </div>
                        <span className="text-foreground-muted text-xs">
                          {openStorageCategory.has(group.id) ? "−" : "+"}
                        </span>
                      </button>

                      {openStorageCategory.has(group.id) && (
                        <div className="mt-2">
                          {group.storage.map((storage) => {
                            const storageId = String(storage.id);
                            const isStorageOpen =
                              openStorageItems.has(storageId);
                            const { current, max, percentage } =
                              getStorageInfo(storage);
                            const items = getStorageItems(storage);
                            const storageStatus = getAssemblyStatus(storage);
                            const statusColor =
                              storageStatus === "Online"
                                ? "text-green-500"
                                : storageStatus === "Destroyed"
                                ? "text-red-500"
                                : "text-foreground-muted";

                            return (
                              <div key={storageId} className="mb-2">
                                <button
                                  onClick={() => toggleStorageItems(storageId)}
                                  className="w-full flex items-center justify-between px-3 py-2 border-2 hover:bg-background-lighter transition-colors"
                                  style={{
                                    borderColor: "var(--background-lighter)",
                                  }}
                                >
                                  <span className="text-sm text-foreground">
                                    {getTypeName(storage)}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-foreground-muted">
                                      {percentage}% ({current}/{max})
                                    </span>
                                    <span className={`text-xs ${statusColor}`}>
                                      {storageStatus}
                                    </span>
                                  </div>
                                </button>

                                {isStorageOpen && items.length > 0 && (
                                  <div
                                    className="ml-4 mt-1 border-l-2 pl-3 max-h-64 overflow-y-auto"
                                    style={{
                                      borderColor: "var(--background-lighter)",
                                    }}
                                  >
                                    {items.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between py-1 text-xs"
                                      >
                                        <span className="text-foreground">
                                          {item.name}
                                        </span>
                                        <span className="text-foreground-muted">
                                          {item.quantity.toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manufacturing Section */}
                  {group.manufacturing.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() =>
                          toggleCategory(group.id, "manufacturing")
                        }
                        className="w-full flex items-center justify-between px-2 py-2 hover:bg-background-lighter transition-colors"
                      >
                        <div className="text-xs font-semibold text-foreground-muted uppercase">
                          Manufacturing ({group.manufacturing.length})
                        </div>
                        <span className="text-foreground-muted text-xs">
                          {openManufacturingCategory.has(group.id) ? "−" : "+"}
                        </span>
                      </button>

                      {openManufacturingCategory.has(group.id) && (
                        <div className="mt-2">
                          {group.manufacturing.map((mfg) => {
                            const mfgStatus = getAssemblyStatus(mfg);
                            const statusColor =
                              mfgStatus === "Online"
                                ? "text-green-500"
                                : mfgStatus === "Destroyed"
                                ? "text-red-500"
                                : "text-foreground-muted";
                            return (
                              <div
                                key={String(mfg.id)}
                                className="flex items-center justify-between px-3 py-2 border-2 mb-2"
                                style={{
                                  borderColor: "var(--background-lighter)",
                                }}
                              >
                                <span className="text-sm text-foreground">
                                  {getTypeName(mfg)}
                                </span>
                                <span className={`text-xs ${statusColor}`}>
                                  {mfgStatus}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Turrets Section */}
                  {group.turrets.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => toggleCategory(group.id, "turrets")}
                        className="w-full flex items-center justify-between px-2 py-2 hover:bg-background-lighter transition-colors"
                      >
                        <div className="text-xs font-semibold text-foreground-muted uppercase">
                          Turrets ({group.turrets.length})
                        </div>
                        <span className="text-foreground-muted text-xs">
                          {openTurretsCategory.has(group.id) ? "−" : "+"}
                        </span>
                      </button>

                      {openTurretsCategory.has(group.id) && (
                        <div className="mt-2">
                          {group.turrets.map((turret) => {
                            const turretStatus = getAssemblyStatus(turret);
                            const statusColor =
                              turretStatus === "Online"
                                ? "text-green-500"
                                : turretStatus === "Destroyed"
                                ? "text-red-500"
                                : "text-foreground-muted";
                            return (
                              <div
                                key={String(turret.id)}
                                className="flex items-center justify-between px-3 py-2 border-2 mb-2"
                                style={{
                                  borderColor: "var(--background-lighter)",
                                }}
                              >
                                <span className="text-sm text-foreground">
                                  {getTypeName(turret)}
                                </span>
                                <span className={`text-xs ${statusColor}`}>
                                  {turretStatus}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {group.storage.length === 0 &&
                    group.manufacturing.length === 0 &&
                    group.turrets.length === 0 && (
                      <div className="text-sm text-foreground-muted px-2 py-2 mt-2">
                        No assemblies attached to this network node
                      </div>
                    )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default SmartAssembliesTab;
