import React, { useState, useEffect } from "react";
import { useAssemblies, useBlueprints, useBlueprintDetails, type Material, type BlueprintOption, type EfficiencyResult } from "../../hooks/useBlueprints";
import { RecursiveMaterialRow, type RecursiveMaterial } from "./RecursiveMaterialRow";

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

const API_URL = import.meta.env.VITE_API_URL;

export const BlueprintsTab: React.FC<BlueprintsTabProps> = () => {
  const { assemblies, isLoading: loadingAssemblies, error: assembliesError } = useAssemblies();
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<number | null>(null);

  const { blueprints, isLoading: loadingBlueprints, error: blueprintsError } = useBlueprints(selectedFacilityId);
  const { details, isLoading: loadingDetails, error: detailsError } = useBlueprintDetails(selectedBlueprintId);

  // Recursive material tree state
  const [materialTree, setMaterialTree] = useState<RecursiveMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState<Set<number>>(new Set());

  // Initialize tree from blueprint details
  useEffect(() => {
    if (!details) {
      setMaterialTree([]);
      return;
    }

    const initialTree: RecursiveMaterial[] = details.inputs.map(input => ({
      type_id: input.type_id,
      type_name: input.type_name,
      quantity: input.quantity,
      icon_id: input.icon_id,
      icon_file: input.icon_file,
      depth: 0,
      isExpanded: false,
      isBaseMaterial: false,
      selectedBlueprintId: null,
      selectedFacilityId: null,
      selectedFacilityName: null,
      availableBlueprints: [],
      children: [],
      isLoading: false
    }));

    setMaterialTree(initialTree);
  }, [details]);

  // Calculate base materials by recursively traversing the tree
  const calculateBaseMaterials = (materials: RecursiveMaterial[]): Record<string, number> => {
    const baseMats: Record<string, number> = {};

    const traverse = (material: RecursiveMaterial) => {
      // If this material is expanded and has children, traverse them
      if (material.isExpanded && material.children.length > 0) {
        material.children.forEach(traverse);
      }
      // Only count materials explicitly marked as base materials (no blueprints exist)
      else if (material.isBaseMaterial) {
        // Add to base materials, aggregating quantities if already exists
        if (baseMats[material.type_name]) {
          baseMats[material.type_name] += material.quantity;
        } else {
          baseMats[material.type_name] = material.quantity;
        }
      }
      // If not expanded yet, don't count it as a base material in the summary
      // User needs to expand materials to see the true base materials
    };

    materials.forEach(traverse);
    return baseMats;
  };

  const baseMaterials = calculateBaseMaterials(materialTree);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Helper: Transform EfficiencyResult to RecursiveMaterial
  const transformToRecursiveMaterial = (node: EfficiencyResult, depth: number): RecursiveMaterial => {
    return {
      type_id: node.type_id,
      type_name: node.type_name,
      quantity: node.quantity_needed,
      icon_id: null,
      icon_file: null,
      depth,
      isExpanded: false,
      isBaseMaterial: node.children.length === 0,
      selectedBlueprintId: node.blueprint_id,
      selectedFacilityId: node.facility_type_id,
      selectedFacilityName: node.facility_name,
      availableBlueprints: [],
      children: node.children.map(child => transformToRecursiveMaterial(child, depth + 1)),
      isLoading: false
    };
  };

  // Helper: Find material in tree
  const findMaterialInTree = (materials: RecursiveMaterial[], typeId: number): RecursiveMaterial | null => {
    for (const material of materials) {
      if (material.type_id === typeId) return material;
      const found = findMaterialInTree(material.children, typeId);
      if (found) return found;
    }
    return null;
  };

  // Helper: Update material in tree
  const updateMaterialInTree = (
    materials: RecursiveMaterial[],
    typeId: number,
    updates: Partial<RecursiveMaterial>
  ): RecursiveMaterial[] => {
    return materials.map(material => {
      if (material.type_id === typeId) {
        return { ...material, ...updates };
      }
      if (material.children.length > 0) {
        return {
          ...material,
          children: updateMaterialInTree(material.children, typeId, updates)
        };
      }
      return material;
    });
  };

  // Handler: Expand/collapse material
  const handleMaterialExpand = async (typeId: number) => {
    const material = findMaterialInTree(materialTree, typeId);
    if (!material) return;

    // Toggle collapse if already expanded
    if (material.isExpanded) {
      setMaterialTree(prev => updateMaterialInTree(prev, typeId, { isExpanded: false }));
      return;
    }

    // Set loading state
    setMaterialTree(prev => updateMaterialInTree(prev, typeId, { isLoading: true }));
    setLoadingMaterials(prev => new Set(prev).add(typeId));

    try {
      // Fetch blueprints for this material
      const blueprintsResponse = await fetch(`${API_URL}/api/industry/types/${typeId}/blueprints`);
      if (!blueprintsResponse.ok) throw new Error('Failed to fetch blueprints');
      const blueprintOptions: BlueprintOption[] = await blueprintsResponse.json();

      // Check if base material (no blueprints)
      if (blueprintOptions.length === 0) {
        setMaterialTree(prev => updateMaterialInTree(prev, typeId, {
          isBaseMaterial: true,
          isLoading: false
        }));
        setLoadingMaterials(prev => {
          const next = new Set(prev);
          next.delete(typeId);
          return next;
        });
        return;
      }

      // Fetch optimal production path using efficiency API
      const efficiencyResponse = await fetch(
        `${API_URL}/api/industry/efficiency/${typeId}?quantity=${material.quantity}`
      );
      if (!efficiencyResponse.ok) throw new Error('Failed to fetch efficiency');
      const efficiencyData: EfficiencyResult = await efficiencyResponse.json();

      // Update tree with expansion
      setMaterialTree(prev => updateMaterialInTree(prev, typeId, {
        isExpanded: true,
        isLoading: false,
        isBaseMaterial: false,
        selectedBlueprintId: efficiencyData.blueprint_id,
        selectedFacilityId: efficiencyData.facility_type_id,
        selectedFacilityName: efficiencyData.facility_name,
        availableBlueprints: blueprintOptions,
        children: efficiencyData.children.map(child => transformToRecursiveMaterial(child, material.depth + 1))
      }));
    } catch (error) {
      console.error('Error expanding material:', error);
      setMaterialTree(prev => updateMaterialInTree(prev, typeId, { isLoading: false }));
    } finally {
      setLoadingMaterials(prev => {
        const next = new Set(prev);
        next.delete(typeId);
        return next;
      });
    }
  };

  // Handler: Blueprint selection change
  const handleBlueprintChange = async (typeId: number, blueprintId: number) => {
    const material = findMaterialInTree(materialTree, typeId);
    if (!material) return;

    // Set loading
    setMaterialTree(prev => updateMaterialInTree(prev, typeId, { isLoading: true }));

    try {
      // Fetch new blueprint details
      const response = await fetch(`${API_URL}/api/industry/blueprints/${blueprintId}`);
      if (!response.ok) throw new Error('Failed to fetch blueprint details');
      const blueprintDetails = await response.json();

      // Find the facility from available blueprints
      const selectedBlueprint = material.availableBlueprints.find(bp => bp.blueprint_id === blueprintId);

      // Calculate runs needed
      const outputItem = blueprintDetails.outputs.find((o: Material) => o.type_id === typeId);
      const outputQty = outputItem?.quantity || 1;
      const runsNeeded = Math.ceil(material.quantity / outputQty);

      // Calculate new children with cascaded quantities
      const newChildren: RecursiveMaterial[] = blueprintDetails.inputs.map((input: Material) => ({
        type_id: input.type_id,
        type_name: input.type_name,
        quantity: input.quantity * runsNeeded,
        icon_id: input.icon_id,
        icon_file: input.icon_file,
        depth: material.depth + 1,
        isExpanded: false,
        isBaseMaterial: false,
        selectedBlueprintId: null,
        selectedFacilityId: null,
        selectedFacilityName: null,
        availableBlueprints: [],
        children: [],
        isLoading: false
      }));

      // Update tree
      setMaterialTree(prev => updateMaterialInTree(prev, typeId, {
        selectedBlueprintId: blueprintId,
        selectedFacilityId: selectedBlueprint?.facility_type_id || null,
        selectedFacilityName: selectedBlueprint?.facility_name || null,
        children: newChildren,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error changing blueprint:', error);
      setMaterialTree(prev => updateMaterialInTree(prev, typeId, { isLoading: false }));
    }
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
                onClick={() => setSelectedBlueprintId(blueprint.blueprint_id)}
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
        ) : detailsError ? (
          <div className="p-6 text-center text-error">{detailsError}</div>
        ) : loadingDetails ? (
          <div className="p-6 text-center text-foreground-muted">Loading...</div>
        ) : details ? (
          <div>
            <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-lighter)" }}>
              <h3 className="text-lg font-semibold text-foreground">
                {details.primary_type_name}
              </h3>
              <p className="text-xs text-foreground-muted mt-1">
                Production Time: {formatDuration(details.run_time)}
              </p>
            </div>

            {/* Output */}
            {details.outputs.length > 0 && (
              <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
                <div className="px-3 py-2" style={{ backgroundColor: "var(--background-lighter)" }}>
                  <h4 className="text-xs font-semibold text-foreground-muted uppercase">Output</h4>
                </div>
                {details.outputs.map((material, idx) => (
                  <MaterialRow key={idx} material={material} depth={0} />
                ))}
              </div>
            )}

            {/* Input Materials */}
            {materialTree.length > 0 && (
              <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
                <div className="px-3 py-2" style={{ backgroundColor: "var(--background-lighter)" }}>
                  <h4 className="text-xs font-semibold text-foreground-muted uppercase">Input Materials</h4>
                </div>
                {materialTree.map((material, idx) => (
                  <RecursiveMaterialRow
                    key={`${material.type_id}-${idx}`}
                    material={material}
                    onExpand={handleMaterialExpand}
                    onBlueprintChange={handleBlueprintChange}
                  />
                ))}
              </div>
            )}

            {/* Base Materials Summary */}
            <div className="border-b-2" style={{ borderColor: "var(--primary)" }}>
              <div className="px-3 py-2" style={{ backgroundColor: "var(--background-lighter)" }}>
                <h4 className="text-xs font-semibold text-foreground-muted uppercase">Base Materials Required</h4>
              </div>
              <div className="p-3">
                {Object.keys(baseMaterials).length === 0 ? (
                  <p className="text-sm text-foreground-muted">
                    Expand materials above to calculate base materials needed
                  </p>
                ) : (
                  Object.entries(baseMaterials).map(([name, quantity]) => (
                    <div key={name} className="flex justify-between py-1 text-sm">
                      <span className="text-foreground">{name}</span>
                      <span className="text-foreground-muted">{quantity.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Leftover Materials */}
            <div>
              <div className="px-3 py-2" style={{ backgroundColor: "var(--background-lighter)" }}>
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
