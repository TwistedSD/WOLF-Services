import React from 'react';
import { Fitting } from './FittingTab';
import { getAllFittedModules, calculateUsedCPU, calculateUsedPowergrid } from '../../utils/fittingValidation';
import { calculateFittingStats, getStatDelta } from '../../utils/fittingStats';

interface StatsPanelProps {
  fitting: Fitting;
}

export function StatsPanel({ fitting }: StatsPanelProps) {
  if (!fitting.ship) {
    return (
      <div className="border-2 h-full flex items-center justify-center" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        <div className="text-center p-8">
          <p className="text-foreground-muted">Ship stats will appear here</p>
        </div>
      </div>
    );
  }

  const ship = fitting.ship;
  const stats = calculateFittingStats(fitting);

  // Calculate used resources
  const fittedModules = getAllFittedModules(fitting);
  const usedPowergrid = calculateUsedPowergrid(fittedModules);
  const usedCPU = calculateUsedCPU(fittedModules);

  // Use modified stats if available
  const totalPowergrid = stats?.powergrid || ship.powergrid || 0;
  const totalCPU = stats?.cpu || ship.cpu || 0;

  const pgPercentage = totalPowergrid > 0 ? (usedPowergrid / totalPowergrid) * 100 : 0;
  const cpuPercentage = totalCPU > 0 ? (usedCPU / totalCPU) * 100 : 0;

  const renderStatRow = (label: string, value: number | string, unit?: string, baseValue?: number) => {
    const hasBonus = baseValue !== undefined && typeof value === 'number' && Math.abs(value - baseValue) > 0.01;
    const delta = hasBonus ? getStatDelta(value as number, baseValue!) : null;

    return (
      <div className="flex justify-between py-1 border-b border-primary/20">
        <span className="text-foreground-muted text-sm">{label}</span>
        <span className="text-foreground font-semibold text-sm">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className="text-foreground-muted ml-1">{unit}</span>}
          {hasBonus && delta && (
            <span className={`ml-2 text-xs ${delta.isPositive ? 'text-success' : 'text-error'}`}>
              ({delta.isPositive ? '+' : ''}{delta.value.toFixed(1)})
            </span>
          )}
        </span>
      </div>
    );
  };

  const renderResourceBar = (
    label: string,
    used: number,
    total: number,
    percentage: number,
    colorClass: string
  ) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-foreground-muted">{label}</span>
        <span className={`font-semibold ${percentage > 100 ? 'text-error' : 'text-foreground'}`}>
          {used.toFixed(1)} / {total.toFixed(1)}
        </span>
      </div>
      <div className="w-full border h-4" style={{ backgroundColor: "var(--background)", borderColor: "var(--secondary)" }}>
        <div
          className={`h-full transition-all ${
            percentage > 100 ? 'bg-error' : colorClass
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="text-xs text-foreground-muted text-right mt-0.5">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );

  return (
    <div className="border-2 h-full flex flex-col" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
      {/* Header */}
      <div className="p-4 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        <h2 className="text-xl font-bold text-primary">Ship Stats</h2>
      </div>

      {/* Stats Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Resource Usage */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-3">Resources</h3>
          {renderResourceBar('Powergrid', usedPowergrid, totalPowergrid, pgPercentage, 'bg-primary')}
          {renderResourceBar('CPU', usedCPU, totalCPU, cpuPercentage, 'bg-info')}
        </div>

        {/* Capacitor */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2">Capacitor</h3>
          {renderStatRow('Capacity', stats?.capacitor || ship.capacitor || 0, 'GJ', ship.capacitor)}
          {renderStatRow('Recharge Time', stats?.capacitorRecharge || ship.capacitorRecharge || 0, 's', ship.capacitorRecharge)}
        </div>

        {/* Defense */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2">Defense</h3>
          {renderStatRow('Shield HP', stats?.shieldCapacity || ship.shieldCapacity || 0, undefined, ship.shieldCapacity)}
          {renderStatRow('Armor HP', stats?.armorHP || ship.armorHP || 0, undefined, ship.armorHP)}
          {renderStatRow('Hull HP', stats?.hullHP || ship.hullHP || 0, undefined, ship.hullHP)}
          {renderStatRow('Signature', (stats?.signatureRadius || ship.signatureRadius || 0).toFixed(2), 'm', ship.signatureRadius)}
        </div>

        {/* Resistances */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2">Resistances</h3>
          {renderStatRow('EM', (stats?.emResistance || ((1 - (ship.emDamageResonance || 1)) * 100)).toFixed(1), '%', ((1 - (ship.emDamageResonance || 1)) * 100))}
          {renderStatRow('Thermal', (stats?.thermalResistance || ((1 - (ship.thermalDamageResonance || 1)) * 100)).toFixed(1), '%', ((1 - (ship.thermalDamageResonance || 1)) * 100))}
          {renderStatRow('Kinetic', (stats?.kineticResistance || ((1 - (ship.kineticDamageResonance || 1)) * 100)).toFixed(1), '%', ((1 - (ship.kineticDamageResonance || 1)) * 100))}
          {renderStatRow('Explosive', (stats?.explosiveResistance || ((1 - (ship.explosiveDamageResonance || 1)) * 100)).toFixed(1), '%', ((1 - (ship.explosiveDamageResonance || 1)) * 100))}
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2">Navigation</h3>
          {renderStatRow('Max Velocity', stats?.maxVelocity || ship.maxVelocity || 0, 'm/s', ship.maxVelocity)}
          {renderStatRow('Mass', (stats?.mass || ship.mass || 0).toFixed(0), 'kg', ship.mass)}
        </div>

        {/* Targeting */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2">Targeting</h3>
          {renderStatRow('Max Targets', ship.maxLockedTargets || 0)}
          {renderStatRow('Scan Resolution', ship.scanResolution || 0, 'mm')}
        </div>

        {/* Fitted Modules */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2">Fitted Modules</h3>
          {renderStatRow('Total Modules', fittedModules.length)}
          {renderStatRow('High Slots', fitting.highSlots.filter(s => s).length + ' / ' + fitting.highSlots.length)}
          {renderStatRow('Mid Slots', fitting.midSlots.filter(s => s).length + ' / ' + fitting.midSlots.length)}
          {renderStatRow('Low Slots', fitting.lowSlots.filter(s => s).length + ' / ' + fitting.lowSlots.length)}
          {renderStatRow('Engine Slots', fitting.engineSlots.filter(s => s).length + ' / ' + fitting.engineSlots.length)}
        </div>
      </div>
    </div>
  );
}
