import React, { useState } from 'react';
import { Fitting } from './FittingTab';
import { Module } from '../../hooks/useFittingData';
import { X, AlertCircle } from 'lucide-react';
import { canFitModule, getAllFittedModules } from '../../utils/fittingValidation';

interface FittingWindowProps {
  fitting: Fitting;
  modules: Module[];
  onModuleFit: (module: Module, slotType: string, slotIndex: number) => void;
  onModuleRemove: (slotType: string, slotIndex: number) => void;
}

export function FittingWindow({ fitting, modules, onModuleFit, onModuleRemove }: FittingWindowProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ type: string; index: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!fitting.ship) {
    return (
      <div className="border-2 border-primary bg-background h-full flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold text-primary mb-2">No Ship Selected</h2>
          <p className="text-foreground-muted">Select a ship from the list to begin fitting</p>
        </div>
      </div>
    );
  }

  const handleSlotClick = (slotType: string, index: number, occupied: boolean) => {
    if (occupied) {
      // Remove module if slot is occupied
      onModuleRemove(slotType, index);
      setSelectedSlot(null);
    } else {
      // Select slot for fitting
      setSelectedSlot({ type: slotType, index });
      setSearchTerm(''); // Clear search when selecting new slot
    }
  };

  const handleModuleSelect = (module: Module) => {
    if (selectedSlot) {
      onModuleFit(module, selectedSlot.type, selectedSlot.index);
      setSelectedSlot(null);
      setSearchTerm('');
    }
  };

  const getAvailableModules = () => {
    if (!selectedSlot) return [];

    const slotTypeMap: { [key: string]: string } = {
      high: 'high',
      mid: 'mid',
      low: 'low',
      engine: 'engine'
    };

    const targetSlotType = slotTypeMap[selectedSlot.type];
    return modules
      .filter(m => m.slotType === targetSlotType)
      .filter(m =>
        searchTerm === '' ||
        m.typeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  };

  const renderSlotSection = (
    title: string,
    slotType: string,
    slots: any[],
    color: string
  ) => {
    if (slots.length === 0) return null;

    return (
      <div className="mb-4">
        <div className={`text-sm font-bold mb-2 text-${color}`}>
          {title} ({slots.filter(s => s !== null).length}/{slots.length})
        </div>
        <div className="space-y-1">
          {slots.map((slot, index) => {
            const isOccupied = slot !== null;
            const isSelected = selectedSlot?.type === slotType && selectedSlot?.index === index;

            return (
              <button
                key={index}
                onClick={() => handleSlotClick(slotType, index, isOccupied)}
                className={`w-full p-2 border-2 text-left text-sm transition-colors ${
                  isSelected
                    ? `border-${color} bg-${color}/20`
                    : isOccupied
                    ? `border-${color}/50 bg-${color}/10 hover:bg-${color}/20`
                    : `border-secondary/30 bg-background-light hover:border-${color}/50`
                }`}
              >
                {isOccupied ? (
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">{slot.module.typeName}</span>
                    <X size={14} className="text-error" />
                  </div>
                ) : (
                  <span className="text-foreground-muted">[Empty {title.slice(0, -6)} Slot]</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="border-2 border-primary bg-background h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-2 border-primary">
        <h2 className="text-xl font-bold text-primary">{fitting.ship.typeName}</h2>
        <div className="text-sm text-foreground-muted mt-1">
          Group ID: {fitting.ship.groupId}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Fitting Slots */}
        <div className="flex-1 p-4 overflow-y-auto border-r-2 border-primary">
          {renderSlotSection('High Slots', 'high', fitting.highSlots, 'primary-light')}
          {renderSlotSection('Mid Slots', 'mid', fitting.midSlots, 'info')}
          {renderSlotSection('Low Slots', 'low', fitting.lowSlots, 'warning')}
          {renderSlotSection('Engine Slots', 'engine', fitting.engineSlots, 'success')}
        </div>

        {/* Module Selection Panel */}
        <div className="w-80 p-4 bg-background-light flex flex-col">
          {selectedSlot ? (
            <>
              <div className="mb-3">
                <div className="text-sm font-bold text-primary mb-2">
                  Select Module for {selectedSlot.type.toUpperCase()} Slot {selectedSlot.index + 1}
                </div>
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 bg-background border-2 border-secondary text-foreground placeholder-foreground-muted text-sm focus:border-primary"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {getAvailableModules().map(module => {
                  const fittedModules = getAllFittedModules(fitting);
                  const validation = fitting.ship
                    ? canFitModule(fitting.ship, module, selectedSlot?.type || '', fittedModules)
                    : { canFit: true };

                  return (
                    <button
                      key={module.typeId}
                      onClick={() => validation.canFit && handleModuleSelect(module)}
                      disabled={!validation.canFit}
                      className={`w-full p-2 border-2 text-left text-sm transition-colors ${
                        validation.canFit
                          ? 'border-secondary/30 bg-background hover:border-primary hover:bg-primary/10 cursor-pointer'
                          : 'border-error/30 bg-error/5 cursor-not-allowed opacity-60'
                      }`}
                      title={validation.reason}
                    >
                      <div className={`font-semibold flex items-center gap-2 ${
                        validation.canFit ? 'text-foreground' : 'text-error'
                      }`}>
                        {!validation.canFit && <AlertCircle size={14} />}
                        {module.typeName}
                      </div>
                      <div className="text-xs text-foreground-muted mt-1">
                        {module.power && `PG: ${module.power}`}
                        {module.cpu && ` | CPU: ${module.cpu}`}
                      </div>
                      {!validation.canFit && validation.reason && (
                        <div className="text-xs text-error mt-1">
                          {validation.reason}
                        </div>
                      )}
                    </button>
                  );
                })}

                {getAvailableModules().length === 0 && (
                  <div className="text-center text-foreground-muted text-sm p-4">
                    No modules available
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedSlot(null)}
                className="mt-3 w-full p-2 border-2 border-error text-error hover:bg-error hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-foreground-muted text-sm p-4">
              Click on an empty slot to fit a module
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
