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

  // Resistances (as percentages, 0-100) - WITH stacking penalty applied
  emResistance: number;
  thermalResistance: number;
  kineticResistance: number;
  explosiveResistance: number;

  // Capacitor
  capacitor: number;
  capacitorRecharge: number;
  capacitorStability: string | number; // "STABLE" or seconds until empty
  capacitorUsage: number; // Total usage per second
  capacitorRechargePenalty: number; // Total penalty from modules

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
 * EVE-style stacking penalty calculation
 * Each additional module of the same type has diminishing returns
 * Formula: 1 - (1-r1) × (1-r2)^0.869 × (1-r3)^0.571 × (1-r4)^0.283 × (1-r5)^0.106...
 */
function applyStackingPenalty(bonuses: number[]): number {
  if (bonuses.length === 0) return 0;
  if (bonuses.length === 1) return bonuses[0];

  // Sort bonuses in descending order (largest first gets no penalty)
  const sorted = [...bonuses].sort((a, b) => b - a);

  // Stacking penalty exponents
  const penalties = [1, 0.869, 0.571, 0.283, 0.106, 0.0407];

  // Calculate stacked resistance
  let totalResonance = 1; // Start at 100% damage (0% resistance)
  sorted.forEach((bonus, index) => {
    const penalty = penalties[Math.min(index, penalties.length - 1)];
    const resistanceDecimal = bonus / 100; // Convert percentage to decimal
    totalResonance *= Math.pow(1 - resistanceDecimal, penalty);
  });

  return (1 - totalResonance) * 100; // Convert back to resistance percentage
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

    // Defense (HP values are additive)
    shieldCapacity: ship.shieldCapacity || 0,
    armorHP: ship.armorHP || 0,
    hullHP: ship.hullHP || 0,

    // Resistances (start at base ship resistances)
    emResistance: (1 - (ship.emDamageResonance || 1)) * 100,
    thermalResistance: (1 - (ship.thermalDamageResonance || 1)) * 100,
    kineticResistance: (1 - (ship.kineticDamageResonance || 1)) * 100,
    explosiveResistance: (1 - (ship.explosiveDamageResonance || 1)) * 100,

    // Capacitor
    capacitor: ship.capacitor || 0,
    capacitorRecharge: ship.capacitorRecharge || 0,
    capacitorStability: 0, // Will be calculated
    capacitorUsage: 0, // Will be calculated
    capacitorRechargePenalty: 0, // Will be calculated

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

  // Collect resistance bonuses for stacking penalty calculation
  const emBonuses: number[] = [];
  const thermalBonuses: number[] = [];
  const kineticBonuses: number[] = [];
  const explosiveBonuses: number[] = [];

  // Apply module bonuses
  fittedModules.forEach(fm => {
    const module = fm.module;
    const charge = fm.charge;

    // HP bonuses (additive)
    if (module.armorHP) {
      stats.armorHP += module.armorHP;
    }
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

    // Capacitor: Engine provides recharge (attribute 55 in GJ/s)
    if (module.capacitorRecharge) {
      stats.capacitorRecharge += module.capacitorRecharge;
    }

    // Capacitor: Modules with recharge penalty (attribute 5619 in GJ/s)
    if (module.rechargePenalty) {
      stats.capacitorRechargePenalty += module.rechargePenalty;
    }

    // Capacitor: Calculate usage per second for this module
    // usagePerSecond = capacitorNeed (activationCost) * 1000 / duration (ms)
    // Apply capacitorNeedMultiplier if present
    if (module.activationCost && module.duration) {
      const multiplier = module.capacitorNeedMultiplier || 1;
      const usagePerSecond = (module.activationCost * multiplier * 1000) / module.duration;
      stats.capacitorUsage += usagePerSecond;
    }

    // Resistance bonuses (collect for stacking penalty)
    // Negative values increase resistance (e.g., -16 means +16% resistance)
    // Charges modify these bonuses (e.g., +200% means bonus becomes 3x larger)
    if (module.emResistanceBonus) {
      let bonus = -module.emResistanceBonus;
      if (charge?.emResistanceBonusMod) {
        bonus *= (1 + charge.emResistanceBonusMod / 100);
      }
      emBonuses.push(bonus);
    }

    if (module.thermalResistanceBonus) {
      let bonus = -module.thermalResistanceBonus;
      if (charge?.thermalResistanceBonusMod) {
        bonus *= (1 + charge.thermalResistanceBonusMod / 100);
      }
      thermalBonuses.push(bonus);
    }

    if (module.kineticResistanceBonus) {
      let bonus = -module.kineticResistanceBonus;
      if (charge?.kineticResistanceBonusMod) {
        bonus *= (1 + charge.kineticResistanceBonusMod / 100);
      }
      kineticBonuses.push(bonus);
    }

    if (module.explosiveResistanceBonus) {
      let bonus = -module.explosiveResistanceBonus;
      if (charge?.explosiveResistanceBonusMod) {
        bonus *= (1 + charge.explosiveResistanceBonusMod / 100);
      }
      explosiveBonuses.push(bonus);
    }
  });

  // Apply stacking penalty to resistances and combine with ship base
  // Resistances combine multiplicatively: total_resonance = ship_resonance * module_resonance
  if (emBonuses.length > 0) {
    const moduleResistance = applyStackingPenalty(emBonuses);
    const shipResonance = ship.emDamageResonance || 1;
    const moduleResonance = 1 - (moduleResistance / 100);
    const totalResonance = shipResonance * moduleResonance;
    stats.emResistance = (1 - totalResonance) * 100;
  }
  if (thermalBonuses.length > 0) {
    const moduleResistance = applyStackingPenalty(thermalBonuses);
    const shipResonance = ship.thermalDamageResonance || 1;
    const moduleResonance = 1 - (moduleResistance / 100);
    const totalResonance = shipResonance * moduleResonance;
    stats.thermalResistance = (1 - totalResonance) * 100;
  }
  if (kineticBonuses.length > 0) {
    const moduleResistance = applyStackingPenalty(kineticBonuses);
    const shipResonance = ship.kineticDamageResonance || 1;
    const moduleResonance = 1 - (moduleResistance / 100);
    const totalResonance = shipResonance * moduleResonance;
    stats.kineticResistance = (1 - totalResonance) * 100;
  }
  if (explosiveBonuses.length > 0) {
    const moduleResistance = applyStackingPenalty(explosiveBonuses);
    const shipResonance = ship.explosiveDamageResonance || 1;
    const moduleResonance = 1 - (moduleResistance / 100);
    const totalResonance = shipResonance * moduleResonance;
    stats.explosiveResistance = (1 - totalResonance) * 100;
  }

  // Calculate capacitor stability
  // netRecharge = engine recharge - module penalties - module usage
  // If netRecharge >= 0: STABLE
  // If netRecharge < 0: timeUntilEmpty = capacity / |netRecharge|
  const totalRecharge = stats.capacitorRecharge;
  const totalPenalty = stats.capacitorRechargePenalty;
  const totalUsage = stats.capacitorUsage;
  const netRecharge = totalRecharge - totalPenalty - totalUsage;
  
  if (netRecharge >= 0) {
    stats.capacitorStability = 'STABLE';
  } else {
    // Time until capacitor runs out in seconds
    stats.capacitorStability = stats.capacitor / Math.abs(netRecharge);
  }

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
