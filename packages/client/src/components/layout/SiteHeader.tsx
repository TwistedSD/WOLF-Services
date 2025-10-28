import React from "react";
import { Button } from "@/components/ui/Button";
import { useConnection } from "@/providers/wallet";
import { useSmartCharacter } from "@/hooks/useSmartCharacter";
import { LogOut } from "lucide-react";
import PrimaryLogo from "src/assets/Primary.png";
import { useNavigate } from "react-router-dom";

function useConnectedAddress(): string | null {
  const conn = useConnection() as any;
  const wcAccount = conn?.walletClient?.account;
  const wcAddress =
    typeof wcAccount === "string"
      ? wcAccount
      : wcAccount &&
        typeof wcAccount === "object" &&
        typeof wcAccount.address === "string"
      ? wcAccount.address
      : undefined;

  const direct =
    wcAddress ||
    (conn?.connectedProvider as any)?.provider?.selectedAddress ||
    conn?.account ||
    conn?.address ||
    conn?.selectedAccount ||
    conn?.connectedProvider?.account ||
    conn?.connectedProvider?.address ||
    (Array.isArray(conn?.connectedProvider?.accounts)
      ? conn.connectedProvider.accounts[0]
      : undefined) ||
    (Array.isArray(conn?.accounts) ? conn.accounts[0] : undefined);
  const addr = typeof direct === "string" ? direct : null;
  return addr && addr.startsWith("0x") ? addr.toLowerCase() : null;
}

const SiteHeader: React.FC = () => {
  const address = useConnectedAddress();
  const { connectedProvider, handleDisconnect } = useConnection();
  const isConnected = connectedProvider?.connected === true || !!address;
  const {
    id: characterId,
    name: characterName,
    isLoading: scLoading,
    error: scError,
  } = useSmartCharacter(address);
  const navigate = useNavigate();
  const mapUrl =
    (import.meta as any)?.env?.VITE_MAP_URL || "https://ef-map.com";

  return (
    <div
      className="mt-4 border rounded p-4 mb-6"
      style={{ borderColor: "var(--primary)" }}
      role="banner"
    >
      {/* Row 1: Brand left, account info right */}
      <div className="flex items-center justify-between gap-4 min-h-[72px]">
        <div className="flex items-center gap-3">
          <img
            src={PrimaryLogo}
            alt="Logo"
            className="h-12 w-12 object-contain"
          />
          <div className="text-base font-semibold">WOLF Services</div>
        </div>
        <div className="flex items-center gap-3">
          {scLoading && (
            <div className="text-sm text-muted-foreground">
              Loading Smart Character…
            </div>
          )}
          {!scLoading && scError && (
            <div className="text-sm text-red-500">
              Failed to load Smart Character: {scError}
            </div>
          )}
          {!scLoading && !scError && characterId && (
            <div className="text-sm">
              Smart Character:{" "}
              <span className="font-semibold">
                {characterName ?? `#${characterId}`}
              </span>
            </div>
          )}
          {isConnected ? (
            <Button
              size="sm"
              variant="ghost"
              className="bg-primary-light border-2 border-primary text-white rounded-md"
              onClick={() => handleDisconnect()}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="size-4" />
              <span className="sr-only">Log out</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Row 2: Button bar aligned left */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Left group: 1 Structures, 2 Killboard, 3 Placeholder */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="bg-primary-light border-2 border-primary text-white rounded-md"
            onClick={() => navigate("/structures")}
            aria-label="Open Structures"
          >
            Structures
          </Button>

          <Button
            variant="ghost"
            className="bg-primary-light border-2 border-primary text-white rounded-md"
            onClick={() => navigate("/killboard")}
            aria-label="Open Killboard"
          >
            Killboard
          </Button>

          <Button
            variant="ghost"
            className="bg-primary-light border-2 border-primary text-white rounded-md w-28"
            disabled
            aria-label="Placeholder"
          />
        </div>

        {/* Right group: 4 EF-Map */}
        <div className="flex items-center gap-3 ml-auto">
          {mapUrl ? (
            <Button
              asChild
              variant="ghost"
              className="bg-primary-light border-2 border-primary text-white rounded-md"
              aria-label="Open EF-Map"
            >
              <a href={mapUrl} target="_blank" rel="noreferrer noopener">
                EF-Map
              </a>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="bg-primary-light border-2 border-primary text-white rounded-md"
              disabled
              aria-label="EF-Map unavailable"
            >
              EF-Map
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SiteHeader);
