import React, { useEffect, useState } from "react";

export const ZkLoginCallback: React.FC = () => {
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      console.log(
        "Processing OAuth callback, hash:",
        window.location.hash.slice(0, 50),
      );

      // Check both query params and hash params
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const idToken = params.get("id_token") || hashParams.get("id_token");
      const error = params.get("error") || hashParams.get("error");
      const state = params.get("state") || hashParams.get("state");

      console.log("Token found:", !!idToken, "Error:", error);

      if (error) {
        setStatus("error");
        setErrorMessage(params.get("error_description") || error);
        return;
      }

      if (!idToken) {
        setStatus("error");
        setErrorMessage("No id_token received from OAuth provider");
        return;
      }

      // Store the token and redirect back to home
      try {
        sessionStorage.setItem("zklogin-id_token", idToken);
        if (state) {
          sessionStorage.setItem("zklogin-state", state);
        }

        // Redirect to home page
        window.location.href = "/";
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to process login",
        );
      }
    };

    handleCallback();
  }, []);

  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Processing login...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <div className="text-error text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Login Failed
          </h1>
          <p className="text-foreground-muted mb-4">{errorMessage}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-primary text-white rounded hover:opacity-90"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return null;
};
