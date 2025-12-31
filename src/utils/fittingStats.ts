import { Fitting, FittedModule } from '../components/fitting/FittingTab';
import { Ship } from '../hooks/useFittingData';
import { getAllFittedModules } from './fittingValidation';

/**
 * Calculate modified ship stats based on fitted modules
 */
export interface CalculatedStats {
  // Base ship stats (unmodified)
  baseShip: Ship;

  // Defense stats (HP)
  shieldCapacity: number;
  armorHP: number;
  hullHP: number;

  // Resistances (as percentages, 0-100)
  emResistance: number;
  thermalResistance: number;
  kineticResistance: number;
  explosiveResistance: number;

  // Capacitor
  capacitor: number;
  capacitorRecharge: number;

  // Navigation
  maxVelocity: number;
  mass: number;
  signatureRadius: number;

  // CPU/Powergrid (modified by modules)
  cpu: number;
  powergrid: number;

  // Targeting
  maxLockedTargets: number;
  scanResolution: number;
}

/**
 * Apply module bonuses to ship stats
 */
export function calculateFittingStats(fitting: Fitting): CalculatedStats | null {
  if (!fitting.ship) return null;

  const ship = fitting.ship;
  const fittedModules = getAllFittedModules(fitting);

  // Start with base ship stats
  let stats: CalculatedStats = {
    baseShip: ship,

    // Defense
    shieldCapacity: ship.shieldCapacity || 0,
    armorHP: ship.armorHP || 0,
    hullHP: ship.hullHP || 0,

    // Resistances (convert resonance to resistance percentage)
    emResistance: (1 - (ship.emDamageResonance || 1)) * 100,
    thermalResistance: (1 - (ship.thermalDamageResonance || 1)) * 100,
    kineticResistance: (1 - (ship.kineticDamageResonance || 1)) * 100,
    explosiveResistance: (1 - (ship.explosiveDamageResonance || 1)) * 100,

    // Capacitor
    capacitor: ship.capacitor || 0,
    capacitorRecharge: ship.capacitorRecharge || 0,

    // Navigation
    maxVelocity: ship.maxVelocity || 0,
    mass: ship.mass || 0,
    signatureRadius: ship.signatureRadius || 0,

    // Resources
    cpu: ship.cpu || 0,
    powergrid: ship.powergrid || 0,

    // Targeting
    maxLockedTargets: ship.maxLockedTargets || 0,
    scanResolution: ship.scanResolution || 0
  };

  // Apply module bonuses
  fittedModules.forEach(fm => {
    const module = fm.module;

    // Armor HP bonus (additive)
    if (module.armorHP) {
      stats.armorHP += module.armorHP;
    }

    // Shield capacity bonus (additive)
    if (module.shieldCapacity) {
      stats.shieldCapacity += module.shieldCapacity;
    }

    // Capacitor capacity bonus (additive)
    if (module.capacityBonus) {
      stats.capacitor += module.capacityBonus;
    }

    // CPU bonus (additive - increases total CPU)
    if (module.cpuBonus) {
      stats.cpu += module.cpuBonus;
    }

    // Powergrid bonus (additive - increases total powergrid)
    if (module.powergridBonus) {
      stats.powergrid += module.powergridBonus;
    }

    // Speed multiplier (multiplicative)
    if (module.speedMultiplier) {
      stats.maxVelocity *= module.speedMultiplier;
    }

    // Speed bonus (additive)
    if (module.speedBonus) {
      stats.maxVelocity += module.speedBonus;
    }

    // Shield recharge rate multiplier
    if (module.shieldRechargeRateMultiplier) {
      stats.capacitorRecharge *= module.shieldRechargeRateMultiplier;
    }

    // Resistance bonuses (negative values increase resistance, e.g., -16 means +16% resistance)
    if (module.emResistanceBonus) {
      stats.emResistance += (-module.emResistanceBonus);
    }

    if (module.thermalResistanceBonus) {
      stats.thermalResistance += (-module.thermalResistanceBonus);
    }

    if (module.kineticResistanceBonus) {
      stats.kineticResistance += (-module.kineticResistanceBonus);
    }

    if (module.explosiveResistanceBonus) {
      stats.explosiveResistance += (-module.explosiveResistanceBonus);
    }
  });

  return stats;
}

/**
 * Format a stat value for display
 */
export function formatStat(value: number, decimals: number = 0): string {
  return value.toFixed(decimals);
}

/**
 * Get the difference between modified and base stats
 */
export function getStatDelta(modified: number, base: number): {
  value: number;
  percentage: number;
  isPositive: boolean;
} {
  const delta = modified - base;
  const percentage = base !== 0 ? (delta / base) * 100 : 0;

  return {
    value: delta,
    percentage,
    isPositive: delta > 0
  };
}
