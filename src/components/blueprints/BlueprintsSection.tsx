import React, { useState } from "react";
import { BlueprintsTab } from "./BlueprintsTab";
import { CalculatorTab } from "./CalculatorTab";
import { ShipOptimizerTab } from "./ShipOptimizerTab";

interface BlueprintsSectionProps {
  walletAddress: string | null;
}

type BlueprintSubTab = "browse" | "calculator" | "ship-optimizer";

const subTabs: { id: BlueprintSubTab; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "calculator", label: "Calculator" },
  { id: "ship-optimizer", label: "Ship Optimizer" },
];

export const BlueprintsSection: React.FC<BlueprintsSectionProps> = ({ walletAddress }) => {
  const [activeSubTab, setActiveSubTab] = useState<BlueprintSubTab>("browse");

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-2 ${
              activeSubTab === tab.id
                ? "bg-primary text-white border-primary"
                : "bg-background-light text-foreground-muted border-background-lighter hover:border-primary-lighter"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      <div>
        {activeSubTab === "browse" && <BlueprintsTab walletAddress={walletAddress} />}
        {activeSubTab === "calculator" && <CalculatorTab walletAddress={walletAddress} />}
        {activeSubTab === "ship-optimizer" && <ShipOptimizerTab />}
      </div>
    </div>
  );
};

export default BlueprintsSection;
