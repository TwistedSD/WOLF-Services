import React, { useState } from "react";
import "./App.css";
import { ZkLoginButton } from "./components/wallet/ZkLoginButton";
import { ZkLoginCallback } from "./components/wallet/ZkLoginCallback";
import { TribeTabs, TabId } from "./components/layout/TribeTabs";
import { SmartAssembliesTab } from "./components/assemblies/SmartAssembliesTab";
import { BlueprintsSection } from "./components/blueprints/BlueprintsSection";
import { KillboardTab } from "./components/killboard/KillboardTab";
import { FittingTab } from "./components/fitting/FittingTab";

function App() {
  // Check if URL has OAuth response in hash or query params
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hasOAuthResponse =
    urlParams.has("id_token") || hashParams.has("id_token");

  // Check if this is the callback page
  const isCallback = window.location.pathname === "/zklogin-callback";

  // TEMPORARY: Disable MetaMask login and tribe check, always show main content
  const [activeTab, setActiveTab] = useState<TabId>("assemblies");

  // If this is the callback page or there's an OAuth response, show the callback component
  if (isCallback || hasOAuthResponse) {
    return <ZkLoginCallback />;
  }

  return (
    <div className="mx-auto w-full max-w-[85%] px-4 py-4">
      {/* Header with zkLogin Button */}
      <div className="flex justify-end items-center gap-4 mb-4">
        <ZkLoginButton />
      </div>

      {/* Tab Navigation */}
      <TribeTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "assemblies" && (
          <SmartAssembliesTab walletAddress={null} />
        )}
        {activeTab === "fitting" && <FittingTab />}
        {activeTab === "blueprints" && (
          <BlueprintsSection walletAddress={null} />
        )}
        {activeTab === "killboard" && <KillboardTab />}
      </div>
    </div>
  );
}

export default App;
