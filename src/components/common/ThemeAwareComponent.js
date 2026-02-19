import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeAwareComponent() {
  const { colors, isDark } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: {
      color: colors.text,
      fontSize: 16,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Current theme: {isDark ? 'Dark' : 'Light'}
      </Text>
      <Text style={styles.subtitle}>
        This component automatically adapts to the current theme
      </Text>
    </View>
  );
}