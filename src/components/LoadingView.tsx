import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme/theme';

interface LoadingViewProps {
  isDark?: boolean;
}

export function LoadingView({ isDark = true }: LoadingViewProps) {
  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <ActivityIndicator size="large" color={colors.youtubeRed} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  darkBg: {
    backgroundColor: colors.dark.background,
  },
  lightBg: {
    backgroundColor: colors.light.background,
  },
});
