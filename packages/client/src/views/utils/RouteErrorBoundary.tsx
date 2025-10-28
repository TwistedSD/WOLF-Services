import React from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

const FriendlyError: React.FC<{ title?: string; message?: string }> = ({
  title,
  message,
}) => (
  <div className="p-6">
    <h2 className="text-xl font-semibold mb-2">
      {title || "Something went wrong"}
    </h2>
    {message && (
      <p className="mb-4 text-sm opacity-80 whitespace-pre-wrap">{message}</p>
    )}
    <div className="flex gap-2">
      <button
        className="border px-3 py-1 rounded"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
      <Link to="/" className="border px-3 py-1 rounded">
        Go Home
      </Link>
    </div>
  </div>
);

export default function RouteErrorBoundary() {
  const err = useRouteError();

  if (isRouteErrorResponse(err)) {
    return (
      <FriendlyError
        title={`Error ${err.status}`}
        message={
          err.statusText || (typeof err.data === "string" ? err.data : "")
        }
      />
    );
  }

  if (err instanceof Error) {
    return <FriendlyError title={err.name} message={err.message} />;
  }

  return <FriendlyError />;
}
