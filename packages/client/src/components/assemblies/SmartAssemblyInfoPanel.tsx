import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { SmartAssembly } from "@/hooks/useSmartAssemblies";
import { Separator } from "@/components/ui/Separator";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

type Props = {
  assemblies: SmartAssembly[];
};

function field(a: any, paths: string[]): string | undefined {
  for (const p of paths) {
    const parts = p.split(".");
    let cur: any = a;
    for (const key of parts) {
      if (cur == null) {
        cur = undefined;
        break;
      }
      cur = cur[key as keyof typeof cur];
    }
    if (cur != null) return String(cur);
  }
  return undefined;
}

const SmartAssemblyInfoPanel: React.FC<Props> = ({ assemblies }) => {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("smartObjectId");
  const selected = assemblies.find(
    (a) => String(a.id) === String(selectedId ?? "")
  );

  const onClose = useCallback(() => {
    if (params.has("smartObjectId")) {
      params.delete("smartObjectId");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  if (!selected) return null;

  const type =
    field(selected, [
      "typeDetails.name",
      "assemblyType",
      "smartAssemblyType",
      "type.name",
      "type",
      "metadata.type",
      "metadata.name",
      "entityRecord.typeName",
    ]) ?? "Assembly";
  const solar =
    field(selected, [
      "solarSystem.name",
      "location.solarSystem.name",
      "location.solarSystemName",
      "solarSystemName",
      "location.solarSystemId",
      "solarSystemId",
    ]) ?? "";
  const owner =
    field(selected, ["owner.address", "owner.id", "owner", "ownerWallet"]) ??
    "";

  // Helper to parse numeric fields from various paths
  const numField = (
    a: any,
    paths: string[],
    fallback?: number
  ): number | undefined => {
    const v = field(a, paths);
    if (v == null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  // Fuel status (Network Node only)
  const MAX_FUEL = 3571;
  const hasNetworkFuel = !!field(selected, [
    "networkNode.fuel.amount",
    "networkNode.fuel.typeId",
  ]);
  const isNetworkNode = /network\s*node/i.test(type) || hasNetworkFuel;
  const burnRateInSec = numField(selected, [
    "networkNode.fuel.burnRateInSec",
    "fuel.burnRateInSec",
    "burnRateInSec",
    "fuel.burnRateSec",
    "burnRateSec",
  ]);
  const fuelAmount = numField(selected, [
    "networkNode.fuel.amount",
    "fuel.amount",
    "fuelAmount",
    "amount",
    "fuel.balance",
  ]);
  const fuelEfficiencyRaw =
    numField(
      selected,
      [
        "networkNode.fuel.efficiency",
        "fuel.efficiency",
        "fuelEfficiency",
        "efficiency",
        "fuel.fuelEfficiency",
      ],
      1
    ) ?? 1;
  // Interpret 10 as 10% (0.10). If <=1 assume already a fraction.
  const fuelEfficiency =
    fuelEfficiencyRaw <= 1 ? fuelEfficiencyRaw : fuelEfficiencyRaw / 100;
  const isBurning =
    field(selected, ["networkNode.burn.isBurning", "burn.isBurning"]) ===
      "true" ||
    field(selected, ["networkNode.burn.isBurning", "burn.isBurning"]) === "1" ||
    field(selected, ["networkNode.burn.isBurning", "burn.isBurning"]) ===
      "true";
  const burnStart = field(selected, [
    "networkNode.burn.startTime",
    "burn.startTime",
  ]);

  const clampedAmount = Math.max(0, Math.min(fuelAmount ?? 0, MAX_FUEL));
  const percent = Math.round((clampedAmount / MAX_FUEL) * 100);
  const perUnitSeconds =
    burnRateInSec != null ? burnRateInSec * fuelEfficiency : undefined;
  const timeRemainingSec =
    perUnitSeconds != null ? clampedAmount * perUnitSeconds : undefined;

  const formatDuration = (s?: number) => {
    if (s == null || !Number.isFinite(s)) return "-";
    const sec = Math.max(0, Math.floor(s));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `<1m`;
  };

  return (
    <div
      className="mt-4 border rounded p-3"
      style={{ borderColor: "var(--primary)" }}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Structure details</div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Close details"
        >
          <X className="size-4" />
        </Button>
      </div>
      <Separator className="my-2" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground">ID</div>
          <div className="font-mono">{String(selected.id)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Type</div>
          <div>{type}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Solar system</div>
          <div>{solar || "-"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Owner</div>
          <div className="font-mono truncate">{owner || "-"}</div>
        </div>
      </div>

      {isNetworkNode && (
        <>
          <Separator className="my-3" />
          <div className="text-sm font-semibold mb-2">Fuel status</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Fuel</div>
              <div>
                {fuelAmount != null
                  ? Math.floor(clampedAmount).toLocaleString()
                  : "-"}
                {` / ${MAX_FUEL.toLocaleString()} (${
                  isFinite(percent) ? percent : 0
                }%)`}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Smart assembly state</div>
              <div>{isBurning ? "Online" : "Offline"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">
                Estimated time remaining
              </div>
              <div>{formatDuration(timeRemainingSec)}</div>
            </div>
          </div>
        </>
      )}

      <Separator className="my-3" />
      <div className="text-xs text-muted-foreground mb-1">Raw data</div>
      <pre className="text-xs bg-background-light p-2 rounded overflow-auto max-h-64">
        {JSON.stringify(selected, null, 2)}
      </pre>
    </div>
  );
};

export default React.memo(SmartAssemblyInfoPanel);
