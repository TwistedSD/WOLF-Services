import { useState, useEffect } from "react";
import { loadLocalDatabase, getFacilities, getBlueprintsByFacility, getBlueprintDetails, getBlueprintsByType } from "../utils/localDatabase";

export interface Assembly {
  facility_type_id: number;
  facility_name: string;
  facility_category: string;
  input_capacity: number;
  output_capacity: number;
  blueprint_count: number;
  sort_order: number;
}

export interface Blueprint {
  blueprint_id: number;
  primary_type_id: number;
  primary_type_name: string;
  run_time: number;
  icon_id: number | null;
  icon_file: string | null;
}

export interface Material {
  type_id: number;
  type_name: string;
  quantity: number;
  icon_id: number | null;
  icon_file: string | null;
}

export interface BlueprintDetails {
  blueprint_id: number;
  primary_type_id: number;
  primary_type_name: string;
  run_time: number;
  max_input_capacity: number;
  inputs: Material[];
  outputs: Material[];
}

export function useAssemblies() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssemblies = async () => {
      try {
        setIsLoading(true);
        
        // Load local data
        await loadLocalDatabase();
        const data = getFacilities();
        setAssemblies(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching facilities:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssemblies();
  }, []);

  return { assemblies, isLoading, error };
}

export function useBlueprints(facilityId: number | null) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!facilityId) {
      setBlueprints([]);
      return;
    }

    const fetchBlueprints = async () => {
      try {
        setIsLoading(true);
        
        // Load local data
        await loadLocalDatabase();
        const data = getBlueprintsByFacility(facilityId);
        setBlueprints(data as Blueprint[]);
        setError(null);
      } catch (err) {
        console.error('Error fetching blueprints:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlueprints();
  }, [facilityId]);

  return { blueprints, isLoading, error };
}

export function useBlueprintDetails(blueprintId: number | null) {
  const [details, setDetails] = useState<BlueprintDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blueprintId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        
        // Load local data
        await loadLocalDatabase();
        const data = getBlueprintDetails(blueprintId);
        setDetails(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching blueprint details:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [blueprintId]);

  return { details, isLoading, error };
}

export interface BlueprintOption {
  blueprint_id: number;
  primary_type_id: number;
  primary_type_name: string;
  facility_type_id: number;
  facility_name: string;
  run_time: number;
  icon_id: number | null;
  icon_file: string | null;
}

export function useBlueprintsByType(typeId: number | null) {
  const [blueprints, setBlueprints] = useState<BlueprintOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!typeId) {
      setBlueprints([]);
      return;
    }

    const fetchBlueprints = async () => {
      try {
        setIsLoading(true);
        
        // Load local data
        await loadLocalDatabase();
        const data = getBlueprintsByType(typeId);
        setBlueprints(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching blueprints by type:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlueprints();
  }, [typeId]);

  return { blueprints, isLoading, error };
}

export interface EfficiencyResult {
  type_id: number;
  type_name: string;
  quantity_needed: number;
  blueprint_id: number | null;
  facility_type_id: number | null;
  facility_name: string | null;
  run_time: number;
  total_production_time: number;
  total_base_materials: number;
  base_material_breakdown: { [typeId: number]: number };
  base_material_names: { [typeId: number]: string };
  children: EfficiencyResult[];
}

export function useMaterialEfficiency(
  typeId: number | null,
  quantity: number,
  blueprintId?: number
) {
  const [efficiency, setEfficiency] = useState<EfficiencyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!typeId || quantity <= 0) {
      setEfficiency(null);
      return;
    }

    // Note: Material efficiency calculation is complex and requires 
    // recursive blueprint analysis. For now, return null.
    // This could be implemented locally if needed.
    setEfficiency(null);
  }, [typeId, quantity, blueprintId]);

  return { efficiency, isLoading, error };
}
