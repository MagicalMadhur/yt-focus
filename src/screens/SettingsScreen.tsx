import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode, colors as themeColors } from '../theme/theme';
import { useSettings } from '../hooks/useSettings';

// ─── Types ──────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingRowProps {
  icon: IoniconsName;
  label: string;
  description?: string;
  children: React.ReactNode;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

// ─── Settings Screen ────────────────────────────────────────────
export function SettingsScreen() {
  const { theme, setThemeMode } = useTheme();
  const { settings, updateSettings } = useSettings();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  // ─── Theme Selection ────────────────────────────────────────
  const handleThemeChange = useCallback(
    (mode: ThemeMode) => {
      setThemeMode(mode);
      updateSettings({ theme: mode });
    },
    [setThemeMode, updateSettings]
  );

  // ─── Render ─────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: c.text }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Appearance ─────────────────────────────────── */}
        <Section title="Appearance">
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <Ionicons name="color-palette-outline" size={20} color={c.text} style={styles.settingIcon} />
                  <Text style={[styles.settingLabel, { color: c.text }]}>Theme</Text>
                </View>
                <Text style={[styles.settingDescription, { color: c.textSecondary }]}>
                  Choose your preferred appearance
                </Text>
              </View>
            </View>
            <View style={styles.themeSelector}>
              {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor:
                        settings.theme === mode
                          ? themeColors.youtubeRed
                          : theme.isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.04)',
                      borderColor:
                        settings.theme === mode
                          ? themeColors.youtubeRed
                          : c.surfaceBorder,
                    },
                  ]}
                  onPress={() => handleThemeChange(mode)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      mode === 'dark'
                        ? 'moon'
                        : mode === 'light'
                        ? 'sunny'
                        : 'phone-portrait-outline'
                    }
                    size={16}
                    color={settings.theme === mode ? '#FFFFFF' : c.textSecondary}
                    style={styles.themeOptionIcon}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      {
                        color: settings.theme === mode ? '#FFFFFF' : c.text,
                        fontWeight: settings.theme === mode ? '600' : '400',
                      },
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Section>

        {/* ── YouTube ────────────────────────────────────── */}
        <Section title="YouTube">
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
            <SettingRowWithSwitch
              icon="eye-off-outline"
              label="Hide Shorts"
              description="Remove Shorts from home, search, and navigation"
              value={settings.hideShorts}
              onValueChange={(val) => updateSettings({ hideShorts: val })}
              theme={theme}
            />
            <View style={[styles.divider, { backgroundColor: c.surfaceBorder }]} />
            <SettingRowWithSwitch
              icon="shield-checkmark-outline"
              label="Content Filter"
              description="Block ads and sponsored content (like Brave)"
              value={settings.contentFilter}
              onValueChange={(val) => updateSettings({ contentFilter: val })}
              theme={theme}
            />
            <View style={[styles.divider, { backgroundColor: c.surfaceBorder }]} />
            <SettingRowWithSwitch
              icon="home-outline"
              label="Open Home on Startup"
              description="Always start on YouTube home page"
              value={settings.openHomeOnStartup}
              onValueChange={(val) => updateSettings({ openHomeOnStartup: val })}
              theme={theme}
            />
          </View>
        </Section>

        {/* ── Playback ───────────────────────────────────── */}
        <Section title="Playback">
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
            <SettingRowWithSwitch
              icon="bookmark-outline"
              label="Remember Last Page"
              description="Return to where you left off"
              value={settings.rememberLastPage}
              onValueChange={(val) => updateSettings({ rememberLastPage: val })}
              theme={theme}
            />
            <View style={[styles.divider, { backgroundColor: c.surfaceBorder }]} />
            <SettingRowWithSwitch
              icon="expand-outline"
              label="Auto Fullscreen"
              description="Open videos in fullscreen when appropriate"
              value={settings.autoFullscreen}
              onValueChange={(val) => updateSettings({ autoFullscreen: val })}
              theme={theme}
            />
          </View>
        </Section>

        {/* ── About ──────────────────────────────────────── */}
        <Section title="About">
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: c.textSecondary }]}>App</Text>
              <Text style={[styles.aboutValue, { color: c.text }]}>YT Focus</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: c.surfaceBorder }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: c.textSecondary }]}>Version</Text>
              <Text style={[styles.aboutValue, { color: c.text }]}>1.0.0</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: c.surfaceBorder }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: c.textSecondary }]}>Platform</Text>
              <Text style={[styles.aboutValue, { color: c.text }]}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
            </View>
          </View>
        </Section>

        {/* Footer note */}
        <Text style={[styles.footerNote, { color: c.textMuted }]}>
          This app provides a focused YouTube browsing experience.{'\n'}
          It does not block ads, bypass DRM, or collect credentials.
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────
function Section({ title, children }: SectionProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

interface SettingRowWithSwitchProps {
  icon: IoniconsName;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: any;
}

function SettingRowWithSwitch({
  icon,
  label,
  description,
  value,
  onValueChange,
  theme,
}: SettingRowWithSwitchProps) {
  const c = theme.colors;
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.settingLabelRow}>
          <Ionicons name={icon} size={20} color={c.text} style={styles.settingIcon} />
          <Text style={[styles.settingLabel, { color: c.text }]}>{label}</Text>
        </View>
        <Text style={[styles.settingDescription, { color: c.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.surfaceBorder, true: themeColors.youtubeRed }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={c.surfaceBorder}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  settingIcon: {
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginLeft: 30,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
    marginLeft: 30,
  },
  themeSelector: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeOptionIcon: {
    marginRight: 6,
  },
  themeOptionText: {
    fontSize: 13,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  aboutLabel: {
    fontSize: 15,
  },
  aboutValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  footerNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
