import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AppSettings, DEFAULT_SETTINGS, getSettings, saveSettings } from '../services/storage';

// ─── Context Type ───────────────────────────────────────────────
interface SettingsContextType {
  settings: AppSettings;
  isLoaded: boolean;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
  updateSettings: async () => {},
});

// ─── Hook ───────────────────────────────────────────────────────
export function useSettings(): SettingsContextType {
  return useContext(SettingsContext);
}

// ─── Provider ───────────────────────────────────────────────────
interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await getSettings();
        setSettings(loaded);
      } catch {
        // Use defaults
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      // Fire-and-forget save
      saveSettings(updated).catch(() => {});
      return updated;
    });
  }, []);

  const contextValue = useMemo(
    () => ({ settings, isLoaded, updateSettings }),
    [settings, isLoaded, updateSettings]
  );

  return React.createElement(SettingsContext.Provider, { value: contextValue }, children);
}
