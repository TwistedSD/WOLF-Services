import React from 'react';
import { Ship } from '../../hooks/useFittingData';

interface ShipListProps {
  ships: Ship[];
  selectedShip: Ship | null;
  onShipSelect: (ship: Ship) => void;
}

export function ShipList({ ships, selectedShip, onShipSelect }: ShipListProps) {
  return (
    <div className="border-2 h-full flex flex-col" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-light)" }}>
      {/* Header */}
      <div className="px-3 py-2 border-b-2" style={{ borderColor: "var(--primary)", backgroundColor: "var(--background-lighter)" }}>
        <h3 className="text-sm font-semibold text-foreground">Ships</h3>
      </div>

      {/* Ship List */}
      <div className="flex-1 overflow-y-auto">
        {ships.length === 0 ? (
          <div className="p-4 text-center text-foreground-muted">
            No ships found
          </div>
        ) : (
          <div className="divide-y-2 divide-primary/20">
            {ships.map(ship => (
              <button
                key={ship.typeId}
                onClick={() => onShipSelect(ship)}
                className={`w-full p-3 text-left hover:bg-primary/10 transition-colors ${
                  selectedShip?.typeId === ship.typeId
                    ? 'bg-primary/20 border-l-4 border-primary'
                    : ''
                }`}
              >
                <div className="font-semibold text-foreground">
                  {ship.typeName}
                </div>
                <div className="text-xs text-foreground-muted mt-1">
                  Slots: {ship.hiSlots || 0}H / {ship.midSlots || 0}M / {ship.lowSlots || 0}L / {ship.engineSlots || 0}E
                </div>
                <div className="text-xs text-foreground-muted">
                  PG: {ship.powergrid?.toFixed(0) || 0} | CPU: {ship.cpu?.toFixed(0) || 0}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
