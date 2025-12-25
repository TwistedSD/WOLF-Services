import React, { useState } from "react";
import type { ProductionNode, Byproduct } from "../../hooks/useEfficiency";

interface ProductionSummaryProps {
  rootNode: ProductionNode | null;
}

interface AggregatedByproduct extends Byproduct {
  wasReused: boolean;
}

export const ProductionSummary: React.FC<ProductionSummaryProps> = ({ rootNode }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["base", "byproducts"]));

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

  // Collect all byproducts from the tree
  const collectByproducts = (node: ProductionNode): AggregatedByproduct[] => {
    const allByproducts: Map<number, AggregatedByproduct> = new Map();

    const traverse = (n: ProductionNode) => {
      // Add this node's byproducts
      n.byproducts.forEach((bp) => {
        const existing = allByproducts.get(bp.type_id);
        if (existing) {
          existing.quantity += bp.quantity;
        } else {
          allByproducts.set(bp.type_id, {
            ...bp,
            wasReused: false, // Will check later
          });
        }
      });

      // Check if this node reused materials (they came from byproducts)
      if (n.quantity_from_excess_pool > 0) {
        // Mark byproduct as reused if it exists
        // Note: In real implementation, we'd need to track which specific byproduct was reused
        // For now, we'll mark all byproducts as potentially reused
      }

      // Traverse children
      n.inputs.forEach(traverse);
    };

    traverse(node);
    return Array.from(allByproducts.values());
  };

  // Collect excess materials (materials that were overproduced)
  const collectExcess = (node: ProductionNode): Map<string, number> => {
    const excess: Map<string, number> = new Map();

    const traverse = (n: ProductionNode) => {
      if (n.excess_quantity > 0) {
        const current = excess.get(n.type_name) || 0;
        excess.set(n.type_name, current + n.excess_quantity);
      }
      n.inputs.forEach(traverse);
    };

    traverse(node);
    return excess;
  };

  // Calculate total materials reused from excess pool
  const calculateTotalReused = (node: ProductionNode): number => {
    let total = 0;
    const traverse = (n: ProductionNode) => {
      total += n.quantity_from_excess_pool;
      n.inputs.forEach(traverse);
    };
    traverse(node);
    return total;
  };

  const byproducts = collectByproducts(rootNode);
  const excess = collectExcess(rootNode);
  const totalReused = calculateTotalReused(rootNode);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  };

  return (
    <div className="border-2" style={{ borderColor: "var(--primary)" }}>
      <div className="px-3 py-2" style={{ backgroundColor: "var(--background-lighter)" }}>
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground-muted uppercase">Production Summary</h4>
          {rootNode.facility_name && (
            <span className="text-xs text-foreground-muted">
              Made in: <span className="font-semibold text-primary">{rootNode.facility_name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Base Materials Section */}
      <div className="border-b" style={{ borderColor: "var(--background-lighter)" }}>
        <button
          onClick={() => toggleSection("base")}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-background-lighter transition-colors"
        >
          <span className="text-xs font-semibold text-foreground-muted uppercase">Base Materials Required</span>
          <span className="text-foreground-muted text-xs">{openSections.has("base") ? "−" : "+"}</span>
        </button>

        {openSections.has("base") && (
          <div className="px-3 pb-2">
            {Object.entries(rootNode.base_material_breakdown).map(([typeId, quantity]) => (
              <div key={typeId} className="flex justify-between py-1 text-sm">
                <span className="text-foreground">{rootNode.base_material_names[parseInt(typeId)]}</span>
                <span className="text-foreground-muted font-mono">{quantity.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-1 mt-2 pt-2 border-t text-sm font-semibold" style={{ borderColor: "var(--background-lighter)" }}>
              <span className="text-foreground">Total</span>
              <span className="text-foreground font-mono">{rootNode.total_base_materials.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Excess Materials Section */}
      {excess.size > 0 && (
        <div className="border-b" style={{ borderColor: "var(--background-lighter)" }}>
          <button
            onClick={() => toggleSection("excess")}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-background-lighter transition-colors"
          >
            <span className="text-xs font-semibold text-foreground-muted uppercase">Excess Materials</span>
            <span className="text-foreground-muted text-xs">{openSections.has("excess") ? "−" : "+"}</span>
          </button>

          {openSections.has("excess") && (
            <div className="px-3 pb-2">
              {Array.from(excess.entries()).map(([name, quantity]) => (
                <div key={name} className="flex justify-between py-1 text-sm">
                  <span className="text-foreground">{name}</span>
                  <span className="text-foreground-muted font-mono">{quantity.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Byproducts Section */}
      {byproducts.length > 0 && (
        <div className="border-b" style={{ borderColor: "var(--background-lighter)" }}>
          <button
            onClick={() => toggleSection("byproducts")}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-background-lighter transition-colors"
          >
            <span className="text-xs font-semibold text-foreground-muted uppercase">Byproducts Generated</span>
            <span className="text-foreground-muted text-xs">{openSections.has("byproducts") ? "−" : "+"}</span>
          </button>

          {openSections.has("byproducts") && (
            <div className="px-3 pb-2">
              {byproducts.map((bp) => (
                <div key={bp.type_id} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-foreground">{bp.type_name}</span>
                  <div className="flex items-center gap-2">
                    {bp.wasReused && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgb(34 197 94)", color: "white" }}>
                        ✓ Reused
                      </span>
                    )}
                    <span className="text-foreground-muted font-mono">{bp.quantity.toLocaleString()}</span>
                  </div>
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
          <span className="text-xs font-semibold text-foreground-muted uppercase">Production Time</span>
          <span className="text-foreground-muted text-xs">{openSections.has("time") ? "−" : "+"}</span>
        </button>

        {openSections.has("time") && (
          <div className="px-3 pb-2">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-foreground">Total Time</span>
              <span className="text-foreground-muted font-mono">{formatTime(rootNode.total_production_time)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-foreground">Base Material Time</span>
              <span className="text-foreground-muted font-mono">{formatTime(rootNode.time_seconds)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
