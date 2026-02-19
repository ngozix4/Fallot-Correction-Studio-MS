import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import database from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { showMessage } from 'react-native-flash-message';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

const schema = yup.object().shape({
  amount: yup.number()
    .min(1, 'Amount must be at least R1')
    .required('Amount is required'),
  source: yup.string().required('Income source is required'),
  category: yup.string().required('Category is required'),
  description: yup.string().required('Description is required'),
  paymentMethod: yup.string().required('Payment method is required'),
  date: yup.date().required('Date is required'),
  recurring: yup.boolean(),
  receiptNumber: yup.string(),
  notes: yup.string(),
});

const categories = [
  { id: 'gift', label: 'Gift', icon: 'gift' },
  { id: 'donation', label: 'Donation', icon: 'hand-heart' },
  { id: 'investment', label: 'Investment', icon: 'chart-line' },
  { id: 'savings', label: 'Savings Return', icon: 'piggy-bank' },
  { id: 'refund', label: 'Refund', icon: 'cash-refund' },
  { id: 'side_business', label: 'Side Business', icon: 'briefcase' },
  { id: 'freelance', label: 'Freelance', icon: 'laptop' },
  { id: 'other_income', label: 'Other Income', icon: 'dots-horizontal-circle' },
];

const paymentMethods = [
  { id: 'cash', label: 'Cash', icon: 'cash' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: 'bank-transfer' },
  { id: 'card', label: 'Card', icon: 'credit-card' },
  { id: 'mobile_money', label: 'Mobile Money', icon: 'cellphone' },
  { id: 'paypal', label: 'PayPal', icon: 'paypal' },
  { id: 'other', label: 'Other', icon: 'dots-horizontal' },
];

export default function AddIncomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [recurring, setRecurring] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      amount: '',
      source: '',
      category: '',
      description: '',
      paymentMethod: '',
      date: new Date(),
      recurring: false,
      receiptNumber: '',
      notes: '',
    },
  });

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setValue('category', categoryId);
  };

  const handlePaymentMethodSelect = (methodId) => {
    setSelectedPaymentMethod(methodId);
    setValue('paymentMethod', methodId);
  };

  const onSubmit = async (data) => {
    if (!user) {
      showMessage({ message: 'Please login first', type: 'danger' });
      return;
    }

    try {
      setLoading(true);
      
      const incomeData = {
        amount: parseFloat(data.amount),
        source: data.source,
        category: data.category,
        description: data.description,
        paymentMethod: data.paymentMethod,
        date: data.date,
        recurring: recurring,
        receiptNumber: data.receiptNumber || '',
        notes: data.notes || '',
      };

      await database.createIncome(incomeData, user.id);
      
      showMessage({
        message: 'Income recorded successfully',
        type: 'success',
      });
      
      reset();
      setSelectedCategory('');
      setSelectedPaymentMethod('');
      setRecurring(false);
      
      navigation.goBack();
      
    } catch (error) {
      console.error('Error creating income:', error);
      showMessage({
        message: 'Failed to record income',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const date = watch('date');

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Record Income</Title>

          {/* Amount */}
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  label="Amount (R) *"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="currency-usd" />}
                />
                {errors.amount && (
                  <HelperText type="error">{errors.amount.message}</HelperText>
                )}
              </>
            )}
          />

          {/* Source */}
          <Controller
            control={control}
            name="source"
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  label="Income Source *"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="account" />}
                  placeholder="e.g., Gift from John, Investment return"
                />
                {errors.source && (
                  <HelperText type="error">{errors.source.message}</HelperText>
                )}
              </>
            )}
          />

          {/* Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  label="Description *"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="text" />}
                  placeholder="Brief description of the income"
                />
                {errors.description && (
                  <HelperText type="error">{errors.description.message}</HelperText>
                )}
              </>
            )}
          />

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Category *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonActive,
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  <Icon
                    name={category.icon}
                    size={20}
                    color={selectedCategory === category.id ? '#fff' : '#4CAF50'}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategory === category.id && styles.categoryButtonTextActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category && (
              <HelperText type="error">{errors.category.message}</HelperText>
            )}
          </View>

          {/* Payment Method Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payment Method *</Text>
            <View style={styles.paymentMethodGrid}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === method.id && styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => handlePaymentMethodSelect(method.id)}
                >
                  <Icon
                    name={method.icon}
                    size={20}
                    color={selectedPaymentMethod === method.id ? '#fff' : '#4CAF50'}
                  />
                  <Text
                    style={[
                      styles.paymentMethodButtonText,
                      selectedPaymentMethod === method.id && styles.paymentMethodButtonTextActive,
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.paymentMethod && (
              <HelperText type="error">{errors.paymentMethod.message}</HelperText>
            )}
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date *</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateInput}
            >
              <View style={styles.dateInputContent}>
                <Icon name="calendar" size={24} color="#666" />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateValue}>
                    {date.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setValue('date', selectedDate);
                  }
                }}
              />
            )}
            {errors.date && (
              <HelperText type="error">{errors.date.message}</HelperText>
            )}
          </View>

          {/* Recurring Toggle */}
          <TouchableOpacity
            style={styles.recurringToggle}
            onPress={() => {
              const newRecurring = !recurring;
              setRecurring(newRecurring);
              setValue('recurring', newRecurring);
            }}
          >
            <Icon
              name={recurring ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color="#4CAF50"
            />
            <View style={styles.recurringTextContainer}>
              <Text style={styles.recurringTitle}>Recurring Income</Text>
              <Text style={styles.recurringSubtitle}>
                This income repeats regularly
              </Text>
            </View>
          </TouchableOpacity>

          {/* Receipt Number */}
          <Controller
            control={control}
            name="receiptNumber"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Receipt/Reference Number (Optional)"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="receipt" />}
              />
            )}
          />

          {/* Notes */}
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Notes (Optional)"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={3}
                left={<TextInput.Icon icon="note-text" />}
              />
            )}
          />

          {/* Quick Amount Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quick Amounts</Text>
            <View style={styles.quickAmounts}>
              {[500, 1000, 5000, 10000, 20000, 50000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setValue('amount', amount.toString())}
                >
                  <Text style={styles.quickAmountText}>R{amount.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            icon="cash-plus"
          >
            Record Income
          </Button>
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
    marginBottom: 24,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentMethodButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  paymentMethodButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paymentMethodButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  paymentMethodButtonTextActive: {
    color: '#fff',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 16,
  },
  dateInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTextContainer: {
    marginLeft: 12,
  },
  dateValue: {
    fontSize: 16,
    color: '#333',
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f9f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  recurringTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  recurringTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  recurringSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickAmountButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  quickAmountText: {
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#4CAF50',
  },
});
