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
