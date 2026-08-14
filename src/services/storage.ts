import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ──────────────────────────────────────────────────────
export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  hideShorts: boolean;
  contentFilter: boolean;
  openHomeOnStartup: boolean;
  rememberLastPage: boolean;
  autoFullscreen: boolean;
}

// ─── Defaults ───────────────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  hideShorts: true,
  contentFilter: true,
  openHomeOnStartup: true,
  rememberLastPage: false,
  autoFullscreen: false,
};

// ─── Storage Keys ───────────────────────────────────────────────
const SETTINGS_KEY = '@ytfocus_settings';
const LAST_URL_KEY = '@ytfocus_last_url';

// ─── Settings ───────────────────────────────────────────────────
export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle new settings added in updates
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
}

export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, [key]: value };
  await saveSettings(updated);
  return updated;
}

// ─── Last Visited URL ───────────────────────────────────────────
export async function getLastVisitedUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_URL_KEY);
  } catch {
    return null;
  }
}

export async function saveLastVisitedUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_URL_KEY, url);
  } catch (error) {
    console.warn('Failed to save last URL:', error);
  }
}
