/**
 * Stat Definitions for EVE Frontier Ships and Modules
 * Provides human-readable descriptions for all ship and module stats
 */

// Ship stat definitions
export interface StatDefinition {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: 'defense' | 'capacitor' | 'navigation' | 'targeting' | 'resources' | 'offense' | 'other';
  higherIsBetter: boolean;
  applicableTo: 'ship' | 'module' | 'both';
}

// Complete stat definitions with descriptions
export const SHIP_STAT_DEFINITIONS: Record<string, StatDefinition> = {
  // Defense Stats
  shieldCapacity: {
    id: 'shieldCapacity',
    name: 'Shield HP',
    description: 'Total shield hit points. Shields regenerate automatically over time and take damage first.',
    unit: 'HP',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  armorHP: {
    id: 'armorHP',
    name: 'Armor HP',
    description: 'Total armor hit points. Armor takes damage after shields are depleted.',
    unit: 'HP',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  hullHP: {
    id: 'hullHP',
    name: 'Hull HP',
    description: 'Total hull hit points. Hull takes damage after armor is depleted. If hull reaches 0, the ship is destroyed.',
    unit: 'HP',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  
  // Resistances (shown as resonance values - lower is better)
  emDamageResonance: {
    id: 'emDamageResonance',
    name: 'EM Resistance',
    description: 'Damage resonance for EM damage. Lower values mean less damage taken from EM attacks. 0.5 = 50% damage (50% resistance).',
    unit: '%',
    category: 'defense',
    higherIsBetter: false,
    applicableTo: 'ship'
  },
  thermalDamageResonance: {
    id: 'thermalDamageResonance',
    name: 'Thermal Resistance',
    description: 'Damage resonance for thermal damage. Lower values mean less damage taken from thermal attacks.',
    unit: '%',
    category: 'defense',
    higherIsBetter: false,
    applicableTo: 'ship'
  },
  kineticDamageResonance: {
    id: 'kineticDamageResonance',
    name: 'Kinetic Resistance',
    description: 'Damage resonance for kinetic damage. Lower values mean less damage taken from kinetic attacks.',
    unit: '%',
    category: 'defense',
    higherIsBetter: false,
    applicableTo: 'ship'
  },
  explosiveDamageResonance: {
    id: 'explosiveDamageResonance',
    name: 'Explosive Resistance',
    description: 'Damage resonance for explosive damage. Lower values mean less damage taken from explosive attacks.',
    unit: '%',
    category: 'defense',
    higherIsBetter: false,
    applicableTo: 'ship'
  },
  
  // Capacitor Stats
  capacitor: {
    id: 'capacitor',
    name: 'Capacitor Capacity',
    description: 'Total capacitor energy available. Used to power modules and systems. Must be recharged or the ship becomes immobilized.',
    unit: 'GJ',
    category: 'capacitor',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  capacitorRecharge: {
    id: 'capacitorRecharge',
    name: 'Capacitor Recharge',
    description: 'Rate at which the capacitor regenerates. Higher values mean faster recharge. Affected by capacitor skills.',
    unit: 'GJ/s',
    category: 'capacitor',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  
  // Navigation Stats
  maxVelocity: {
    id: 'maxVelocity',
    name: 'Max Velocity',
    description: 'Maximum speed the ship can travel. Affected by ship mass, propulsion modules, and speed bonuses.',
    unit: 'm/s',
    category: 'navigation',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  mass: {
    id: 'mass',
    name: 'Ship Mass',
    description: 'Total mass of the ship. Heavier ships are slower but more stable. Affects acceleration and inertia.',
    unit: 'kg',
    category: 'navigation',
    higherIsBetter: false,
    applicableTo: 'ship'
  },
  signatureRadius: {
    id: 'signatureRadius',
    name: 'Signature Radius',
    description: 'The effective size of the ship for targeting and damage purposes. Larger signatures take more damage from weapons with explosion radius matching. Smaller is harder to hit and takes less damage from missiles.',
    unit: 'm',
    category: 'navigation',
    higherIsBetter: false,
    applicableTo: 'ship'
  },
  
  // Targeting Stats
  maxLockedTargets: {
    id: 'maxLockedTargets',
    name: 'Max Targets',
    description: 'Maximum number of targets the ship can lock onto simultaneously.',
    unit: '',
    category: 'targeting',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  scanResolution: {
    id: 'scanResolution',
    name: 'Scan Resolution',
    description: 'How quickly the ship can acquire targets. Higher values mean faster targeting lock times.',
    unit: 'mm',
    category: 'targeting',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  
  // Resources
  powergrid: {
    id: 'powergrid',
    name: 'Powergrid',
    description: 'Total power available for modules. High powergrid modules require more PG to fit. Modules consume power when active.',
    unit: 'MW',
    category: 'resources',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  cpu: {
    id: 'cpu',
    name: 'CPU',
    description: 'Total CPU available for modules. High CPU modules require more CPU to fit. All modules consume some CPU.',
    unit: 'TF',
    category: 'resources',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  
  // Slot counts
  hiSlots: {
    id: 'hiSlots',
    name: 'High Slots',
    description: 'Number of high power slots. Typically used for weapons, shields, and other offensive/defensive modules.',
    unit: '',
    category: 'resources',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  midSlots: {
    id: 'midSlots',
    name: 'Mid Slots',
    description: 'Number of medium power slots. Typically used for propulsion, EWAR, and support modules.',
    unit: '',
    category: 'resources',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  lowSlots: {
    id: 'lowSlots',
    name: 'Low Slots',
    description: 'Number of low power slots. Typically used for armor, hull, and passive resistance modules.',
    unit: '',
    category: 'resources',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
  engineSlots: {
    id: 'engineSlots',
    name: 'Engine Slots',
    description: 'Number of engine slots for propulsion systems. Engines provide capacitor recharge bonuses.',
    unit: '',
    category: 'resources',
    higherIsBetter: true,
    applicableTo: 'ship'
  },
};

// Module stat definitions
export const MODULE_STAT_DEFINITIONS: Record<string, StatDefinition> = {
  // Resource costs
  power: {
    id: 'power',
    name: 'Powergrid Need',
    description: 'Amount of powergrid required to fit and activate this module. Higher is more demanding.',
    unit: 'MW',
    category: 'resources',
    higherIsBetter: false,
    applicableTo: 'module'
  },
  cpu: {
    id: 'cpu',
    name: 'CPU Need',
    description: 'Amount of CPU required to fit this module. Higher is more demanding.',
    unit: 'TF',
    category: 'resources',
    higherIsBetter: false,
    applicableTo: 'module'
  },
  
  // Activation costs
  activationCost: {
    id: 'activationCost',
    name: 'Capacitor Usage',
    description: 'Amount of capacitor consumed per activation cycle. Lower is more efficient.',
    unit: 'GJ',
    category: 'capacitor',
    higherIsBetter: false,
    applicableTo: 'module'
  },
  duration: {
    id: 'duration',
    name: 'Duration',
    description: 'How long the module takes to complete one cycle. Some modules have ongoing effects rather than duration.',
    unit: 'ms',
    category: 'offense',
    higherIsBetter: false,
    applicableTo: 'module'
  },
  
  // Bonuses
  powergridBonus: {
    id: 'powergridBonus',
    name: 'Powergrid Bonus',
    description: 'Increases the ship\'s total powergrid. Additive bonus.',
    unit: 'MW',
    category: 'resources',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  cpuBonus: {
    id: 'cpuBonus',
    name: 'CPU Bonus',
    description: 'Increases the ship\'s total CPU. Additive bonus.',
    unit: 'TF',
    category: 'resources',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  capacityBonus: {
    id: 'capacityBonus',
    name: 'Capacitor Bonus',
    description: 'Increases the ship\'s capacitor capacity. Additive bonus.',
    unit: 'GJ',
    category: 'capacitor',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  speedMultiplier: {
    id: 'speedMultiplier',
    name: 'Speed Multiplier',
    description: 'Multiplies the ship\'s maximum velocity. Stacks multiplicatively with other speed bonuses.',
    unit: 'x',
    category: 'navigation',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  speedBonus: {
    id: 'speedBonus',
    name: 'Speed Bonus',
    description: 'Adds to the ship\'s maximum velocity. Additive bonus.',
    unit: 'm/s',
    category: 'navigation',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  
  // Shield/Armor bonuses
  shieldCapacity: {
    id: 'shieldCapacity',
    name: 'Shield Capacity Bonus',
    description: 'Adds to the ship\'s total shield HP.',
    unit: 'HP',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  armorHP: {
    id: 'armorHP',
    name: 'Armor HP Bonus',
    description: 'Adds to the ship\'s total armor HP.',
    unit: 'HP',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  shieldRechargeRateMultiplier: {
    id: 'shieldRechargeRateMultiplier',
    name: 'Shield Recharge Multiplier',
    description: 'Multiplies shield recharge rate. Higher is better.',
    unit: 'x',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  
  // Resistance bonuses (negative = better, increases resistance)
  emResistanceBonus: {
    id: 'emResistanceBonus',
    name: 'EM Resistance Bonus',
    description: 'Increases EM resistance. Negative values increase resistance (e.g., -16% means +16% EM resistance). Stacks with other resistance modules but subject to stacking penalties.',
    unit: '%',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  thermalResistanceBonus: {
    id: 'thermalResistanceBonus',
    name: 'Thermal Resistance Bonus',
    description: 'Increases thermal resistance. Negative values increase resistance.',
    unit: '%',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  kineticResistanceBonus: {
    id: 'kineticResistanceBonus',
    name: 'Kinetic Resistance Bonus',
    description: 'Increases kinetic resistance. Negative values increase resistance.',
    unit: '%',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  explosiveResistanceBonus: {
    id: 'explosiveResistanceBonus',
    name: 'Explosive Resistance Bonus',
    description: 'Increases explosive resistance. Negative values increase resistance.',
    unit: '%',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  
  // Engine specific
  capacitorRecharge: {
    id: 'capacitorRecharge',
    name: 'Capacitor Recharge',
    description: 'Provides additional capacitor recharge per second. Engines typically provide this bonus.',
    unit: 'GJ/s',
    category: 'capacitor',
    higherIsBetter: true,
    applicableTo: 'module'
  },
  rechargePenalty: {
    id: 'rechargePenalty',
    name: 'Recharge Penalty',
    description: 'Reduces the ship\'s base capacitor recharge. Lower (more negative) is worse.',
    unit: 'GJ/s',
    category: 'capacitor',
    higherIsBetter: false,
    applicableTo: 'module'
  },
  capacitorNeedMultiplier: {
    id: 'capacitorNeedMultiplier',
    name: 'Capacitor Need Multiplier',
    description: 'Multiplies the capacitor usage of the module. Higher values mean more capacitor drain.',
    unit: 'x',
    category: 'capacitor',
    higherIsBetter: false,
    applicableTo: 'module'
  },
  
  // Repair
  armorRepairAmount: {
    id: 'armorRepairAmount',
    name: 'Armor Repair Amount',
    description: 'Amount of armor HP restored per repair cycle.',
    unit: 'HP',
    category: 'defense',
    higherIsBetter: true,
    applicableTo: 'module'
  },
};

// Combined definitions for lookup
export const ALL_STAT_DEFINITIONS: Record<string, StatDefinition> = {
  ...SHIP_STAT_DEFINITIONS,
  ...MODULE_STAT_DEFINITIONS,
};

/**
 * Get stat definition by stat ID
 */
export function getStatDefinition(statId: string): StatDefinition | undefined {
  return ALL_STAT_DEFINITIONS[statId];
}

/**
 * Get all stat definitions for a category
 */
export function getStatsByCategory(category: StatDefinition['category']): StatDefinition[] {
  return Object.values(ALL_STAT_DEFINITIONS).filter(stat => stat.category === category);
}

/**
 * Format stat value with unit
 */
export function formatStatValue(value: number, statId: string): string {
  const def = ALL_STAT_DEFINITIONS[statId];
  if (!def) return value.toString();
  
  if (def.unit === '%') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (def.unit === 'x') {
    return `${value.toFixed(2)}x`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(value < 10 ? 2 : 0);
}
