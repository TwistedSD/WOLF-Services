import { Ship, Module } from '../hooks/useFittingData';
import { FittedModule } from '../components/fitting/FittingTab';

/**
 * Validates if a module can be fitted to a ship in a specific slot
 */
export function canFitModule(
  ship: Ship,
  module: Module,
  slotType: string,
  fittedModules: FittedModule[]
): { canFit: boolean; reason?: string } {
  // 1. Check ship group compatibility
  const shipGroupAttrs = [
    module.canFitShipGroup01,
    module.canFitShipGroup02,
    module.canFitShipGroup03
  ].filter(g => g !== undefined);

  if (shipGroupAttrs.length > 0 && !shipGroupAttrs.includes(ship.groupId)) {
    return {
      canFit: false,
      reason: `This module cannot be fitted to ship group ${ship.groupId}`
    };
  }

  // 2. Check maxGroupFitted restriction
  if (module.maxGroupFitted !== undefined) {
    const sameGroupCount = fittedModules.filter(
      fm => fm.module.groupId === module.groupId
    ).length;

    if (sameGroupCount >= module.maxGroupFitted) {
      return {
        canFit: false,
        reason: `Maximum ${module.maxGroupFitted} of this module type can be fitted`
      };
    }
  }

  // 3. Check CPU availability
  const usedCPU = fittedModules.reduce((sum, fm) => sum + (fm.module.cpu || 0), 0);
  const availableCPU = (ship.cpu || 0) - usedCPU;
  const requiredCPU = module.cpu || 0;

  if (requiredCPU > availableCPU) {
    return {
      canFit: false,
      reason: `Insufficient CPU (need ${requiredCPU.toFixed(1)}, available ${availableCPU.toFixed(1)})`
    };
  }

  // 4. Check Powergrid availability
  const usedPG = fittedModules.reduce((sum, fm) => sum + (fm.module.power || 0), 0);
  const availablePG = (ship.powergrid || 0) - usedPG;
  const requiredPG = module.power || 0;

  if (requiredPG > availablePG) {
    return {
      canFit: false,
      reason: `Insufficient Powergrid (need ${requiredPG.toFixed(1)}, available ${availablePG.toFixed(1)})`
    };
  }

  return { canFit: true };
}

/**
 * Calculate total CPU usage
 */
export function calculateUsedCPU(fittedModules: FittedModule[]): number {
  return fittedModules.reduce((sum, fm) => sum + (fm.module.cpu || 0), 0);
}

/**
 * Calculate total Powergrid usage
 */
export function calculateUsedPowergrid(fittedModules: FittedModule[]): number {
  return fittedModules.reduce((sum, fm) => sum + (fm.module.power || 0), 0);
}

/**
 * Get all fitted modules from a fitting
 */
export function getAllFittedModules(fitting: {
  highSlots: (FittedModule | null)[];
  midSlots: (FittedModule | null)[];
  lowSlots: (FittedModule | null)[];
  engineSlots: (FittedModule | null)[];
}): FittedModule[] {
  return [
    ...fitting.highSlots,
    ...fitting.midSlots,
    ...fitting.lowSlots,
    ...fitting.engineSlots
  ].filter((slot): slot is FittedModule => slot !== null);
}
