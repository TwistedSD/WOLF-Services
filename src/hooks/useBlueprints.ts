import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export interface Assembly {
  type_id: number;
  type_name: string;
  group_name: string | null;
  icon_id: number | null;
  icon_file: string | null;
}

export interface Blueprint {
  blueprint_id: number;
  blueprint_type_id: number;
  max_production_limit: number;
  time_seconds: number;
  product_type_id: number;
  product_name: string;
  product_category: string | null;
  product_group: string | null;
  product_icon_id: number;
  product_icon_file: string;
}

export interface Material {
  type_id: number;
  type_name: string;
  quantity: number;
  icon_id: number | null;
  icon_file: string | null;
  volume: number | null;
  base_price: number;
}

export interface BlueprintDetails {
  blueprint_id: number;
  blueprint_type_id: number;
  time_seconds: number;
  max_production_limit: number;
  materials: Material[];
  products: Material[];
}

export function useAssemblies() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssemblies = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/api/assemblies`);
        if (!response.ok) {
          throw new Error(`Failed to fetch assemblies: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setAssemblies(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching assemblies:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssemblies();
  }, []);

  return { assemblies, isLoading, error };
}

export function useBlueprints(assemblyId: number | null) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assemblyId) {
      setBlueprints([]);
      return;
    }

    const fetchBlueprints = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/api/assemblies/${assemblyId}/blueprints`);
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
  }, [assemblyId]);

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
        const response = await fetch(`${API_URL}/api/blueprints/${blueprintId}`);
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
