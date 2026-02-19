import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MD3LightTheme as PaperLightTheme,
  MD3DarkTheme as PaperDarkTheme,
} from 'react-native-paper';
import {
  DefaultTheme as NavigationLightTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';

/* ---------------------------------------------------
   COLOR TOKENS
--------------------------------------------------- */
export const Colors = {
  light: {
    primary: '#6C63FF',
    secondary: '#FF6584',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#212121',
    border: '#E0E0E0',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
    card: '#FFFFFF',
  },
  dark: {
    primary: '#7C76FF',
    secondary: '#FF758A',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    border: '#383838',
    error: '#EF5350',
    success: '#66BB6A',
    warning: '#FFA726',
    card: '#1E1E1E',
  },
};

/* ---------------------------------------------------
   CONTEXT
--------------------------------------------------- */
const ThemeContext = createContext(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

/* ---------------------------------------------------
   PROVIDER
--------------------------------------------------- */
export const ThemeProvider = ({ children }) => {
  const systemScheme = Appearance.getColorScheme();
  const [mode, setMode] = useState('system');
  const [ready, setReady] = useState(false);

  /* Load saved preference */
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('@theme_mode');
      if (stored) setMode(stored);
      setReady(true);
    })();
  }, []);

  const isDark =
    mode === 'system'
      ? systemScheme === 'dark'
      : mode === 'dark';

  /* ---------------------------------------------------
     PAPER (MD3 SAFE)
  --------------------------------------------------- */
  const paperTheme = useMemo(() => {
    const base = isDark ? PaperDarkTheme : PaperLightTheme;
    const c = isDark ? Colors.dark : Colors.light;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.primary,
        secondary: c.secondary,
        background: c.background,
        surface: c.surface,
        error: c.error,
      },
    };
  }, [isDark]);

  /* ---------------------------------------------------
     NAVIGATION (v7 SAFE)
  --------------------------------------------------- */
  const navigationTheme = useMemo(() => {
    const base = isDark ? NavigationDarkTheme : NavigationLightTheme;
    const c = isDark ? Colors.dark : Colors.light;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.primary,
        background: c.background,
        card: c.card,
        text: c.text,
        border: c.border,
        notification: c.secondary,
      },
    };
  }, [isDark]);

  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */
  const setTheme = async (value) => {
    setMode(value);
    await AsyncStorage.setItem('@theme_mode', value);
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (!ready) return null;

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        mode,
        colors: isDark ? Colors.dark : Colors.light,
        paperTheme,
        navigationTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
