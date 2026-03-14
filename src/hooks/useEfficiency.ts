import { useState, useEffect } from "react";
import { calculateProduction, aggregateBaseMaterials, collectByproducts, getBlueprintOptionsForType, loadLocalDatabase } from "../utils/localDatabase";

export interface Byproduct {
  type_id: number;
  type_name: string;
  quantity: number;
}

export interface ProductionNode {
  type_id: number;
  type_name: string;
  quantity_needed: number;
  quantity_produced: number;
  excess_quantity: number;
  quantity_from_excess_pool: number;
  blueprint_id: number | null;
  facility_type_id?: number | null;
  facility_name?: string | null;
  runs_required: number;
  time_seconds: number;
  total_production_time: number;
  total_base_materials: number;
  base_material_breakdown: { [typeId: number]: number };
  base_material_names: { [typeId: number]: string };
  byproducts: Byproduct[];
  alternative_blueprints: number;
  inputs: ProductionNode[];
  is_base_material?: boolean;
}

export interface BlueprintOptionSimple {
  blueprint_id: number;
  output_quantity: number;
  time_seconds: number;
  facility_type_id?: number | null;
  facility_name?: string | null;
}

export interface BlueprintComparison {
  blueprint_id: number;
  time_seconds: number;
  base_materials_required: number;
  base_material_breakdown: { [typeId: number]: number };
  efficiency_rank: number;
}

export function useProductionCalculator(
  typeId: number | null,
  quantity: number,
  blueprintOverrides?: { [typeId: number]: number }
) {
  const [result, setResult] = useState<ProductionNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!typeId || quantity <= 0) {
      setResult(null);
      return;
    }

    const calculate = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Ensure database is loaded
        await loadLocalDatabase();
        
        console.log('useProductionCalculator: calculating for typeId:', typeId, 'quantity:', quantity);
        
        // Calculate production using local database
        const productionResult = calculateProduction(typeId, quantity, blueprintOverrides || {});
        
        console.log('useProductionCalculator: result:', productionResult);
        
        if (productionResult) {
          // Cast to our interface - they should be compatible now
          setResult(productionResult as ProductionNode);
        } else {
          console.error('Production result is null for typeId:', typeId);
          setError("Could not calculate production for this item");
        }
      } catch (err) {
        console.error('Production calculation error:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    calculate();
  }, [typeId, quantity, JSON.stringify(blueprintOverrides)]);

  return { result, isLoading, error };
}

export function useBlueprintOptions(typeId: number | null) {
  const [options, setOptions] = useState<BlueprintOptionSimple[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!typeId) {
      setOptions([]);
      return;
    }

    const fetchOptions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Ensure database is loaded
        await loadLocalDatabase();
        
        // Get blueprint options from local database
        const blueprintOptions = getBlueprintOptionsForType(typeId);
        
        setOptions(blueprintOptions.map(bp => ({
          blueprint_id: bp.blueprint_id,
          output_quantity: bp.output_quantity,
          time_seconds: bp.run_time,
          facility_type_id: bp.facility_type_id,
          facility_name: bp.facility_name
        })));
      } catch (err) {
        console.error('Blueprint options error:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();
  }, [typeId]);

  return { options, isLoading, error };
}

export function useBlueprintComparison(typeId: number | null, quantity: number) {
  const [comparisons, setComparisons] = useState<BlueprintComparison[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!typeId || quantity <= 0) {
      setComparisons([]);
      return;
    }

    // Blueprint comparison requires the backend API which is no longer available
    setError("Blueprint comparison is not available in offline mode");
    setIsLoading(false);
  }, [typeId, quantity]);

  return { comparisons, isLoading, error };
}

export interface BlueprintProductionResult {
  blueprint_id: number;
  runs: number;
  outputs: Array<{
    type_id: number;
    type_name: string;
    quantity: number;
  }>;
  inputs: ProductionNode[];
}

export function useBlueprintProduction(
  blueprintId: number | null,
  runs: number,
  blueprintOverrides?: { [typeId: number]: number }
) {
  const [result, setResult] = useState<BlueprintProductionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blueprintId || runs <= 0) {
      setResult(null);
      return;
    }

    // Blueprint production requires the backend API which is no longer available
    setError("Blueprint production is not available in offline mode");
    setIsLoading(false);
  }, [blueprintId, runs, JSON.stringify(blueprintOverrides)]);

  return { result, isLoading, error };
}
