import React from "react";
import { LogOut } from "lucide-react";
import primaryLogo from "../../assets/logo/primary.png";
import { useTribeVerification } from "../../hooks/useTribeVerification";

interface TribeHeaderProps {
  address: string;
  characterName: string | null;
  onDisconnect: () => void;
}

export const TribeHeader: React.FC<TribeHeaderProps> = ({
  address,
  characterName,
  onDisconnect,
}) => {
  const {
    tribeName,
    accessLevel,
    isLoading: tribeLoading,
  } = useTribeVerification(address);

  return (
    <div
      className="mt-4 border-2 p-6 mb-6"
      style={{ borderColor: "var(--primary)" }}
      role="banner"
    >
      {/* Header Row: Logo, Banner, Character Info */}
      <div className="flex items-center justify-between gap-6 mb-6">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-4 self-center">
          <img
            src={primaryLogo}
            alt="WOLF Tribe Logo"
            className="h-24 w-24 object-contain"
          />
          <div>
            <div className="text-2xl font-bold text-primary">WOLF</div>
            <div className="text-sm text-foreground-muted">
              Tribal Operations Hub
            </div>
          </div>
        </div>

        {/* Right: Character Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            {tribeLoading ? (
              <div className="text-sm text-foreground-muted">
                Loading character...
              </div>
            ) : (
              <>
                <div className="text-sm text-foreground-muted">
                  Character:{" "}
                  <span className="font-semibold text-foreground">
                    {characterName || "Unknown"}
                  </span>
                </div>
                <div className="text-sm">
                  Tribe:{" "}
                  <span
                    className={`font-semibold ${
                      accessLevel === "full"
                        ? "text-primary"
                        : accessLevel === "visitor"
                        ? "text-secondary"
                        : "text-error"
                    }`}
                  >
                    {tribeName || "None"}
                  </span>
                  {accessLevel === "visitor" && (
                    <span className="ml-2 text-xs text-foreground-muted">
                      (Visitor)
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onDisconnect}
            title="Disconnect wallet"
            aria-label="Disconnect wallet"
            className="h-8 px-3 text-xs inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all cursor-pointer outline-none border-2 text-white"
            style={{
              backgroundColor: 'var(--primary-light)',
              borderColor: 'var(--primary)',
            }}
          >
            <LogOut className="size-4" />
            <span className="sr-only">Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TribeHeader);
