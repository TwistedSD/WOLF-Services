import React from "react";
import { SyncLoader } from "@/components/mud/SyncLoader";
import { useMud } from "@/providers/mud";

const LandingPage: React.FC = () => {
  const {
    sync: { syncedAtLeastOnce },
  } = useMud();

  // Do not render the Task Dashboard after sync; leave the area empty.
  return <>{!syncedAtLeastOnce ? <SyncLoader /> : null}</>;
};

export default React.memo(LandingPage);
