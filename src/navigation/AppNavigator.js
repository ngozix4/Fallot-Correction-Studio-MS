import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import MainTabNavigator from './MainTabNavigator';
import { useTheme } from '../context/ThemeContext';

export default function AppNavigator() {
  const { navigationTheme } = useTheme();

  return (
    <NavigationContainer theme={navigationTheme}>
      <MainTabNavigator />
    </NavigationContainer>
  );
}