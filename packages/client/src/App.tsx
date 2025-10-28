//@ts-nocheck
import React from "react";
import { Outlet } from "react-router-dom";

import "./App.css";

import { useConnection } from "src/providers/wallet";
import ConnectWallet from "@/components/wallet/ConnectWallet";
import { MudProvider } from "./providers/mud";

import { Toaster } from "@/components/ui/Sonner";
import SmartAssembliesAccordion from "@/components/assemblies/SmartAssembliesAccordion";
import SiteHeader from "@/components/layout/SiteHeader";

const App = () => {
  const {
    connectedProvider,
    handleConnect,
    handleDisconnect,
    availableWallets,
  } = useConnection();

  const { connected } = connectedProvider;

  if (!connected) {
    return (
      <ConnectWallet
        handleConnect={handleConnect}
        availableWallets={availableWallets}
      />
    );
  }

  return (
    <React.Fragment>
      <MudProvider>
        <AppContent />
      </MudProvider>
      <Toaster />
    </React.Fragment>
  );
};

export default App;

// Split out content area
const AppContent: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-[75%] px-4">
      {/* Global site header */}
      <SiteHeader />

      {/* Routed content area */}
      <Outlet />
    </div>
  );
};
