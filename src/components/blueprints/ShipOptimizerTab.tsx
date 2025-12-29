import React, { useState } from "react";
import { useMultiMaterialOptimizer, type MaterialInput } from "../../hooks/useMultiMaterialOptimizer";

interface ShipMaterial {
  name: string;
  typeId: number;
  quantity: number;
}

// Predefined ship configurations
const SHIP_CONFIGS: { [shipName: string]: ShipMaterial[] } = {
  "MAUL (Complete)": [
    { name: "Packaged Reinforced Alloys", typeId: 84206, quantity: 46 },
    { name: "Packaged Thermal Composites", typeId: 88844, quantity: 28 },
    { name: "Packaged Carbon Weave", typeId: 88842, quantity: 28 },
    { name: "Echo Chamber", typeId: 88780, quantity: 7 },
    { name: "Still Knot", typeId: 88565, quantity: 2 },
    { name: "Apocalypse Protocol Frame", typeId: 78416, quantity: 1 },
  ],
  "MAUL (3 Main)": [
    { name: "Packaged Reinforced Alloys", typeId: 84206, quantity: 46 },
    { name: "Packaged Thermal Composites", typeId: 88844, quantity: 28 },
    { name: "Packaged Carbon Weave", typeId: 88842, quantity: 28 },
  ],
  "Chumaq": [
    { name: "Packaged Reinforced Alloys", typeId: 84206, quantity: 261 },
    { name: "Packaged Thermal Composites", typeId: 88844, quantity: 160 },
    { name: "Packaged Carbon Weave", typeId: 88842, quantity: 160 },
    { name: "Echo Chamber", typeId: 88780, quantity: 40 },
    { name: "Still Knot", typeId: 88565, quantity: 11 },
    { name: "Apocalypse Protocol Frame", typeId: 78416, quantity: 6 },
  ],
  "HAF": [
    { name: "Packaged Reinforced Alloys", typeId: 84206, quantity: 14 },
    { name: "Packaged Thermal Composites", typeId: 88844, quantity: 9 },
    { name: "Packaged Carbon Weave", typeId: 88842, quantity: 9 },
    { name: "Echo Chamber", typeId: 88780, quantity: 2 },
    { name: "Still Knot", typeId: 88565, quantity: 1 },
    { name: "Apocalypse Protocol Frame", typeId: 78416, quantity: 1 },
  ],
  "MCF": [
    { name: "Packaged Reinforced Alloys", typeId: 84206, quantity: 9 },
    { name: "Packaged Thermal Composites", typeId: 88844, quantity: 6 },
    { name: "Packaged Carbon Weave", typeId: 88842, quantity: 6 },
    { name: "Echo Chamber", typeId: 88780, quantity: 1 },
    { name: "Still Knot", typeId: 88565, quantity: 1 },
  ],
};

