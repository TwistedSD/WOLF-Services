import React, { useState } from 'react';
import { useFittingData, Ship, Module, Charge } from '../../hooks/useFittingData';
import { ShipList } from './ShipList';
import { FittingWindow } from './FittingWindow';
import { StatsPanel } from './StatsPanel';

export interface FittedModule {
  module: Module;
  slotIndex: number;
  charge?: Charge | null;
}

export interface Fitting {
  ship: Ship | null;
  highSlots: (FittedModule | null)[];
  midSlots: (FittedModule | null)[];
  lowSlots: (FittedModule | null)[];
  engineSlots: (FittedModule | null)[];
}

export function FittingTab() {
  const { ships, modules, isLoading, error } = useFittingData();
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);
  const [fitting, setFitting] = useState<Fitting>({
    ship: null,
    highSlots: [],
    midSlots: [],
    lowSlots: [],
    engineSlots: []
  });

  const handleShipSelect = (ship: Ship) => {
    setSelectedShip(ship);

    // Initialize empty slots based on ship's slot counts
    setFitting({
      ship,
      highSlots: Array(ship.hiSlots || 0).fill(null),
      midSlots: Array(ship.midSlots || 0).fill(null),
      lowSlots: Array(ship.lowSlots || 0).fill(null),
      engineSlots: Array(ship.engineSlots || 0).fill(null)
    });
  };

  const handleModuleFit = (module: Module, slotType: string, slotIndex: number) => {
    setFitting(prev => {
      const newFitting = { ...prev };
      const slotKey = `${slotType}Slots` as keyof Omit<Fitting, 'ship'>;
      const slots = [...(newFitting[slotKey] as (FittedModule | null)[])];

      // Replace module in slot (whether empty or occupied)
      slots[slotIndex] = { module, slotIndex };
      newFitting[slotKey] = slots as any;

      return newFitting;
    });
  };

  const handleModuleRemove = (slotType: string, slotIndex: number) => {
    setFitting(prev => {
      const newFitting = { ...prev };
      const slotKey = `${slotType}Slots` as keyof Omit<Fitting, 'ship'>;
      const slots = [...(newFitting[slotKey] as (FittedModule | null)[])];
      slots[slotIndex] = null;
      newFitting[slotKey] = slots as any;

      return newFitting;
    });
  };

  const handleChargeFit = (charge: Charge, slotType: string, slotIndex: number) => {
    setFitting(prev => {
      const newFitting = { ...prev };
      const slotKey = `${slotType}Slots` as keyof Omit<Fitting, 'ship'>;
      const slots = [...(newFitting[slotKey] as (FittedModule | null)[])];

      if (slots[slotIndex]) {
        slots[slotIndex] = {
          ...slots[slotIndex]!,
          charge
        };
      }

      newFitting[slotKey] = slots as any;
      return newFitting;
    });
  };

  const handleChargeRemove = (slotType: string, slotIndex: number) => {
    setFitting(prev => {
      const newFitting = { ...prev };
      const slotKey = `${slotType}Slots` as keyof Omit<Fitting, 'ship'>;
      const slots = [...(newFitting[slotKey] as (FittedModule | null)[])];

      if (slots[slotIndex]) {
        slots[slotIndex] = {
          ...slots[slotIndex]!,
          charge: null
        };
      }

      newFitting[slotKey] = slots as any;
      return newFitting;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-xl mb-2">Loading fitting data...</div>
          <div className="text-sm text-foreground-muted">
            Retrieving ships and modules
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center border-2 border-error p-8 max-w-md">
          <h2 className="text-2xl font-bold text-error mb-4">Error</h2>
          <p className="text-foreground-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-4">
        {/* Ship List - Left Panel */}
        <div className="col-span-3">
          <ShipList
            ships={ships}
            selectedShip={selectedShip}
            onShipSelect={handleShipSelect}
          />
        </div>

        {/* Fitting Window - Middle Panel */}
        <div className="col-span-6">
          <FittingWindow
            fitting={fitting}
            modules={modules}
            onModuleFit={handleModuleFit}
            onModuleRemove={handleModuleRemove}
            onChargeFit={handleChargeFit}
            onChargeRemove={handleChargeRemove}
          />
        </div>

        {/* Stats Panel - Right Panel */}
        <div className="col-span-3">
          <StatsPanel fitting={fitting} />
        </div>
      </div>
    </div>
  );
}
