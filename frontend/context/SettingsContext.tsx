"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";

export interface GameSettings {
  soundEnabled: boolean;
  soundVolume: number;
  particleEffectsEnabled: boolean;
  animationsEnabled: boolean;
  screenTintEnabled: boolean;
  activityFeedEnabled: boolean;
  sessionStatsEnabled: boolean;
  potentialPayoutEnabled: boolean;
  autoHideUI: boolean;
  uiScale: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
  particleEffectsEnabled: true,
  animationsEnabled: true,
  screenTintEnabled: true,
  activityFeedEnabled: true,
  sessionStatsEnabled: true,
  potentialPayoutEnabled: true,
  autoHideUI: false,
  uiScale: 1,
};

interface SettingsContextType {
  settings: GameSettings;
  updateSettings: (settings: Partial<GameSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "aviator_game_settings";

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }, []);

  const updateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch (err) {
        console.error("Failed to save settings:", err);
      }
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error("Failed to reset settings:", err);
    }
  };

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
};
