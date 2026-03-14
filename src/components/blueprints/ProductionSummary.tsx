import React, { useState } from "react";
import type { ProductionNode, Byproduct } from "../../hooks/useEfficiency";

interface ProductionSummaryProps {
  rootNode: ProductionNode;
}

interface AggregatedByproduct extends Byproduct {
  wasReused: boolean;
}

export const ProductionSummary: React.FC<ProductionSummaryProps> = ({
  rootNode,
}) => {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["base", "excess"]),
  );

  if (!rootNode) return null;

  const toggleSection = (section: string) => {
    const newSet = new Set(openSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setOpenSections(newSet);
  };

  // Collect all excess materials (both byproducts and overproduction) from production tree
  const collectAllExcess = (node: ProductionNode): Map<string, number> => {
    const allExcess: Map<string, number> = new Map();

    const traverse = (n: ProductionNode) => {
      // Add overproduced materials (excess from this production step)
      if (n.excess_quantity > 0) {
        const current = allExcess.get(n.type_name) || 0;
        allExcess.set(n.type_name, current + n.excess_quantity);
      }

      // Add byproducts
      if (n.byproducts) {
        n.byproducts.forEach((bp) => {
          const current = allExcess.get(bp.type_name) || 0;
          allExcess.set(bp.type_name, current + bp.quantity);
        });
      }

      // Traverse children
      n.inputs?.forEach(traverse);
    };

    traverse(node);
    return allExcess;
  };

  // Aggregate base materials from production tree
  const aggregateBaseMaterials = (
    node: ProductionNode,
  ): { breakdown: { [name: string]: number }; total: number } => {
    const breakdown: { [name: string]: number } = {};
    let total = 0;

    // Use the base_material_breakdown directly from the root node
    if (node.base_material_names && node.base_material_breakdown) {
      Object.entries(node.base_material_names).forEach(([typeId, name]) => {
        const quantity = node.base_material_breakdown[parseInt(typeId)] || 0;
        breakdown[name] = (breakdown[name] || 0) + quantity;
        total += quantity;
      });
    }

    return { breakdown, total };
  };

  // Aggregate production times
  const aggregateProductionTime = (node: ProductionNode): number => {
    return node.total_production_time || 0;
  };

  const allExcess = collectAllExcess(rootNode);
  const { breakdown: baseMaterialBreakdown, total: totalBaseMaterials } =
    aggregateBaseMaterials(rootNode);
  const totalProductionTime = aggregateProductionTime(rootNode);

  const formatTime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(" ");
  };

  return (
    <div className="border-2" style={{ borderColor: "var(--primary)" }}>
      <div
        className="px-3 py-2"
        style={{ backgroundColor: "var(--background-lighter)" }}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground-muted uppercase">
            Production Summary
          </h4>
        </div>
      </div>

      {/* Base Materials Section */}
      <div
        className="border-b"
        style={{ borderColor: "var(--background-lighter)" }}
      >
        <button
          onClick={() => toggleSection("base")}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-background-lighter transition-colors"
        >
          <span className="text-xs font-semibold text-foreground-muted uppercase">
            Base Materials Required
          </span>
          <span className="text-foreground-muted text-xs">
            {openSections.has("base") ? "−" : "+"}
          </span>
        </button>

        {openSections.has("base") && (
          <div className="px-3 pb-2">
            {Object.entries(baseMaterialBreakdown).map(([name, quantity]) => (
              <div key={name} className="flex justify-between py-1 text-sm">
                <span className="text-foreground">{name}</span>
                <span className="text-foreground-muted font-mono">
                  {quantity.toLocaleString()}
                </span>
              </div>
            ))}
            <div
              className="flex justify-between py-1 mt-2 pt-2 border-t text-sm font-semibold"
              style={{ borderColor: "var(--background-lighter)" }}
            >
              <span className="text-foreground">Total</span>
              <span className="text-foreground font-mono">
                {totalBaseMaterials.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Excess Materials Section (includes both byproducts and overproduction) */}
      {allExcess.size > 0 && (
        <div
          className="border-b"
          style={{ borderColor: "var(--background-lighter)" }}
        >
          <button
            onClick={() => toggleSection("excess")}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-background-lighter transition-colors"
          >
            <span className="text-xs font-semibold text-foreground-muted uppercase">
              Excess Materials
            </span>
            <span className="text-foreground-muted text-xs">
              {openSections.has("excess") ? "−" : "+"}
            </span>
          </button>

          {openSections.has("excess") && (
            <div className="px-3 pb-2">
              {Array.from(allExcess.entries()).map(([name, quantity]) => (
                <div key={name} className="flex justify-between py-1 text-sm">
                  <span className="text-foreground">{name}</span>
                  <span className="text-foreground-muted font-mono">
                    {quantity.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Production Time Section */}
      <div>
        <button
          onClick={() => toggleSection("time")}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-background-lighter transition-colors"
        >
          <span className="text-xs font-semibold text-foreground-muted uppercase">
            Production Time
          </span>
          <span className="text-foreground-muted text-xs">
            {openSections.has("time") ? "−" : "+"}
          </span>
        </button>

        {openSections.has("time") && (
          <div className="px-3 pb-2">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-foreground">Total Time (parallel)</span>
              <span className="text-foreground-muted font-mono">
                {formatTime(totalProductionTime)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
