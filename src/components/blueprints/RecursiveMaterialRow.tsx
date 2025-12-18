import React from "react";
import type { BlueprintOption } from "../../hooks/useBlueprints";

export interface RecursiveMaterial {
  type_id: number;
  type_name: string;
  quantity: number;
  icon_id: number | null;
  icon_file: string | null;
  depth: number;
  isExpanded: boolean;
  isBaseMaterial: boolean;
  selectedBlueprintId: number | null;
  selectedFacilityId: number | null;
  selectedFacilityName: string | null;
  availableBlueprints: BlueprintOption[];
  children: RecursiveMaterial[];
  isLoading?: boolean;
}

interface RecursiveMaterialRowProps {
  material: RecursiveMaterial;
  onExpand: (typeId: number) => void;
  onBlueprintChange: (typeId: number, blueprintId: number) => void;
}

export const RecursiveMaterialRow: React.FC<RecursiveMaterialRowProps> = ({
  material,
  onExpand,
  onBlueprintChange,
}) => {
  const indent = material.depth * 24;
  const canExpand = !material.isBaseMaterial;
  const hasBlueprints = material.availableBlueprints.length > 0;

  return (
    <div>
      {/* Material Header */}
      <div
        className="flex items-center gap-2 py-2 px-3 border-b hover:bg-background-lighter transition-colors"
        style={{
          marginLeft: `${indent}px`,
          borderColor: "var(--background-lighter)",
        }}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={() => onExpand(material.type_id)}
          disabled={material.isBaseMaterial}
          className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${
            material.isBaseMaterial
              ? "text-foreground-muted cursor-not-allowed"
              : "text-primary hover:bg-background-lighter cursor-pointer"
          }`}
          title={material.isBaseMaterial ? "Base material (cannot expand)" : "Expand/collapse"}
        >
          {material.isLoading ? (
            <span className="text-foreground-muted">...</span>
          ) : material.isBaseMaterial ? (
            <span className="text-secondary">●</span>
          ) : material.isExpanded ? (
            "−"
          ) : (
            "+"
          )}
        </button>

        {/* Material Name */}
        <span className="flex-1 text-sm text-foreground">
          {material.type_name}
          {material.isBaseMaterial && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-secondary text-background font-semibold">
              BASE
            </span>
          )}
        </span>

        {/* Blueprint/Facility Selector (if expanded and has options) */}
        {material.isExpanded && hasBlueprints && (
          <select
            value={material.selectedBlueprintId || ""}
            onChange={(e) => onBlueprintChange(material.type_id, parseInt(e.target.value))}
            className="text-xs px-2 py-1 rounded border text-foreground"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--primary)",
            }}
          >
            {material.availableBlueprints.map((bp) => (
              <option key={bp.blueprint_id} value={bp.blueprint_id}>
                {bp.facility_name} ({bp.run_time}s)
              </option>
            ))}
          </select>
        )}

        {/* Quantity */}
        <span className="text-xs text-foreground-muted font-mono w-24 text-right">
          {material.quantity.toLocaleString()}
        </span>
      </div>

      {/* Recursive Children */}
      {material.isExpanded &&
        material.children.map((child, idx) => (
          <RecursiveMaterialRow
            key={`${child.type_id}-${idx}`}
            material={child}
            onExpand={onExpand}
            onBlueprintChange={onBlueprintChange}
          />
        ))}
    </div>
  );
};
