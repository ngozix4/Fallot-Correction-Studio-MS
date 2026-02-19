import React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggleButton() {
  const { toggleTheme, isDark, colors } = useTheme();

  return (
    <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 16 }}>
      <Icon
        name={isDark ? 'weather-sunny' : 'weather-night'}
        size={24}
        color={colors.primary}
      />
    </TouchableOpacity>
  );
}