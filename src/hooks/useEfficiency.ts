import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

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

    const fetchProduction = async () => {
      try {
        setIsLoading(true);

        let response;
        if (blueprintOverrides && Object.keys(blueprintOverrides).length > 0) {
          // Use POST endpoint for blueprint overrides
          response = await fetch(`${API_URL}/api/industry/efficiency/${typeId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              quantity,
              blueprintOverrides,
            }),
          });
        } else {
          // Use GET endpoint for default calculation
          response = await fetch(`${API_URL}/api/industry/efficiency/${typeId}?quantity=${quantity}`);
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch production data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setResult(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching production data:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduction();
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
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/api/industry/blueprints/${typeId}/options`);
        if (!response.ok) {
          throw new Error(`Failed to fetch blueprint options: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setOptions(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching blueprint options:', err);
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

    const fetchComparison = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/api/industry/blueprints/${typeId}/compare?quantity=${quantity}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch comparison: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setComparisons(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching comparison:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparison();
  }, [typeId, quantity]);

  return { comparisons, isLoading, error };
}
