import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
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
import pdfService from '../../services/pdfService';
import { useAuth } from '../../context/AuthContext';
import { showMessage } from 'react-native-flash-message';
import DateTimePicker from '@react-native-community/datetimepicker';

const schema = yup.object().shape({
  customerName: yup.string().required('Customer name is required'),
  customerPhone: yup.string().required('Phone number is required'),
  customerEmail: yup.string().email('Invalid email').nullable(),
  customerAddress: yup.string().nullable(),
  jobDescription: yup.string().required('Job description is required'),
  items: yup.array().of(
    yup.object().shape({
      description: yup.string().required('Item description is required'),
      quantity: yup.number().min(1, 'Minimum 1').required('Quantity is required'),
      unitPrice: yup.number().min(0, 'Must be positive').required('Price is required'),
    })
  ).min(1, 'At least one item is required'),
  dueDate: yup.date().required('Due date is required'),
  notes: yup.string().nullable(),
});

export default function CreateInvoiceScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [items, setItems] = useState([
    { description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);

  const {
  control,
  handleSubmit,
  formState: { errors },
  setValue,
  getValues,
} = useForm({
  resolver: yupResolver(schema),
  defaultValues: {
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    jobDescription: '',
    items: items,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notes: '',
  },
});

  const dueDate = getValues('dueDate');
  const formItems = getValues('items') || items;

  const calculateTotals = () => {
    let subtotal = 0;
    const currentItems = getValues('items') || [];
    const updatedItems = currentItems.map(item => {
      const total = item.quantity * item.unitPrice;
      subtotal += total;
      return { ...item, total };
    });
    
    const tax = 0;
    const totalAmount = subtotal + tax;
    const depositAmount = totalAmount * 0.5;
    const balanceDue = totalAmount;

    return {
      items: updatedItems,
      subtotal,
      tax,
      totalAmount,
      depositAmount,
      balanceDue,
    };
  };

  const handleAddItem = () => {
    const currentItems = getValues('items') || items;
    const newItems = [...currentItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }];
    setItems(newItems);
    setValue('items', newItems, { shouldValidate: true });
  };

  const handleRemoveItem = (index) => {
    const currentItems = getValues('items') || [];
    if (currentItems.length > 1) {
      const newItems = currentItems.filter((_, i) => i !== index);
      setItems(newItems);
      setValue('items', newItems, { shouldValidate: true });
    }
  };

  const handleItemChange = (index, field, value) => {
    const currentItems = getValues('items') || [];
    const newItems = [...currentItems];
    
    if (!newItems[index]) {
      newItems[index] = { description: '', quantity: 1, unitPrice: 0, total: 0 };
    }
    
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : newItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : newItems[index].unitPrice;
      newItems[index].total = quantity * unitPrice;
    }
    
    setItems(newItems);
    setValue('items', newItems, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    if (!user) {
      showMessage({ message: 'Please login first', type: 'danger' });
      return;
    }

    try {
      setLoading(true);
      
      const totals = calculateTotals();
      const invoiceData = {
        ...data,
        items: totals.items,
        subtotal: totals.subtotal,
        tax: totals.tax,
        totalAmount: totals.totalAmount,
        depositAmount: totals.depositAmount,
        balanceDue: totals.balanceDue,
        paymentStatus: 'pending',
      };

      console.log('🟡 [DEBUG] Saving to database...');
      console.log('🟡 [DEBUG] Invoice data for save:', JSON.stringify(invoiceData, null, 2));

      // Save to database
      const savedInvoice = await database.createInvoice(invoiceData, user.id);
      
      showMessage({
        message: 'Invoice created successfully',
        type: 'success',
      });
      
      // Generate PDF in background (don't wait for it)
      pdfService.getOrCreateInvoicePDF(savedInvoice)
        .then(pdfPath => {
          console.log('✅ PDF ready at:', pdfPath);
        })
        .catch(error => {
          console.error('PDF generation failed (non-critical):', error);
        });
      
      // Navigate directly to invoice detail
      navigation.navigate('InvoiceDetail', { 
        invoiceId: savedInvoice.id 
      });
      
    } catch (error) {
      console.error('❌ [DEBUG] Error in onSubmit:', error.message);
      console.error('❌ [DEBUG] Error stack:', error.stack);
      showMessage({
        message: 'Failed to create invoice: ' + error.message,
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Create New Invoice</Title>

            {/* Customer Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Details</Text>
              
              <Controller
                control={control}
                name="customerName"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      label="Customer Name"
                      value={value}
                      onChangeText={onChange}
                      mode="outlined"
                      style={styles.input}
                      left={<TextInput.Icon icon="account" />}
                    />
                    {errors.customerName && (
                      <HelperText type="error">
                        {errors.customerName.message}
                      </HelperText>
                    )}
                  </>
                )}
              />

              <Controller
                control={control}
                name="customerEmail"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      label="Email (Optional)"
                      value={value || ''}
                      onChangeText={onChange}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      left={<TextInput.Icon icon="email" />}
                    />
                    {errors.customerEmail && errors.customerEmail.type === 'email' && (
                      <HelperText type="error">
                        {errors.customerEmail.message}
                      </HelperText>
                    )}
                  </>
                )}
              />

              <Controller
                control={control}
                name="customerPhone"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      label="Phone Number"
                      value={value}
                      onChangeText={onChange}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="phone-pad"
                      left={<TextInput.Icon icon="phone" />}
                    />
                    {errors.customerPhone && (
                      <HelperText type="error">
                        {errors.customerPhone.message}
                      </HelperText>
                    )}
                  </>
                )}
              />

              <Controller
                control={control}
                name="customerAddress"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Address (Optional)"
                    value={value || ''}
                    onChangeText={onChange}
                    mode="outlined"
                    style={styles.input}
                    multiline
                    numberOfLines={2}
                    left={<TextInput.Icon icon="map-marker" />}
                  />
                )}
              />
            </View>

            {/* Job Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Details</Text>
              
              <Controller
                control={control}
                name="jobDescription"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      label="Job Description"
                      value={value}
                      onChangeText={onChange}
                      mode="outlined"
                      style={styles.input}
                      multiline
                      numberOfLines={3}
                      left={<TextInput.Icon icon="text" />}
                    />
                    {errors.jobDescription && (
                      <HelperText type="error">
                        {errors.jobDescription.message}
                      </HelperText>
                    )}
                  </>
                )}
              />

              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateInput}
              >
                <View style={styles.dateInputContent}>
                  <Icon name="calendar" size={24} color="#666" />
                  <View style={styles.dateTextContainer}>
                    <Text style={styles.dateLabel}>Due Date</Text>
                    <Text style={styles.dateValue}>
                      {dueDate.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setValue('dueDate', selectedDate);
                    }
                  }}
                />
              )}

              {errors.dueDate && (
                <HelperText type="error">{errors.dueDate.message}</HelperText>
              )}
            </View>

            {/* Items */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Items</Text>
                <TouchableOpacity onPress={handleAddItem} style={styles.addItemButton}>
                  <Icon name="plus" size={20} color="#6C63FF" />
                  <Text style={styles.addItemText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {formItems.map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemNumber}>Item {index + 1}</Text>
                    {formItems.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                        <Icon name="close" size={20} color="#F44336" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    label="Description"
                    value={item.description}
                    onChangeText={(text) => handleItemChange(index, 'description', text)}
                    mode="outlined"
                    style={styles.itemInput}
                  />

                  <View style={styles.itemRow}>
                    <TextInput
                      label="Quantity"
                      value={item.quantity.toString()}
                      onChangeText={(text) => handleItemChange(index, 'quantity', Number(text) || 0)}
                      mode="outlined"
                      style={[styles.itemInput, { flex: 1, marginRight: 8 }]}
                      keyboardType="numeric"
                    />

                    <TextInput
                      label="Unit Price (R)"
                      value={item.unitPrice.toString()}
                      onChangeText={(text) => handleItemChange(index, 'unitPrice', Number(text) || 0)}
                      mode="outlined"
                      style={[styles.itemInput, { flex: 1, marginLeft: 8 }]}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.itemTotal}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>
                      R{item.total.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}

              {errors.items && (
                <HelperText type="error">{errors.items.message}</HelperText>
              )}
            </View>

            {/* Totals Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary</Text>
              
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>
                      R{totals.subtotal.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax:</Text>
                    <Text style={styles.summaryValue}>
                      R{totals.tax.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalAmount}>
                      R{totals.totalAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Deposit (50%):</Text>
                    <Text style={styles.depositAmount}>
                      R{totals.depositAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Balance Due:</Text>
                    <Text style={styles.balanceAmount}>
                      R{totals.balanceDue.toLocaleString()}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            </View>

            {/* Notes */}
            <View style={styles.section}>
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
            </View>

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              icon="check"
            >
              Create Invoice
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Keep all your existing styles exactly as they were
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 16,
    marginBottom: 8,
  },
  dateInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTextContainer: {
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
  },
  dateValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0ff',
    borderRadius: 6,
  },
  addItemText: {
    color: '#6C63FF',
    fontWeight: '600',
    marginLeft: 4,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  itemInput: {
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryCard: {
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#e0e0ff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#6C63FF',
  },
});