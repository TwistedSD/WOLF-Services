import React, { useState } from "react";
import { useAssemblies, useBlueprints, useBlueprintDetails, type Material } from "../../hooks/useBlueprints";
import { useProductionCalculator } from "../../hooks/useEfficiency";
import { EnhancedMaterialRow } from "./EnhancedMaterialRow";
import { ProductionSummary } from "./ProductionSummary";

interface BlueprintsTabProps {
  walletAddress: string | null;
}

interface MaterialRowProps {
  material: Material;
  depth: number;
}

const MaterialRow: React.FC<MaterialRowProps> = ({ material, depth }) => {
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
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<number | null>(null);
  const [runs, setRuns] = useState<number>(1);
  const [blueprintOverrides, setBlueprintOverrides] = useState<{ [typeId: number]: number }>({});

  const { blueprints, isLoading: loadingBlueprints, error: blueprintsError } = useBlueprints(selectedFacilityId);

  // Fetch blueprint details to show raw inputs/outputs
  const { details: blueprintDetails, isLoading: loadingDetails, error: detailsError } = useBlueprintDetails(selectedBlueprintId);

  // Get the primary output type from the blueprint to calculate production for
  const selectedBlueprint = blueprints.find(b => b.blueprint_id === selectedBlueprintId);

  // Calculate production tree for the blueprint's output
  const { result: productionResult, isLoading: loadingProduction } = useProductionCalculator(
    selectedBlueprint?.primary_type_id || null,
    runs,
    blueprintOverrides
  );

  const handleBlueprintSelect = (blueprintId: number) => {
    setSelectedBlueprintId(blueprintId);
    setRuns(1); // Reset runs
    setBlueprintOverrides({}); // Reset overrides
  };

  const handleRunsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setRuns(Math.max(1, value));
  };

  const handleBlueprintChange = (typeId: number, blueprintId: number) => {
    setBlueprintOverrides((prev) => ({
      ...prev,
      [typeId]: blueprintId,
    }));
  };

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
                  setSelectedBlueprintId(null);
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
                onClick={() => handleBlueprintSelect(blueprint.blueprint_id)}
                className={`w-full px-3 py-2 text-left text-sm border-b transition-colors ${
                  selectedBlueprintId === blueprint.blueprint_id
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

      {/* Blueprint Details */}
      <div className="flex-1 border-2 overflow-y-auto" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        {!selectedBlueprintId ? (
          <div className="p-6 text-center text-foreground-muted">
            Select a blueprint to view details
          </div>
        ) : (
          <div>
            {/* Header with Quantity Input */}
            <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-lighter)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {blueprints.find(b => b.blueprint_id === selectedBlueprintId)?.primary_type_name}
                  </h3>
                  {blueprintDetails && (
                    <p className="text-xs text-foreground-muted mt-1">
                      Production Time: {formatDuration(blueprintDetails.run_time)} per run
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-foreground-muted">Runs:</label>
                  <input
                    type="number"
                    value={runs}
                    onChange={handleRunsChange}
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

            {detailsError ? (
              <div className="p-6 text-center text-error">
                Error loading blueprint details: {detailsError}
              </div>
            ) : loadingDetails ? (
              <div className="p-6 text-center text-foreground-muted">
                Loading blueprint details...
              </div>
            ) : blueprintDetails ? (
              <>
                {/* Outputs */}
                <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
                  <div className="px-3 py-2" style={{ backgroundColor: "var(--background-lighter)" }}>
                    <h4 className="text-xs font-semibold text-foreground-muted uppercase">Outputs (per run)</h4>
                  </div>
                  {blueprintDetails.outputs.map((output) => (
                    <MaterialRow
                      key={output.type_id}
                      material={{
                        ...output,
                        quantity: output.quantity * runs
                      }}
                      depth={0}
                    />
                  ))}
                </div>

                {/* Inputs - Production Tree */}
                {blueprintDetails.inputs.length > 0 && (
                  <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
                    <div className="px-3 py-2" style={{ backgroundColor: "var(--background-lighter)" }}>
                      <h4 className="text-xs font-semibold text-foreground-muted uppercase">Input Materials</h4>
                    </div>
                    {loadingProduction ? (
                      <div className="p-6 text-center text-foreground-muted">
                        Calculating production tree...
                      </div>
                    ) : productionResult && productionResult.inputs.length > 0 ? (
                      productionResult.inputs.map((input, index) => (
                        <EnhancedMaterialRow
                          key={`${input.type_id}-${index}`}
                          node={input}
                          depth={0}
                          onBlueprintChange={handleBlueprintChange}
                        />
                      ))
                    ) : (
                      blueprintDetails.inputs.map((input) => (
                        <MaterialRow
                          key={input.type_id}
                          material={{
                            ...input,
                            quantity: input.quantity * runs
                          }}
                          depth={0}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Production Summary */}
                {productionResult && <ProductionSummary result={productionResult} />}

                {/* Blueprint Info */}
                <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
                  <div className="px-3 py-2" style={{ backgroundColor: "var(--background-lighter)" }}>
                    <h4 className="text-xs font-semibold text-foreground-muted uppercase">Blueprint Info</h4>
                  </div>
                  <div className="px-3 py-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-foreground-muted">Time per run:</span>
                      <span className="text-foreground font-mono">{formatDuration(blueprintDetails.run_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground-muted">Total time ({runs} runs):</span>
                      <span className="text-foreground font-mono">{formatDuration(blueprintDetails.run_time * runs)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground-muted">Max input capacity:</span>
                      <span className="text-foreground font-mono">{blueprintDetails.max_input_capacity.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlueprintsTab;
