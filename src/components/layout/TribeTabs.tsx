import React from "react";

export type TabId = "assemblies" | "fitting" | "blueprints" | "killboard";

interface TribeTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: "assemblies", label: "Smart Assemblies" },
  { id: "fitting", label: "Fitting Tool" },
  { id: "blueprints", label: "Blueprints" },
  { id: "killboard", label: "Killboard" },
];

export const TribeTabs: React.FC<TribeTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex gap-2 border-b border-primary pb-2 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 transition-colors font-semibold
            ${
              activeTab === tab.id
                ? "bg-primary text-white border-2 border-primary border-b-0"
                : "bg-background-light text-foreground-muted border-2 border-background-light hover:border-primary-lighter"
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default React.memo(TribeTabs);
