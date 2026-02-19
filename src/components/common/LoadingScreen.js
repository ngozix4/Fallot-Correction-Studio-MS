import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <Icon name="needle" size={80} color="#6C63FF" />
      <ActivityIndicator size="large" color="#6C63FF" style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  spinner: {
    marginTop: 30,
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});