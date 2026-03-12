import { useState } from "react";

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

    // Multi-material optimizer requires the backend API which is no longer available
    setError("Multi-material optimizer is not available in offline mode");
    setIsLoading(false);
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { result, isLoading, error, optimize, reset };
}
