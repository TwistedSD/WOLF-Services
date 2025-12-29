import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export interface MaterialInput {
  typeId: number;
  quantity: number;
}

export interface ProductionChoice {
  targetTypeId: number;
  runsNeeded: number;
  mainOutput: number;
  recipe: {
    blueprintId: number;
    outputQuantity: number;
    timeSeconds: number;
    inputs: Array<{
      typeId: number;
      quantity: number;
    }>;
  };
  inputChoices: ProductionChoice[];
}

export interface OptimizationResult {
  totalRawMaterials: { [typeId: number]: number };
  totalTime: number;
  byproducts: { [typeId: number]: number };
  choices: ProductionChoice[];
}

export function useMultiMaterialOptimizer() {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimize = async (materials: MaterialInput[]) => {
    if (!materials || materials.length === 0) {
      setError("No materials provided");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/industry/optimize-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ materials }),
      });

      if (!response.ok) {
        throw new Error(`Failed to optimize: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error optimizing multi-material production:', err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { result, isLoading, error, optimize, reset };
}
