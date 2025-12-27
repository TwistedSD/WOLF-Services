import React, { useState } from 'react';
import { Ship } from '../../hooks/useFittingData';

interface ShipListProps {
  ships: Ship[];
  selectedShip: Ship | null;
  onShipSelect: (ship: Ship) => void;
}

export function ShipList({ ships, selectedShip, onShipSelect }: ShipListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredShips = ships.filter(ship =>
    ship.typeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="border-2 border-primary bg-background h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-2 border-primary">
        <h2 className="text-xl font-bold text-primary mb-2">Ships</h2>
        <input
          type="text"
          placeholder="Search ships..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1 bg-background-lighter border-2 border-secondary text-foreground placeholder-foreground-muted focus:border-primary"
        />
      </div>

      {/* Ship List */}
      <div className="flex-1 overflow-y-auto">
        {filteredShips.length === 0 ? (
          <div className="p-4 text-center text-foreground-muted">
            No ships found
          </div>
        ) : (
          <div className="divide-y-2 divide-primary/20">
            {filteredShips.map(ship => (
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
