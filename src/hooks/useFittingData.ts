import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Ship {
  typeId: number;
  typeName: string;
  groupId: number;
  shipSize: 'S' | 'M' | 'L';
  capacitor?: number;
  powergrid?: number;
  cpu?: number;
  hiSlots?: number;
  midSlots?: number;
  lowSlots?: number;
  engineSlots?: number;
  mass?: number;
  scanResolution?: number;
  capacitorRecharge?: number;
  signatureRadius?: number;
  maxVelocity?: number;
  maxLockedTargets?: number;
  emDamageResonance?: number;
  explosiveDamageResonance?: number;
  kineticDamageResonance?: number;
  thermalDamageResonance?: number;
  shieldCapacity?: number;
  armorHP?: number;
  hullHP?: number;
}

export interface Charge {
  typeId: number;
  typeName: string;
  groupId: number;
}

export interface Module {
  typeId: number;
  typeName: string;
  groupId: number;
  slotType: 'high' | 'mid' | 'low' | 'engine' | 'unknown';
  size?: string;
  shipSize?: 'S' | 'M' | 'L';
  power?: number;
  cpu?: number;
  radius?: number;
  duration?: number;
  capacityBonus?: number;
  speedBonus?: number;
  cpuBonus?: number;
  powergridBonus?: number;
  speedMultiplier?: number;
  chargeSize?: number;
  chargeGroup1?: number;
  shieldRechargeRateMultiplier?: number;
  shieldCapacity?: number;
  armorHP?: number;
  emResistanceBonus?: number;
  explosiveResistanceBonus?: number;
  kineticResistanceBonus?: number;
  thermalResistanceBonus?: number;
  maxGroupFitted?: number;
  canFitShipGroup01?: number;
  canFitShipGroup02?: number;
  canFitShipGroup03?: number;
  canFitShipGroup04?: number;
  compatibleCharges?: Charge[];
}

export function useFittingData() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const [shipsRes, modulesRes] = await Promise.all([
          fetch(`${API_URL}/api/fitting/ships`),
          fetch(`${API_URL}/api/fitting/modules`)
        ]);

        if (!shipsRes.ok) {
          throw new Error(`Failed to fetch ships: ${shipsRes.statusText}`);
        }
        if (!modulesRes.ok) {
          throw new Error(`Failed to fetch modules: ${modulesRes.statusText}`);
        }

        const shipsData = await shipsRes.json();
        const modulesData = await modulesRes.json();

        setShips(shipsData);
        setModules(modulesData);
      } catch (err) {
        console.error('Error fetching fitting data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { ships, modules, isLoading, error };
}
