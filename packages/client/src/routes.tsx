import { createBrowserRouter } from "react-router-dom";

import Redirect from "@/views/utils/Redirect";
import NotFound from "@/views/utils/NotFound";

import App from "src/App";
import RouteErrorBoundary from "./views/utils/RouteErrorBoundary";
import UIComponentView from "./views/dev/UIComponentView";
import LandingPage from "./views/pages/LandingPage";
import MudSyncStatusView from "./views/dev/MudSyncStatusView";
import KillboardPage from "./views/pages/KillboardPage";
import StructuresPage from "./views/pages/StructuresPage";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: "/",
          element: <LandingPage />,
        },
        {
          path: "/structures",
          element: <StructuresPage />,
        },
        {
          path: "/killboard",
          element: <KillboardPage />,
          errorElement: <RouteErrorBoundary />,
        },
        {
          path: "/dev/mud",
          element: <MudSyncStatusView />,
          children: [],
        },
      ],
    },
    {
      path: "/dev/ui",
      element: <UIComponentView />,
      children: [],
    },
    {
      path: "*",
      element: <NotFound />,
    },
  ],
  {
    future: {
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_relativeSplatPath: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);

export default router;
