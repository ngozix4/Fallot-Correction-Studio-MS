import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function StatCard({
  icon,
  value,
  label,
  color = '#6C63FF',
  onPress,
  subText,
}) {
  const CardContent = (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {subText && <Text style={styles.subText}>{subText}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.touchable} onPress={onPress}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  subText: {
    fontSize: 12,
    color: '#999',
  },
});