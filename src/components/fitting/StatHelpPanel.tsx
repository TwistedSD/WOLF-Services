import React, { useState } from "react";
import {
  getStatDefinition,
  getStatsByCategory,
  type StatDefinition,
} from "../../utils/statDefinitions";

interface StatHelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatHelpPanel({ isOpen, onClose }: StatHelpPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("defense");

  if (!isOpen) return null;

  const categories = [
    { id: "defense", label: "Defense" },
    { id: "capacitor", label: "Capacitor" },
    { id: "navigation", label: "Navigation" },
    { id: "targeting", label: "Targeting" },
    { id: "resources", label: "Resources" },
    { id: "offense", label: "Offense" },
  ];

  const currentStats = getStatsByCategory(
    selectedCategory as StatDefinition["category"],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] border-2 overflow-hidden flex flex-col"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: "var(--background-light)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 border-b-2 flex justify-between items-center"
          style={{
            borderColor: "var(--primary)",
            backgroundColor: "var(--background-lighter)",
          }}
        >
          <h2 className="text-xl font-bold text-primary">
            Stat Reference Guide
          </h2>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Category Tabs */}
        <div
          className="flex border-b"
          style={{ borderColor: "var(--secondary)" }}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? "text-primary border-b-2"
                  : "text-foreground-muted hover:text-foreground"
              }`}
              style={{
                borderColor:
                  selectedCategory === cat.id
                    ? "var(--primary)"
                    : "transparent",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {currentStats.map((stat) => (
              <div
                key={stat.id}
                className="p-3 border rounded"
                style={{
                  borderColor: "var(--secondary)",
                  backgroundColor: "var(--background)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-foreground">{stat.name}</span>
                  <span className="text-xs text-foreground-muted">
                    {stat.unit}
                  </span>
                </div>
                <p className="text-sm text-foreground-muted">
                  {stat.description}
                </p>
                <div className="mt-2 flex gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      stat.higherIsBetter
                        ? "bg-success/20 text-success"
                        : "bg-error/20 text-error"
                    }`}
                  >
                    {stat.higherIsBetter
                      ? "Higher is better"
                      : "Lower is better"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-3 border-t text-center text-xs text-foreground-muted"
          style={{ borderColor: "var(--secondary)" }}
        >
          Understanding ship stats helps you optimize your fitting for different
          gameplay styles
        </div>
      </div>
    </div>
  );
}

/**
 * Small inline tooltip component for individual stats
 */
interface StatTooltipProps {
  statId: string;
  children: React.ReactNode;
}

export function StatTooltip({ statId, children }: StatTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const definition = getStatDefinition(statId);

  if (!definition) return <>{children}</>;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 border-2 text-sm shadow-lg"
          style={{
            borderColor: "var(--primary)",
            backgroundColor: "var(--background-light)",
          }}
        >
          <div className="font-bold text-foreground mb-1">
            {definition.name}
          </div>
          <div className="text-foreground-muted text-xs">
            {definition.description}
          </div>
          <div
            className={`mt-2 text-xs ${
              definition.higherIsBetter ? "text-success" : "text-error"
            }`}
          >
            {definition.higherIsBetter
              ? "↑ Higher is better"
              : "↓ Lower is better"}
          </div>
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-8 border-r-8 border-t-8"
            style={{
              borderColor: `var(--primary) transparent transparent transparent`,
            }}
          />
        </div>
      )}
    </div>
  );
}
