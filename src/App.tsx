import React, { useState } from 'react';
import './App.css';
import ConnectWallet from './components/wallet/ConnectWallet';
import { useWalletConnection } from './hooks/useWalletConnection';
import { useTribeVerification } from './hooks/useTribeVerification';
import { useSmartCharacter } from './hooks/useSmartCharacter';
import { TribeHeader } from './components/layout/TribeHeader';
import { TribeTabs, TabId } from './components/layout/TribeTabs';
import { SmartAssembliesTab } from './components/assemblies/SmartAssembliesTab';
import { BlueprintsSection } from './components/blueprints/BlueprintsSection';
import { KillboardTab } from './components/killboard/KillboardTab';
import { FittingTab } from './components/fitting/FittingTab';

function App() {
  const { walletAddress, isConnected, availableWallets, handleConnect, handleDisconnect } = useWalletConnection();
  const { tribeName, accessLevel, hasAccess, isLoading, error } = useTribeVerification(walletAddress);
  const { name: characterName, isLoading: charLoading } = useSmartCharacter(walletAddress);
  const [activeTab, setActiveTab] = useState<TabId>("assemblies");

  if (!isConnected) {
    return <ConnectWallet handleConnect={handleConnect} availableWallets={availableWallets} />;
  }

  // Show loading state while checking tribe membership
  if (isLoading || charLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-xl mb-2">Verifying tribal membership...</div>
          <div className="text-sm text-foreground-muted">
            Checking on-chain data
          </div>
        </div>
      </div>
    );
  }

  // Block access if not a member of WOLF or AWAR tribes
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center border-2 border-error p-8 max-w-md">
          <h2 className="text-2xl font-bold text-error mb-4">Access Denied</h2>
          <p className="text-foreground-muted mb-4">
            This tribal hub is restricted to WOLF and AWAR tribe members only.
          </p>
          {tribeName ? (
            <p className="text-sm mb-4">
              Your character belongs to tribe: <span className="font-semibold">{tribeName}</span>
            </p>
          ) : (
            <p className="text-sm mb-4">
              Your character is not affiliated with any tribe.
            </p>
          )}
          <p className="text-xs text-foreground-muted mb-6">
            To gain access, join the WOLF or AWAR tribe in-game.
          </p>
          <button
            onClick={handleDisconnect}
            className="border-2 border-error px-4 py-2 text-white bg-error hover:bg-error/80 cursor-pointer"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Main tribal hub for authorized users
  return (
    <div className="mx-auto w-full max-w-[85%] px-4 py-4">
      {/* Tribal Header */}
      <TribeHeader
        address={walletAddress!}
        characterName={characterName}
        onDisconnect={handleDisconnect}
      />

      {/* Tab Navigation */}
      <TribeTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "assemblies" && (
          <SmartAssembliesTab walletAddress={walletAddress} />
        )}
        {activeTab === "fitting" && (
          <FittingTab />
        )}
        {activeTab === "blueprints" && (
          <BlueprintsSection walletAddress={walletAddress} />
        )}
        {activeTab === "killboard" && (
          <KillboardTab />
        )}
      </div>
    </div>
  );
}

export default App;
