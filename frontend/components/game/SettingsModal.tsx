"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSettings } from "@/context/SettingsContext";
import FairnessVerifier from "./FairnessVerifier";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "fairness">("settings");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    const newSettings = {
      ...localSettings,
      [key]: !localSettings[key],
    };
    setLocalSettings(newSettings);
    updateSettings(newSettings);
  };

  const handleVolumeChange = (value: number) => {
    const newSettings = { ...localSettings, soundVolume: value };
    setLocalSettings(newSettings);
    updateSettings(newSettings);
  };

  const handleScaleChange = (value: number) => {
    const newSettings = { ...localSettings, uiScale: value };
    setLocalSettings(newSettings);
    updateSettings(newSettings);
  };

  const handleReset = () => {
    if (confirm("Reset all settings to default?")) {
      resetSettings();
      setLocalSettings(settings);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 border-b border-slate-700/50 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-black font-orbitron text-emerald-400 uppercase tracking-widest leading-none">
              Game Menu
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors text-2xl leading-none"
            >
              ✕
            </button>
          </div>
          
          <div className="flex px-6 border-t border-slate-800">
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 py-3 text-xs font-bold font-orbitron uppercase tracking-widest transition-all border-b-2 ${
                activeTab === "settings" 
                  ? "text-emerald-400 border-emerald-400" 
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setActiveTab("fairness")}
              className={`flex-1 py-3 text-xs font-bold font-orbitron uppercase tracking-widest transition-all border-b-2 ${
                activeTab === "fairness" 
                  ? "text-emerald-400 border-emerald-400" 
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              🛡️ Fairness
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "settings" ? (
            <div className="space-y-6">
          {/* Audio Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-orbitron text-emerald-400 uppercase tracking-widest">
              🔊 Audio
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 font-courier">
                  Sound Effects
                </label>
                <button
                  onClick={() => handleToggle("soundEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                    localSettings.soundEnabled
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      localSettings.soundEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {localSettings.soundEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400 font-courier">
                      Volume
                    </label>
                    <span className="text-xs text-emerald-400 font-bold">
                      {Math.round(localSettings.soundVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={localSettings.soundVolume}
                    onChange={(e) =>
                      handleVolumeChange(parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Visual Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-orbitron text-emerald-400 uppercase tracking-widest">
              👁️ Visual
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 font-courier">
                  Particle Effects
                </label>
                <button
                  onClick={() => handleToggle("particleEffectsEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                    localSettings.particleEffectsEnabled
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      localSettings.particleEffectsEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 font-courier">
                  Animations
                </label>
                <button
                  onClick={() => handleToggle("animationsEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                    localSettings.animationsEnabled
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      localSettings.animationsEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 font-courier">
                  Screen Tint
                </label>
                <button
                  onClick={() => handleToggle("screenTintEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                    localSettings.screenTintEnabled
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      localSettings.screenTintEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* UI Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-orbitron text-emerald-400 uppercase tracking-widest">
              🎮 UI
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 font-courier">
                  Activity Feed
                </label>
                <button
                  onClick={() => handleToggle("activityFeedEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                    localSettings.activityFeedEnabled
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      localSettings.activityFeedEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 font-courier">
                  Session Stats
                </label>
                <button
                  onClick={() => handleToggle("sessionStatsEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                    localSettings.sessionStatsEnabled
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      localSettings.sessionStatsEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 font-courier">
                  Potential Payout
                </label>
                <button
                  onClick={() => handleToggle("potentialPayoutEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                    localSettings.potentialPayoutEnabled
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      localSettings.potentialPayoutEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 font-courier">
                  Auto-Hide UI
                </label>
                <button
                  onClick={() => handleToggle("autoHideUI")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                    localSettings.autoHideUI
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      localSettings.autoHideUI
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300 font-courier">
                    UI Scale
                  </label>
                  <span className="text-xs text-emerald-400 font-bold">
                    {(localSettings.uiScale * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={localSettings.uiScale}
                  onChange={(e) =>
                    handleScaleChange(parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>

            {/* Reset Button */}
            <div className="pt-4 border-t border-slate-700/50">
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-slate-800/60 border border-slate-600/60 text-slate-300 hover:text-slate-100 hover:border-slate-500 rounded-lg font-courier text-xs font-bold uppercase tracking-wide transition-all"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
          ) : (
            <FairnessVerifier />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SettingsModal;
