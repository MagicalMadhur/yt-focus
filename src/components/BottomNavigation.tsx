import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { SubscriptionsScreen } from '../screens/SubscriptionsScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme, colors } from '../theme/theme';

// ─── Tab Navigator ──────────────────────────────────────────────
const Tab = createBottomTabNavigator();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  component: React.ComponentType<any>;
  icon: IoniconsName;
  iconFocused: IoniconsName;
  label: string;
}

const TABS: TabConfig[] = [
  {
    name: 'Home',
    component: HomeScreen,
    icon: 'home-outline',
    iconFocused: 'home',
    label: 'Home',
  },
  {
    name: 'Subscriptions',
    component: SubscriptionsScreen,
    icon: 'play-circle-outline',
    iconFocused: 'play-circle',
    label: 'Subscriptions',
  },
  {
    name: 'Library',
    component: LibraryScreen,
    icon: 'folder-outline',
    iconFocused: 'folder',
    label: 'Library',
  },
  {
    name: 'Settings',
    component: SettingsScreen,
    icon: 'settings-outline',
    iconFocused: 'settings',
    label: 'Settings',
  },
];

export function BottomNavigation() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.activeTab,
        tabBarInactiveTintColor: c.inactiveTab,
        tabBarStyle: {
          backgroundColor: c.navBar,
          borderTopColor: c.navBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        // Lazy load screens for performance
        lazy: true,
        // Freeze inactive screens
        freezeOnBlur: true,
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
