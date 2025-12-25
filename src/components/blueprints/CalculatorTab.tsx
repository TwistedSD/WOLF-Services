import React, { useState } from "react";
import { useAssemblies, useBlueprints, type Blueprint } from "../../hooks/useBlueprints";
import { useProductionCalculator, useBlueprintOptions } from "../../hooks/useEfficiency";
import { EnhancedMaterialRow } from "./EnhancedMaterialRow";
import { ProductionSummary } from "./ProductionSummary";

interface CalculatorTabProps {
  walletAddress: string | null;
}

export const CalculatorTab: React.FC<CalculatorTabProps> = () => {
  const { assemblies, isLoading: loadingAssemblies, error: assembliesError } = useAssemblies();
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [blueprintOverrides, setBlueprintOverrides] = useState<{ [typeId: number]: number }>({});

  const { blueprints, isLoading: loadingBlueprints, error: blueprintsError } = useBlueprints(selectedFacilityId);
  const { result, isLoading: loadingCalculation, error: calculationError } = useProductionCalculator(
    selectedBlueprint?.primary_type_id || null,
    quantity,
    blueprintOverrides
  );

  const handleBlueprintChange = (typeId: number, blueprintId: number) => {
    setBlueprintOverrides((prev) => ({
      ...prev,
      [typeId]: blueprintId,
    }));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(Math.max(1, value));
  };

  const handleBlueprintSelect = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    setBlueprintOverrides({}); // Reset overrides when changing blueprint
    setQuantity(1); // Reset quantity
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Assembly Types List */}
      <div className="w-64 border-2 overflow-y-auto" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        <div className="px-3 py-2 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-lighter)" }}>
          <h3 className="text-sm font-semibold text-foreground">Assembly Types</h3>
        </div>
        {assembliesError ? (
          <div className="p-3 text-sm text-error">{assembliesError}</div>
        ) : loadingAssemblies ? (
          <div className="p-3 text-sm text-foreground-muted">Loading...</div>
        ) : (
          <div>
            {assemblies.map((facility) => (
              <button
                key={facility.facility_type_id}
                onClick={() => {
                  setSelectedFacilityId(facility.facility_type_id);
                  setSelectedBlueprint(null);
                }}
                className={`w-full px-3 py-2 text-left text-sm border-b transition-colors ${
                  selectedFacilityId === facility.facility_type_id
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-background-lighter"
                }`}
                style={{ borderColor: "var(--background-lighter)" }}
              >
                {facility.facility_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Blueprints List */}
      <div className="w-64 border-2 overflow-y-auto" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        <div className="px-3 py-2 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-lighter)" }}>
          <h3 className="text-sm font-semibold text-foreground">Blueprints</h3>
        </div>
        {!selectedFacilityId ? (
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
                onClick={() => handleBlueprintSelect(blueprint)}
                className={`w-full px-3 py-2 text-left text-sm border-b transition-colors ${
                  selectedBlueprint?.blueprint_id === blueprint.blueprint_id
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-background-lighter"
                }`}
                style={{ borderColor: "var(--background-lighter)" }}
              >
                {blueprint.primary_type_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Production Calculator */}
      <div className="flex-1 border-2 overflow-y-auto" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        {!selectedBlueprint ? (
          <div className="p-6 text-center text-foreground-muted">
            Select a blueprint to calculate production requirements
          </div>
        ) : (
          <div>
            {/* Header with Quantity Input */}
            <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-lighter)" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedBlueprint.primary_type_name}
                </h3>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-foreground-muted">Quantity:</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={handleQuantityChange}
                    min="1"
                    className="w-24 px-2 py-1 text-sm border rounded text-foreground"
                    style={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--primary)",
                    }}
                  />
                </div>
              </div>
            </div>

            {calculationError ? (
              <div className="p-6 text-center text-error">
                Error: {calculationError}
              </div>
            ) : loadingCalculation ? (
              <div className="p-6 text-center text-foreground-muted">
                Calculating production tree...
              </div>
            ) : result ? (
              <>
                {/* Production Tree */}
                <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
                  <div className="px-3 py-2" style={{ backgroundColor: "var(--background-lighter)" }}>
                    <h4 className="text-xs font-semibold text-foreground-muted uppercase">Production Tree</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <EnhancedMaterialRow
                      node={result}
                      depth={0}
                      onBlueprintChange={handleBlueprintChange}
                    />
                  </div>
                </div>

                {/* Production Summary */}
                <ProductionSummary rootNode={result} />
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculatorTab;
