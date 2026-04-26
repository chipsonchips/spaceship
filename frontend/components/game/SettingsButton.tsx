"use client";

import React, { useState } from "react";
import SettingsModal from "./SettingsModal";

const SettingsButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40 p-2.5 sm:p-3 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-lg hover:bg-slate-900/80 hover:border-slate-600 transition-all shadow-lg group"
        title="Game Settings"
      >
        <div className="text-xl sm:text-2xl group-hover:scale-110 transition-transform">
          ⚙️
        </div>
      </button>

      <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default SettingsButton;
