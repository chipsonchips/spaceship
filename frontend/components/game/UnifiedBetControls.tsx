"use client";

import React, { useState } from "react";
import BetControls from "./BetControls";
import { DualBetControls } from "./bet/DualBetControls";

const UnifiedBetControls: React.FC = () => {
  const [isDualMode, setIsDualMode] = useState(false);

  return (
    <>
      {isDualMode ? (
        <DualBetControls onToggleMode={() => setIsDualMode(false)} />
      ) : (
        <BetControls onToggleMode={() => setIsDualMode(true)} />
      )}
    </>
  );
};

export default UnifiedBetControls;
