import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/theme';

interface ErrorViewProps {
  onRetry: () => void;
  message?: string;
}

export function ErrorView({ onRetry, message = 'Unable to load YouTube' }: ErrorViewProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-offline-outline" size={56} color={c.textMuted} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>{message}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Please check your connection and try again.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" style={styles.retryIcon} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
