import React, { useState } from "react";
import { useAssemblies, useBlueprints, useBlueprintDetails, type Material } from "../../hooks/useBlueprints";

interface BlueprintsTabProps {
  walletAddress: string | null;
}

interface MaterialRowProps {
  material: Material;
  depth: number;
}

const MaterialRow: React.FC<MaterialRowProps> = ({ material, depth }) => {
  const [isExpanded, setIsExpanded] = useState(depth === 0);

  return (
    <div className="border-b" style={{ borderColor: "var(--background-lighter)" }}>
      <div
        className="flex items-center justify-between py-2 px-3 hover:bg-background-lighter transition-colors"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-foreground">{material.type_name}</span>
        </div>

        <span className="text-xs text-foreground-muted w-16 text-right">
          {material.quantity.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export const BlueprintsTab: React.FC<BlueprintsTabProps> = () => {
  const { assemblies, isLoading: loadingAssemblies, error: assembliesError } = useAssemblies();
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<number | null>(null);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<number | null>(null);

  const { blueprints, isLoading: loadingBlueprints, error: blueprintsError } = useBlueprints(selectedAssemblyId);
  const { details, isLoading: loadingDetails, error: detailsError } = useBlueprintDetails(selectedBlueprintId);

  // Calculate base materials from materials (inputs)
  const baseMaterials: Record<string, number> = {};
  if (details?.materials) {
    details.materials.forEach((material) => {
      baseMaterials[material.type_name] = material.quantity;
    });
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Assembly Types List */}
      <div className="w-64 border-2 overflow-y-auto" style={{ borderColor: "var(--primary)" }}>
        <div className="px-3 py-2 border-b-2 bg-background" style={{ borderColor: "var(--primary)" }}>
          <h3 className="text-sm font-semibold text-foreground">Assembly Types</h3>
        </div>
        {assembliesError ? (
          <div className="p-3 text-sm text-error">{assembliesError}</div>
        ) : loadingAssemblies ? (
          <div className="p-3 text-sm text-foreground-muted">Loading...</div>
        ) : (
          <div>
            {assemblies.map((assembly) => (
              <button
                key={assembly.type_id}
                onClick={() => {
                  setSelectedAssemblyId(assembly.type_id);
                  setSelectedBlueprintId(null);
                }}
                className={`w-full px-3 py-2 text-left text-sm border-b transition-colors ${
                  selectedAssemblyId === assembly.type_id
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-background-lighter"
                }`}
                style={{ borderColor: "var(--background-lighter)" }}
              >
                {assembly.type_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Blueprints List */}
      <div className="w-64 border-2 overflow-y-auto" style={{ borderColor: "var(--primary)" }}>
        <div className="px-3 py-2 border-b-2 bg-background" style={{ borderColor: "var(--primary)" }}>
          <h3 className="text-sm font-semibold text-foreground">Blueprints</h3>
        </div>
        {!selectedAssemblyId ? (
          <div className="p-3 text-sm text-foreground-muted">
            Select an assembly type
          </div>
        ) : blueprintsError ? (
          <div className="p-3 text-sm text-error">{blueprintsError}</div>
        ) : loadingBlueprints ? (
          <div className="p-3 text-sm text-foreground-muted">Loading...</div>
        ) : (
          <div>
            {blueprints.map((blueprint) => (
              <button
                key={blueprint.blueprint_id}
                onClick={() => setSelectedBlueprintId(blueprint.blueprint_id)}
                className={`w-full px-3 py-2 text-left text-sm border-b transition-colors ${
                  selectedBlueprintId === blueprint.blueprint_id
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-background-lighter"
                }`}
                style={{ borderColor: "var(--background-lighter)" }}
              >
                {blueprint.product_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Blueprint Details */}
      <div className="flex-1 border-2 overflow-y-auto" style={{ borderColor: "var(--primary)" }}>
        {!selectedBlueprintId ? (
          <div className="p-6 text-center text-foreground-muted">
            Select a blueprint to view details
          </div>
        ) : detailsError ? (
          <div className="p-6 text-center text-error">{detailsError}</div>
        ) : loadingDetails ? (
          <div className="p-6 text-center text-foreground-muted">Loading...</div>
        ) : details ? (
          <div>
            <div className="px-4 py-3 border-b-2 bg-background" style={{ borderColor: "var(--primary)" }}>
              <h3 className="text-lg font-semibold text-foreground">
                {details.products && details.products.length > 0 ? details.products[0].type_name : "Blueprint"}
              </h3>
              <p className="text-xs text-foreground-muted mt-1">
                Production Time: {formatDuration(details.time_seconds)}
              </p>
            </div>

            {/* Input Materials */}
            {details.materials.length > 0 && (
              <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
                <div className="px-3 py-2 bg-background-lighter">
                  <h4 className="text-xs font-semibold text-foreground-muted uppercase">Input Materials</h4>
                </div>
                {details.materials.map((material, idx) => (
                  <MaterialRow key={idx} material={material} depth={0} />
                ))}
              </div>
            )}

            {/* Output Materials */}
            {details.products.length > 0 && (
              <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
                <div className="px-3 py-2 bg-background-lighter">
                  <h4 className="text-xs font-semibold text-foreground-muted uppercase">Output Materials</h4>
                </div>
                {details.products.map((material, idx) => (
                  <MaterialRow key={idx} material={material} depth={0} />
                ))}
              </div>
            )}

            {/* Base Materials Summary */}
            <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
              <div className="px-3 py-2 bg-background-lighter">
                <h4 className="text-xs font-semibold text-foreground-muted uppercase">Base Materials Required</h4>
              </div>
              <div className="p-3">
                {Object.entries(baseMaterials).map(([name, quantity]) => (
                  <div key={name} className="flex justify-between py-1 text-sm">
                    <span className="text-foreground">{name}</span>
                    <span className="text-foreground-muted">{quantity.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leftover Materials */}
            <div>
              <div className="px-3 py-2 bg-background-lighter">
                <h4 className="text-xs font-semibold text-foreground-muted uppercase">Leftover Materials</h4>
              </div>
              <div className="p-3 text-sm text-foreground-muted">
                No leftovers calculated
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BlueprintsTab;
