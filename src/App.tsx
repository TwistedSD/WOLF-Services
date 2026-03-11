import React, { useState } from "react";
import "./App.css";
import ConnectWallet from "./components/wallet/ConnectWallet";
import { useWalletConnection } from "./hooks/useWalletConnection";
import { useTribeVerification } from "./hooks/useTribeVerification";
import { useSmartCharacter } from "./hooks/useSmartCharacter";
import { TribeHeader } from "./components/layout/TribeHeader";
import { TribeTabs, TabId } from "./components/layout/TribeTabs";
import { SmartAssembliesTab } from "./components/assemblies/SmartAssembliesTab";
import { BlueprintsSection } from "./components/blueprints/BlueprintsSection";
import { KillboardTab } from "./components/killboard/KillboardTab";
import { FittingTab } from "./components/fitting/FittingTab";

function App() {
  // TEMPORARY: Disable MetaMask login and tribe check, always show main content
  const [activeTab, setActiveTab] = useState<TabId>("assemblies");

  return (
    <div className="mx-auto w-full max-w-[85%] px-4 py-4">
      {/* Tribal Header (disabled) */}
      {/* <TribeHeader
        address={walletAddress!}
        characterName={characterName}
        onDisconnect={handleDisconnect}
      /> */}

      {/* Tab Navigation */}
      <TribeTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "assemblies" && (
          <SmartAssembliesTab walletAddress={undefined} />
        )}
        {activeTab === "fitting" && <FittingTab />}
        {activeTab === "blueprints" && (
          <BlueprintsSection walletAddress={undefined} />
        )}
        {activeTab === "killboard" && <KillboardTab />}
      </div>
    </div>
  );
}

export default App;
