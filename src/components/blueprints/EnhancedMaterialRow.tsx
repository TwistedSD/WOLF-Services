import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { ProductionNode, BlueprintOptionSimple, Byproduct } from "../../hooks/useEfficiency";

interface EnhancedMaterialRowProps {
  node: ProductionNode;
  depth: number;
  onBlueprintChange?: (typeId: number, blueprintId: number) => void;
  blueprintOptions?: BlueprintOptionSimple[];
}

export const EnhancedMaterialRow: React.FC<EnhancedMaterialRowProps> = ({
  node,
  depth,
  onBlueprintChange,
  blueprintOptions = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const [showByproducts, setShowByproducts] = useState(false);

  const indent = depth * 24;
  const isBaseMaterial = node.inputs.length === 0 && node.blueprint_id === null;
  const hasExcessReuse = node.quantity_from_excess_pool > 0;
  const hasByproducts = node.byproducts.length > 0;
  const hasAlternatives = node.alternative_blueprints > 1;

  return (
    <div>
      {/* Main Material Row */}
      <div
        className="flex items-center gap-2 py-2 px-3 border-b hover:bg-background-lighter transition-colors"
        style={{
          marginLeft: `${indent}px`,
          borderColor: "var(--background-lighter)",
        }}
      >
        {/* Expand/Collapse Button */}
        {!isBaseMaterial ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold text-primary hover:bg-background-lighter"
            title="Expand/collapse production tree"
          >
            {isExpanded ? "−" : "+"}
          </button>
        ) : (
          <div className="w-5 h-5 flex items-center justify-center">
            <span className="text-secondary text-xs">●</span>
          </div>
        )}

        {/* Material Name & Badges */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-foreground">{node.type_name}</span>

          {isBaseMaterial && (
            <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: "var(--secondary)", color: "var(--background)" }}>
              BASE
            </span>
          )}

          {hasExcessReuse && (
            <span className="text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1" style={{ backgroundColor: "rgb(34 197 94)", color: "white" }}
              title={`${node.quantity_from_excess_pool} units reused from byproducts/excess`}
            >
              <RotateCcw size={10} />
              {node.quantity_from_excess_pool}
            </span>
          )}

          {hasByproducts && (
            <button
              onClick={() => setShowByproducts(!showByproducts)}
              className="text-xs px-2 py-0.5 rounded font-semibold hover:opacity-80"
              style={{ backgroundColor: "rgb(59 130 246)", color: "white" }}
              title="View byproducts"
            >
              +{node.byproducts.length} BP
            </button>
          )}
        </div>

        {/* Blueprint Selector */}
        {hasAlternatives && isExpanded && onBlueprintChange && blueprintOptions.length > 0 && (
          <select
            value={node.blueprint_id || ""}
            onChange={(e) => onBlueprintChange(node.type_id, parseInt(e.target.value))}
            className="text-xs px-2 py-1 rounded border text-foreground"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--primary)",
            }}
            title="Select blueprint"
          >
            {blueprintOptions.map((opt) => (
              <option key={opt.blueprint_id} value={opt.blueprint_id}>
                Output: {opt.output_quantity} ({opt.time_seconds}s)
              </option>
            ))}
          </select>
        )}

        {/* Quantity Display */}
        <div className="flex items-center gap-2">
          {node.excess_quantity > 0 && (
            <span className="text-xs text-foreground-muted" title="Excess produced">
              (+{node.excess_quantity})
            </span>
          )}
          <span className="text-xs text-foreground-muted font-mono w-20 text-right">
            {node.quantity_needed.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Byproducts Expansion */}
      {showByproducts && hasByproducts && (
        <div
          className="border-l-2 ml-6 pl-3 py-1"
          style={{
            marginLeft: `${indent + 24}px`,
            borderColor: "rgb(59 130 246 / 0.3)",
            backgroundColor: "rgb(59 130 246 / 0.05)",
          }}
        >
          <div className="text-xs font-semibold text-foreground-muted mb-1">Byproducts:</div>
          {node.byproducts.map((bp: Byproduct, idx: number) => (
            <div key={idx} className="flex justify-between text-xs py-0.5">
              <span className="text-foreground">{bp.type_name}</span>
              <span className="text-foreground-muted">{bp.quantity.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recursive Children */}
      {isExpanded &&
        node.inputs.map((child, idx) => (
          <EnhancedMaterialRow
            key={`${child.type_id}-${idx}`}
            node={child}
            depth={depth + 1}
            onBlueprintChange={onBlueprintChange}
          />
        ))}
    </div>
  );
};
