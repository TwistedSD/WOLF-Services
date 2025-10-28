import React from "react";
import SmartAssembliesAccordion from "@/components/assemblies/SmartAssembliesAccordion";

const StructuresPage: React.FC = () => {
  return (
    <div className="py-2">
      <SmartAssembliesAccordion />
    </div>
  );
};

export default React.memo(StructuresPage);
