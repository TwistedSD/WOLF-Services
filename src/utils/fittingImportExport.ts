import { Fitting, FittedModule } from '../components/fitting/FittingTab';
import { Ship, Module, Charge } from '../hooks/useFittingData';

/**
 * Export a fitting to game-compatible text format
 */
export function exportFitting(fitting: Fitting): string {
  if (!fitting.ship) {
    throw new Error('No ship selected');
  }

  const lines: string[] = [];

  // Header: [Ship Name, Faction]
  lines.push(`[${fitting.ship.typeName}, *Combat]`);

  // Low slots
  fitting.lowSlots.forEach(slot => {
    if (slot && slot.module) {
      lines.push(slot.module.typeName);
    }
  });
  lines.push(''); // Empty line after low slots

  // Mid slots
  fitting.midSlots.forEach(slot => {
    if (slot && slot.module) {
      lines.push(slot.module.typeName);
    }
  });
  lines.push(''); // Empty line after mid slots

  // High slots
  fitting.highSlots.forEach(slot => {
    if (slot && slot.module) {
      lines.push(slot.module.typeName);
    }
  });
  lines.push(''); // Empty line after high slots

  // Engine slots
  fitting.engineSlots.forEach(slot => {
    if (slot && slot.module) {
      lines.push(slot.module.typeName);
    }
  });
  lines.push(''); // Empty line after engine slots
  lines.push(''); // Extra empty line

  // Charges (aggregate by type)
  const chargeMap = new Map<string, number>();

  [...fitting.highSlots, ...fitting.midSlots, ...fitting.lowSlots, ...fitting.engineSlots].forEach(slot => {
    if (slot?.charge) {
      const count = chargeMap.get(slot.charge.typeName) || 0;
      chargeMap.set(slot.charge.typeName, count + 1);
    }
  });

  chargeMap.forEach((count, chargeName) => {
    // Default to 120 charges per weapon (or whatever quantity makes sense)
    lines.push(`${chargeName} x${count * 120}`);
  });

  return lines.join('\n');
}

/**
 * Parse game export format and return fitting data
 */
export function parseGameExport(text: string): {
  shipName: string;
  lowSlotModules: string[];
  midSlotModules: string[];
  highSlotModules: string[];
  engineModules: string[];
  charges: { name: string; quantity: number }[];
} {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0) {
    throw new Error('Empty import text');
  }

  // Parse ship name from first line [Ship Name, Faction]
  const headerMatch = lines[0].match(/^\[(.*?),\s*(.*?)\]$/);
  if (!headerMatch) {
    throw new Error('Invalid format: First line must be [Ship Name, Faction]');
  }

  const shipName = headerMatch[1].trim();
  const lowSlotModules: string[] = [];
  const midSlotModules: string[] = [];
  const highSlotModules: string[] = [];
  const engineModules: string[] = [];
  const charges: { name: string; quantity: number }[] = [];

  // Track which section we're in
  let currentSection = 'low';
  let emptyLineCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '') {
      emptyLineCount++;
      continue;
    }

    // Check if it's a charge line (ends with "x" followed by number)
    const chargeMatch = line.match(/^(.+?)\s+x(\d+)$/);
    if (chargeMatch) {
      charges.push({
        name: chargeMatch[1].trim(),
        quantity: parseInt(chargeMatch[2])
      });
      continue;
    }

    // Determine section based on empty line count
    // After 1 empty line: mid slots
    // After 2 empty lines: high slots
    // After 3 empty lines: engine slots
    if (emptyLineCount === 0) {
      currentSection = 'low';
    } else if (emptyLineCount === 1) {
      currentSection = 'mid';
    } else if (emptyLineCount === 2) {
      currentSection = 'high';
    } else {
      currentSection = 'engine';
    }

    // Add module to appropriate section
    switch (currentSection) {
      case 'low':
        lowSlotModules.push(line);
        break;
      case 'mid':
        midSlotModules.push(line);
        break;
      case 'high':
        highSlotModules.push(line);
        break;
      case 'engine':
        engineModules.push(line);
        break;
    }
  }

  return {
    shipName,
    lowSlotModules,
    midSlotModules,
    highSlotModules,
    engineModules,
    charges
  };
}

