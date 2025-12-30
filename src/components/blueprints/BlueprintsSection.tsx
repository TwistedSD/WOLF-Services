import React from "react";
import { BlueprintsTab } from "./BlueprintsTab";

interface BlueprintsSectionProps {
  walletAddress: string | null;
}

export const BlueprintsSection: React.FC<BlueprintsSectionProps> = ({ walletAddress }) => {
  return <BlueprintsTab walletAddress={walletAddress} />;
};

export default BlueprintsSection;
