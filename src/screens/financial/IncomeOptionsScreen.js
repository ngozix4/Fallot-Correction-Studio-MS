import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, Title } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

export default function IncomeOptionsScreen() {
  const navigation = useNavigation();

  const incomeOptions = [
    {
      id: 'invoice',
      title: 'Invoice Income',
      description: 'Record income from customer invoices',
      icon: 'file-document',
      color: '#4CAF50',
      onPress: () => navigation.navigate('InvoiceStack'),
    },
    {
      id: 'other',
      title: 'Other Income',
      description: 'Record income from gifts, donations, investments, etc.',
      icon: 'cash-plus',
      color: '#2196F3',
      onPress: () => navigation.navigate('AddIncome'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Record Income</Title>
          <Text style={styles.subtitle}>Choose income source type</Text>
          
          {incomeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionButton}
              onPress={option.onPress}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                <Icon name={option.icon} size={30} color={option.color} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
  },
});
