import React, { useState } from 'react';
import { useFittingData, Ship, Module, Charge } from '../../hooks/useFittingData';
import { ShipList } from './ShipList';
import { FittingWindow } from './FittingWindow';
import { StatsPanel } from './StatsPanel';
import { ImportExportModal } from './ImportExportModal';

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
  const [importExportModal, setImportExportModal] = useState<{
    isOpen: boolean;
    mode: 'import' | 'export';
  }>({ isOpen: false, mode: 'export' });

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

  const handleImportFitting = (importedFitting: Fitting) => {
    setFitting(importedFitting);
    setSelectedShip(importedFitting.ship);
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
      {/* Import/Export Buttons */}
      <div className="mb-4 flex gap-2 justify-end">
        <button
          onClick={() => setImportExportModal({ isOpen: true, mode: 'import' })}
          className="px-4 py-2 border-2 border-primary bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        >
          Import Fitting
        </button>
        <button
          onClick={() => setImportExportModal({ isOpen: true, mode: 'export' })}
          disabled={!fitting.ship}
          className="px-4 py-2 border-2 border-secondary bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export Fitting
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Ship List - Left Panel */}
        <div className="col-span-3 h-full">
          <ShipList
            ships={ships}
            selectedShip={selectedShip}
            onShipSelect={handleShipSelect}
          />
        </div>

        {/* Fitting Window - Middle Panel */}
        <div className="col-span-6 h-full">
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
        <div className="col-span-3 h-full">
          <StatsPanel fitting={fitting} />
        </div>
      </div>

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={importExportModal.isOpen}
        onClose={() => setImportExportModal({ ...importExportModal, isOpen: false })}
        mode={importExportModal.mode}
        fitting={fitting}
        ships={ships}
        modules={modules}
        onImport={handleImportFitting}
      />
    </div>
  );
}