/**
 * Import a fitting from game export text
 * Returns a Fitting object or null if import fails
 */
export function importFitting(
  text: string,
  ships: Ship[],
  modules: Module[]
): { fitting: Fitting | null; errors: string[] } {
  const errors: string[] = [];

  try {
    const parsed = parseGameExport(text);

    // Find ship
    const ship = ships.find(s => s.typeName === parsed.shipName);
    if (!ship) {
      errors.push(`Ship not found: ${parsed.shipName}`);
      return { fitting: null, errors };
    }

    const fitting: Fitting = {
      ship,
      highSlots: new Array(ship.hiSlots || 0).fill(null),
      midSlots: new Array(ship.midSlots || 0).fill(null),
      lowSlots: new Array(ship.lowSlots || 0).fill(null),
      engineSlots: new Array(ship.engineSlots || 1).fill(null)
    };

    // Helper to find module by name
    const findModule = (name: string): Module | null => {
      const module = modules.find(m => m.typeName === name);
      if (!module) {
        errors.push(`Module not found: ${name}`);
      }
      return module || null;
    };

    // Helper to find charge by name
    const findCharge = (name: string, module: Module): Charge | null => {
      if (!module.compatibleCharges) return null;
      const charge = module.compatibleCharges.find(c => c.typeName === name);
      if (!charge) {
        errors.push(`Charge not compatible with module: ${name}`);
      }
      return charge || null;
    };

    // Import low slots
    parsed.lowSlotModules.forEach((moduleName, index) => {
      if (index >= fitting.lowSlots.length) {
        errors.push(`Too many low slot modules (ship has ${fitting.lowSlots.length})`);
        return;
      }
      const module = findModule(moduleName);
      if (module) {
        fitting.lowSlots[index] = { module, slotIndex: index, charge: null };
      }
    });

    // Import mid slots
    parsed.midSlotModules.forEach((moduleName, index) => {
      if (index >= fitting.midSlots.length) {
        errors.push(`Too many mid slot modules (ship has ${fitting.midSlots.length})`);
        return;
      }
      const module = findModule(moduleName);
      if (module) {
        fitting.midSlots[index] = { module, slotIndex: index, charge: null };
      }
    });

    // Import high slots
    parsed.highSlotModules.forEach((moduleName, index) => {
      if (index >= fitting.highSlots.length) {
        errors.push(`Too many high slot modules (ship has ${fitting.highSlots.length})`);
        return;
      }
      const module = findModule(moduleName);
      if (module) {
        fitting.highSlots[index] = { module, slotIndex: index, charge: null };
      }
    });

    // Import engine slots
    parsed.engineModules.forEach((moduleName, index) => {
      if (index >= fitting.engineSlots.length) {
        errors.push(`Too many engine modules (ship has ${fitting.engineSlots.length})`);
        return;
      }
      const module = findModule(moduleName);
      if (module) {
        fitting.engineSlots[index] = { module, slotIndex: index, charge: null };
      }
    });

    // Import charges (match to fitted modules)
    parsed.charges.forEach(({ name }) => {
      // Try to find a fitted module that can use this charge
      let chargeAssigned = false;

      const tryAssignCharge = (slots: (FittedModule | null)[]) => {
        for (const slot of slots) {
          if (slot && !slot.charge && slot.module.compatibleCharges) {
            const charge = findCharge(name, slot.module);
            if (charge) {
              slot.charge = charge;
              chargeAssigned = true;
              return true;
            }
          }
        }
        return false;
      };

      tryAssignCharge(fitting.highSlots) ||
      tryAssignCharge(fitting.midSlots) ||
      tryAssignCharge(fitting.lowSlots) ||
      tryAssignCharge(fitting.engineSlots);

      if (!chargeAssigned) {
        errors.push(`Could not assign charge: ${name}`);
      }
    });

    return { fitting, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during import');
    return { fitting: null, errors };
  }
}
