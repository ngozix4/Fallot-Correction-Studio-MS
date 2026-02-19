import { DefaultTheme } from 'react-native-paper';
import { colors } from './colors';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
    text: colors.text.primary,
    disabled: colors.text.disabled,
    placeholder: colors.text.hint,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: colors.secondary,
  },
  roundness: 8,
};