export const ShipOptimizerTab: React.FC = () => {
  const [selectedShip, setSelectedShip] = useState<string | null>(null);
  const [customMaterials, setCustomMaterials] = useState<MaterialInput[]>([]);
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const { result, isLoading, error, optimize, reset } = useMultiMaterialOptimizer();

  const handleOptimize = () => {
    if (mode === "preset" && selectedShip) {
      const materials = SHIP_CONFIGS[selectedShip].map(m => ({
        typeId: m.typeId,
        quantity: m.quantity,
      }));
      optimize(materials);
    } else if (mode === "custom" && customMaterials.length > 0) {
      optimize(customMaterials);
    }
  };

  const handleAddCustomMaterial = () => {
    setCustomMaterials([...customMaterials, { typeId: 0, quantity: 1 }]);
  };

  const handleRemoveCustomMaterial = (index: number) => {
    setCustomMaterials(customMaterials.filter((_, i) => i !== index));
  };

  const handleCustomMaterialChange = (index: number, field: "typeId" | "quantity", value: number) => {
    const updated = [...customMaterials];
    updated[index][field] = value;
    setCustomMaterials(updated);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Configuration Panel */}
      <div className="w-96 border-2 overflow-y-auto" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        <div className="px-3 py-2 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-lighter)" }}>
          <h3 className="text-sm font-semibold text-foreground">Ship Production Optimizer</h3>
        </div>

        {/* Mode Selection */}
        <div className="p-3 border-b" style={{ borderColor: "var(--background-lighter)" }}>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => { setMode("preset"); reset(); }}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                mode === "preset" ? "bg-primary text-white" : "bg-background-lighter text-foreground"
              }`}
            >
              Preset Ships
            </button>
            <button
              onClick={() => { setMode("custom"); reset(); }}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                mode === "custom" ? "bg-primary text-white" : "bg-background-lighter text-foreground"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Preset Ships Mode */}
        {mode === "preset" && (
          <div className="p-3">
            <h4 className="text-xs font-semibold text-foreground-muted mb-2">SELECT SHIP</h4>
            <div className="space-y-2">
              {Object.keys(SHIP_CONFIGS).map(shipName => (
                <button
                  key={shipName}
                  onClick={() => setSelectedShip(shipName)}
                  className={`w-full px-3 py-2 text-left text-sm rounded border transition-colors ${
                    selectedShip === shipName
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-foreground border-background-lighter hover:bg-background-lighter"
                  }`}
                >
                  {shipName}
                </button>
              ))}
            </div>

            {selectedShip && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-foreground-muted mb-2">MATERIALS REQUIRED</h4>
                <div className="space-y-1 text-sm">
                  {SHIP_CONFIGS[selectedShip].map((material, idx) => (
                    <div key={idx} className="flex justify-between text-foreground-muted">
                      <span>{material.name}</span>
                      <span className="font-mono">{material.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Mode */}
        {mode === "custom" && (
          <div className="p-3">
            <h4 className="text-xs font-semibold text-foreground-muted mb-2">CUSTOM MATERIALS</h4>
            <div className="space-y-2 mb-3">
              {customMaterials.map((material, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Type ID"
                    value={material.typeId || ""}
                    onChange={(e) => handleCustomMaterialChange(idx, "typeId", parseInt(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 text-sm border rounded text-foreground"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--primary)" }}
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={material.quantity || ""}
                    onChange={(e) => handleCustomMaterialChange(idx, "quantity", parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-sm border rounded text-foreground"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--primary)" }}
                  />
                  <button
                    onClick={() => handleRemoveCustomMaterial(idx)}
                    className="px-2 py-1 text-sm bg-error text-white rounded"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddCustomMaterial}
              className="w-full px-3 py-2 text-sm border rounded transition-colors"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
            >
              + Add Material
            </button>
          </div>
        )}

        {/* Optimize Button */}
        <div className="p-3 border-t" style={{ borderColor: "var(--background-lighter)" }}>
          <button
            onClick={handleOptimize}
            disabled={isLoading || (mode === "preset" && !selectedShip) || (mode === "custom" && customMaterials.length === 0)}
            className="w-full px-4 py-2 text-sm font-semibold bg-primary text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Optimizing..." : "Optimize Production"}
          </button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="flex-1 border-2 overflow-y-auto" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        <div className="px-3 py-2 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-lighter)" }}>
          <h3 className="text-sm font-semibold text-foreground">Optimization Results</h3>
        </div>

        {error ? (
          <div className="p-6 text-center text-error">
            Error: {error}
          </div>
        ) : !result ? (
          <div className="p-6 text-center text-foreground-muted">
            Configure and optimize to see results
          </div>
        ) : (
          <div className="p-4">
            {/* Summary Section */}
            <div className="mb-6 p-4 rounded" style={{ backgroundColor: "var(--background)" }}>
              <h4 className="text-sm font-semibold text-foreground mb-3">Production Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-foreground-muted mb-1">Total Raw Materials</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatNumber(Object.values(result.totalRawMaterials).reduce((a, b) => a + b, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-foreground-muted mb-1">Total Time</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatTime(result.totalTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Raw Materials Breakdown */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-foreground mb-2">Raw Materials Breakdown</h4>
              <div className="space-y-1">
                {Object.entries(result.totalRawMaterials).map(([typeId, qty]) => (
                  <div
                    key={typeId}
                    className="flex justify-between px-3 py-2 rounded text-sm"
                    style={{ backgroundColor: "var(--background)" }}
                  >
                    <span className="text-foreground">Type {typeId}</span>
                    <span className="font-mono text-foreground">{formatNumber(qty)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Byproducts */}
            {Object.keys(result.byproducts).length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-foreground mb-2">Byproducts Available</h4>
                <div className="space-y-1">
                  {Object.entries(result.byproducts).map(([typeId, qty]) => (
                    <div
                      key={typeId}
                      className="flex justify-between px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: "var(--background)" }}
                    >
                      <span className="text-foreground">Type {typeId}</span>
                      <span className="font-mono text-success">+{formatNumber(qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Production Choices */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Production Choices</h4>
              <div className="space-y-2">
                {result.choices.map((choice, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded"
                    style={{ backgroundColor: "var(--background)" }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-foreground">
                        Type {choice.targetTypeId}
                      </div>
                      <div className="text-xs text-foreground-muted">
                        BP {choice.recipe.blueprintId}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground-muted">Runs</span>
                      <span className="font-mono text-foreground">{choice.runsNeeded}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground-muted">Output</span>
                      <span className="font-mono text-foreground">{formatNumber(choice.mainOutput)}</span>
                    </div>
                    {choice.inputChoices.length > 0 && (
                      <div className="mt-2 text-xs text-foreground-muted">
                        {choice.inputChoices.length} input{choice.inputChoices.length > 1 ? 's' : ''} required
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipOptimizerTab;
