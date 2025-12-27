import React from 'react';
import { Fitting } from './FittingTab';
import { getAllFittedModules, calculateUsedCPU, calculateUsedPowergrid } from '../../utils/fittingValidation';

interface StatsPanelProps {
  fitting: Fitting;
}

export function StatsPanel({ fitting }: StatsPanelProps) {
  if (!fitting.ship) {
    return (
      <div className="border-2 border-primary bg-background h-full flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-foreground-muted">Ship stats will appear here</p>
        </div>
      </div>
    );
  }

  const ship = fitting.ship;

  // Calculate used resources
  const fittedModules = getAllFittedModules(fitting);
  const usedPowergrid = calculateUsedPowergrid(fittedModules);
  const usedCPU = calculateUsedCPU(fittedModules);

  const totalPowergrid = ship.powergrid || 0;
  const totalCPU = ship.cpu || 0;

  const pgPercentage = totalPowergrid > 0 ? (usedPowergrid / totalPowergrid) * 100 : 0;
  const cpuPercentage = totalCPU > 0 ? (usedCPU / totalCPU) * 100 : 0;

  const renderStatRow = (label: string, value: number | string, unit?: string) => (
    <div className="flex justify-between py-1 border-b border-primary/20">
      <span className="text-foreground-muted text-sm">{label}</span>
      <span className="text-foreground font-semibold text-sm">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-foreground-muted ml-1">{unit}</span>}
      </span>
    </div>
  );

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
      <div className="w-full bg-background-lighter border border-secondary/30 h-4">
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
    <div className="border-2 border-primary bg-background h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-2 border-primary">
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
          {renderStatRow('Capacity', ship.capacitor || 0, 'GJ')}
          {renderStatRow('Recharge Time', ship.capacitorRecharge || 0, 's')}
        </div>

        {/* Defense */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2">Defense</h3>
          {renderStatRow('Shield HP', ship.shieldCapacity || 0)}
          {renderStatRow('Armor HP', ship.armorHP || 0)}
          {renderStatRow('Hull HP', ship.hullHP || 0)}
          {renderStatRow('Signature', ship.signatureRadius?.toFixed(2) || '0', 'm')}
        </div>

        {/* Resistances */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2">Resistances</h3>
          {renderStatRow('EM', ((1 - (ship.emDamageResonance || 1)) * 100).toFixed(1), '%')}
          {renderStatRow('Thermal', ((1 - (ship.thermalDamageResonance || 1)) * 100).toFixed(1), '%')}
          {renderStatRow('Kinetic', ((1 - (ship.kineticDamageResonance || 1)) * 100).toFixed(1), '%')}
          {renderStatRow('Explosive', ((1 - (ship.explosiveDamageResonance || 1)) * 100).toFixed(1), '%')}
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-primary mb-2">Navigation</h3>
          {renderStatRow('Max Velocity', ship.maxVelocity || 0, 'm/s')}
          {renderStatRow('Mass', ship.mass?.toFixed(0) || '0', 'kg')}
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
