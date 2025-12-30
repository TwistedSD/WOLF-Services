import React, { useState } from 'react';
import { Fitting } from './FittingTab';
import { Module } from '../../hooks/useFittingData';
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
      <div className="border-2 h-full flex items-center justify-center" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        <div className="text-center p-8">
          <h2 className="text-xl font-bold text-primary mb-2">No Ship Selected</h2>
          <p className="text-foreground-muted">Select a ship from the list to begin fitting</p>
        </div>
      </div>
    );
  }

  const handleSlotClick = (slotType: string, index: number, occupied: boolean) => {
    // Always select the slot for fitting/replacing
    setSelectedSlot({ type: slotType, index });
    setSearchTerm(''); // Clear search when selecting new slot
  };

  const handleModuleSelect = (module: Module) => {
    if (selectedSlot) {
      onModuleFit(module, selectedSlot.type, selectedSlot.index);
      setSelectedSlot(null);
      setSearchTerm('');
    }
  };

  const getAvailableModules = () => {
    if (!selectedSlot || !fitting.ship) return [];

    const slotTypeMap: { [key: string]: string } = {
      high: 'high',
      mid: 'mid',
      low: 'low',
      engine: 'engine'
    };

    const targetSlotType = slotTypeMap[selectedSlot.type];

    // Get all fitted modules excluding the one in the currently selected slot
    const allFittedModules = getAllFittedModules(fitting);
    const fittedModulesExcludingCurrent = allFittedModules.filter(fm => {
      const slotKey = `${selectedSlot.type}Slots` as keyof Omit<Fitting, 'ship'>;
      const slots = fitting[slotKey] as any[];
      const moduleInSlot = slots[selectedSlot.index];
      return !(moduleInSlot && fm === moduleInSlot);
    });

    return modules
      .filter(m => {
        // Filter out unknown slot types and ensure slot type matches
        if (m.slotType === 'unknown') return false;
        return m.slotType === targetSlotType;
      })
      .filter(m => {
        // Check if module can actually fit
        const validation = canFitModule(fitting.ship!, m, selectedSlot.type, fittedModulesExcludingCurrent);
        return validation.canFit;
      })
      .filter(m =>
        searchTerm === '' ||
        m.typeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  };

  const getSlotColors = (slotType: string) => {
    const colorMap: { [key: string]: { text: string; borderSelected: string; bgSelected: string; borderOccupied: string; bgOccupied: string; bgOccupiedHover: string; borderEmpty: string } } = {
      high: {
        text: 'text-primary-light',
        borderSelected: 'border-primary-light',
        bgSelected: 'bg-primary-light/20',
        borderOccupied: 'border-primary-light/50',
        bgOccupied: 'bg-primary-light/10',
        bgOccupiedHover: 'hover:bg-primary-light/20',
        borderEmpty: 'hover:border-primary-light/50'
      },
      mid: {
        text: 'text-info',
        borderSelected: 'border-info',
        bgSelected: 'bg-info/20',
        borderOccupied: 'border-info/50',
        bgOccupied: 'bg-info/10',
        bgOccupiedHover: 'hover:bg-info/20',
        borderEmpty: 'hover:border-info/50'
      },
      low: {
        text: 'text-warning',
        borderSelected: 'border-warning',
        bgSelected: 'bg-warning/20',
        borderOccupied: 'border-warning/50',
        bgOccupied: 'bg-warning/10',
        bgOccupiedHover: 'hover:bg-warning/20',
        borderEmpty: 'hover:border-warning/50'
      },
      engine: {
        text: 'text-success',
        borderSelected: 'border-success',
        bgSelected: 'bg-success/20',
        borderOccupied: 'border-success/50',
        bgOccupied: 'bg-success/10',
        bgOccupiedHover: 'hover:bg-success/20',
        borderEmpty: 'hover:border-success/50'
      }
    };
    return colorMap[slotType] || colorMap.high;
  };

  const renderSlotSection = (
    title: string,
    slotType: string,
    slots: any[]
  ) => {
    if (slots.length === 0) return null;

    const colors = getSlotColors(slotType);

    return (
      <div className="mb-4">
        <div className={`text-sm font-bold mb-2 ${colors.text}`}>
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
                    ? `${colors.borderSelected} ${colors.bgSelected}`
                    : isOccupied
                    ? `${colors.borderOccupied} ${colors.bgOccupied} ${colors.bgOccupiedHover}`
                    : `border-secondary/30 ${colors.borderEmpty}`
                }`}
                style={!isSelected && !isOccupied ? { backgroundColor: "var(--background-light)" } : undefined}
              >
                {isOccupied ? (
                  <span className="text-foreground">{slot.module.typeName}</span>
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
    <div className="border-2 h-full flex flex-col" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
      {/* Header */}
      <div className="p-4 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
        <h2 className="text-xl font-bold text-primary">{fitting.ship.typeName}</h2>
        <div className="text-sm text-foreground-muted mt-1">
          Group ID: {fitting.ship.groupId}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Fitting Slots */}
        <div className="flex-1 p-4 overflow-y-auto border-r-2" style={{ borderColor: "var(--primary)" }}>
          {renderSlotSection('High Slots', 'high', fitting.highSlots)}
          {renderSlotSection('Mid Slots', 'mid', fitting.midSlots)}
          {renderSlotSection('Low Slots', 'low', fitting.lowSlots)}
          {renderSlotSection('Engine Slots', 'engine', fitting.engineSlots)}
        </div>

        {/* Module Selection Panel */}
        <div className="w-80 p-4 flex flex-col" style={{ backgroundColor: "var(--background-light)" }}>
          {selectedSlot ? (
            <>
              <div className="mb-3">
                <div className="text-sm font-bold text-primary mb-2">
                  {(() => {
                    const slotKey = `${selectedSlot.type}Slots` as keyof Omit<Fitting, 'ship'>;
                    const slots = fitting[slotKey] as any[];
                    const moduleInSlot = slots[selectedSlot.index];
                    return moduleInSlot
                      ? `Replace Module in ${selectedSlot.type.toUpperCase()} Slot ${selectedSlot.index + 1}`
                      : `Select Module for ${selectedSlot.type.toUpperCase()} Slot ${selectedSlot.index + 1}`;
                  })()}
                </div>
                {(() => {
                  const slotKey = `${selectedSlot.type}Slots` as keyof Omit<Fitting, 'ship'>;
                  const slots = fitting[slotKey] as any[];
                  const moduleInSlot = slots[selectedSlot.index];
                  if (moduleInSlot) {
                    return (
                      <div className="mb-2 p-2 border-2 border-warning bg-warning/10 text-sm">
                        <div className="text-foreground-muted">Current:</div>
                        <div className="text-foreground font-semibold">{moduleInSlot.module.typeName}</div>
                      </div>
                    );
                  }
                  return null;
                })()}
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 border-2 text-foreground placeholder-foreground-muted text-sm focus:border-primary"
                  style={{ backgroundColor: "var(--background)", borderColor: "var(--secondary)" }}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {getAvailableModules().map(module => (
                  <button
                    key={module.typeId}
                    onClick={() => handleModuleSelect(module)}
                    className="w-full p-2 border-2 text-left text-sm transition-colors border-secondary/30 hover:border-primary hover:bg-primary/10 cursor-pointer"
                    style={{ backgroundColor: "var(--background-light)" }}
                  >
                    <div className="font-semibold text-foreground">
                      {module.typeName}
                    </div>
                    <div className="text-xs text-foreground-muted mt-1">
                      {module.power && `PG: ${module.power}`}
                      {module.cpu && ` | CPU: ${module.cpu}`}
                    </div>
                  </button>
                ))}

                {getAvailableModules().length === 0 && (
                  <div className="text-center text-foreground-muted text-sm p-4">
                    No modules available
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {(() => {
                  const slotKey = `${selectedSlot.type}Slots` as keyof Omit<Fitting, 'ship'>;
                  const slots = fitting[slotKey] as any[];
                  const moduleInSlot = slots[selectedSlot.index];
                  if (moduleInSlot) {
                    return (
                      <button
                        onClick={() => {
                          onModuleRemove(selectedSlot.type, selectedSlot.index);
                          setSelectedSlot(null);
                        }}
                        className="flex-1 p-2 border-2 border-error text-error hover:bg-error hover:text-foreground transition-colors"
                      >
                        Remove
                      </button>
                    );
                  }
                  return null;
                })()}
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="flex-1 p-2 border-2 border-secondary text-secondary hover:bg-secondary hover:text-background transition-colors"
                >
                  Cancel
                </button>
              </div>
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
