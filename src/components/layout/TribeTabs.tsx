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
  const mapUrl = import.meta.env?.VITE_MAP_URL || "https://ef-map.com";

  return (
    <div className="flex items-center justify-between gap-2 border-b border-primary pb-2 mb-6">
      <div className="flex gap-2">
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
      <button
        aria-label="Open EF-Map"
        onClick={() => window.open(mapUrl, '_blank', 'noopener,noreferrer')}
        className="h-9 px-4 py-2 text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all cursor-pointer outline-none border-2 text-white"
        style={{
          backgroundColor: 'var(--primary-light)',
          borderColor: 'var(--primary)',
        }}
      >
        EF-Map
      </button>
    </div>
  );
};

export default React.memo(TribeTabs);
