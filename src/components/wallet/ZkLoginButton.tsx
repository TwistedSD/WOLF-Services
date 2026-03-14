import React from "react";
import { useZkLogin } from "../../hooks/useZkLogin";

interface ZkLoginButtonProps {
  className?: string;
}

export const ZkLoginButton: React.FC<ZkLoginButtonProps> = ({
  className = "",
}) => {
  const { user, isLoading, error, connect, disconnect } = useZkLogin();

  if (user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-foreground">
            {user.characterName || user.address.slice(0, 8) + "..."}
          </span>
          {user.tribeName && (
            <span className="text-xs text-foreground-muted">
              Tribe: {user.tribeName}
            </span>
          )}
        </div>
        <button
          onClick={disconnect}
          className="px-3 py-1.5 text-xs font-medium rounded"
          style={{
            backgroundColor: "var(--error)",
            color: "white",
          }}
          title="Disconnect zkLogin"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={connect}
        disabled={isLoading}
        className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
        style={{
          backgroundColor: "var(--primary)",
          color: "white",
        }}
      >
        {isLoading ? "Connecting..." : "zkLogin"}
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
};
