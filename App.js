import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';
import Toast from 'react-native-toast-message';
import { NavigationIndependentTree } from '@react-navigation/native';

// Context Providers
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Styles
import { theme } from './src/styles/theme';

export default function App() {
  return (
    <NavigationIndependentTree>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PaperProvider theme={theme}>
            <AuthProvider>
              <StatusBar style="auto" />
              <AppNavigator />
              <FlashMessage position="top" />
              <Toast />
            </AuthProvider>
          </PaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </NavigationIndependentTree>
  );
}