import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

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
        const response = await fetch(`${API_URL}/api/industry/facilities`);
        if (!response.ok) {
          throw new Error(`Failed to fetch facilities: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
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
        const response = await fetch(`${API_URL}/api/industry/facilities/${facilityId}/blueprints`);
        if (!response.ok) {
          throw new Error(`Failed to fetch blueprints: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setBlueprints(data);
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
        const response = await fetch(`${API_URL}/api/industry/blueprints/${blueprintId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch blueprint details: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
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
        const response = await fetch(`${API_URL}/api/industry/types/${typeId}/blueprints`);
        if (!response.ok) {
          throw new Error(`Failed to fetch blueprints: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
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

    const fetchEfficiency = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          quantity: quantity.toString(),
        });
        if (blueprintId) {
          params.append('blueprintId', blueprintId.toString());
        }

        const response = await fetch(`${API_URL}/api/industry/efficiency/${typeId}?${params}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch efficiency: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setEfficiency(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching efficiency:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEfficiency();
  }, [typeId, quantity, blueprintId]);

  return { efficiency, isLoading, error };
}
