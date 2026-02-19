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
  Switch,
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
  title: yup.string().required('Job title is required'),
  description: yup.string().required('Job description is required'),
  customerName: yup.string().required('Customer name is required'),
  customerPhone: yup.string(),
  customerEmail: yup.string().email('Invalid email'),
  customerAddress: yup.string(),
  dueDate: yup.date().required('Due date is required'),
  price: yup.number().min(0, 'Price must be positive').required('Price is required'),
  createInvoice: yup.boolean().default(true),
  notes: yup.string(),
});

export default function CreateJobScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [createInvoice, setCreateInvoice] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      price: 0,
      createInvoice: true,
      notes: '',
    },
  });

  const dueDate = getValues('dueDate');
  const price = getValues('price');

  const calculateTotals = () => {
    const priceValue = price || 0;
    const depositAmount = priceValue * 0.5;
    const balanceDue = priceValue;
    
    return {
      subtotal: priceValue,
      tax: 0,
      totalAmount: priceValue,
      depositAmount: depositAmount,
      balanceDue: balanceDue,
    };
  };

const onSubmit = async (data) => {
    if (!user) {
        showMessage({ message: 'Please login first', type: 'danger' });
        return;
    }

    try {
        setLoading(true);

        const totals = calculateTotals();
        const jobData = {
            title: data.title,
            description: data.description,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            dueDate: data.dueDate,
            status: 'pending',
            progress: 0,
            price: data.price,
            notes: data.notes || '',
            depositAmount: totals.depositAmount,
            depositReceived: false,
            finalPaymentAmount: totals.balanceDue,
            finalPaymentReceived: false
        };

        console.log('🟡 [DEBUG] Creating job...');
        const savedJob = await database.createJob(jobData, user.id);
        
        // If createInvoice is true, create invoice immediately
        if (data.createInvoice) {
            try {
                console.log('🟡 [DEBUG] Creating invoice for job...');
                const invoice = await database.createInvoiceFromJob(savedJob.id, user.id);
                
                if (invoice) {
                    savedJob.invoiceId = invoice.id;
                    console.log('✅ Invoice created:', invoice.id);
                }
            } catch (invoiceError) {
                console.error('❌ Invoice creation failed:', invoiceError);
                // Continue even if invoice creation fails
            }
        }
        
        showMessage({
            message: 'Job created successfully',
            type: 'success',
        });

        // Generate PDF if invoice was created
        if (savedJob.invoiceId) {
            try {
                const invoice = await database.getInvoiceById(savedJob.invoiceId);
                if (invoice) {
                    pdfService.getOrCreateInvoicePDF(invoice)
                        .then(pdfPath => {
                            console.log('✅ PDF ready at:', pdfPath);
                        })
                        .catch(error => {
                            console.error('PDF generation failed:', error);
                        });
                }
            } catch (pdfError) {
                console.error('PDF generation error:', pdfError);
            }
        }

        // Navigate to job detail
        navigation.navigate('JobDetail', { jobId: savedJob.id });

    } catch (error) {
        console.error('❌ [DEBUG] Error in onSubmit:', error.message);
        showMessage({
            message: 'Failed to create job: ' + error.message,
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
            <Title style={styles.title}>Create New Job</Title>

            {/* Job Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Details</Text>
              
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      label="Job Title *"
                      value={value}
                      onChangeText={onChange}
                      mode="outlined"
                      style={styles.input}
                      left={<TextInput.Icon icon="briefcase" />}
                    />
                    {errors.title && (
                      <HelperText type="error">
                        {errors.title.message}
                      </HelperText>
                    )}
                  </>
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      label="Job Description *"
                      value={value}
                      onChangeText={onChange}
                      mode="outlined"
                      style={styles.input}
                      multiline
                      numberOfLines={3}
                      left={<TextInput.Icon icon="text" />}
                    />
                    {errors.description && (
                      <HelperText type="error">
                        {errors.description.message}
                      </HelperText>
                    )}
                  </>
                )}
              />

              <Controller
                control={control}
                name="price"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      label="Price (R) *"
                      value={value.toString()}
                      onChangeText={(text) => onChange(Number(text) || 0)}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="numeric"
                      left={<TextInput.Icon icon="cash" />}
                    />
                    {errors.price && (
                      <HelperText type="error">
                        {errors.price.message}
                      </HelperText>
                    )}
                  </>
                )}
              />
            </View>

            {/* Customer Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Details</Text>
              
              <Controller
                control={control}
                name="customerName"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      label="Customer Name *"
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
                name="customerPhone"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Phone Number"
                    value={value}
                    onChangeText={onChange}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="phone-pad"
                    left={<TextInput.Icon icon="phone" />}
                  />
                )}
              />

              <Controller
                control={control}
                name="customerEmail"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    left={<TextInput.Icon icon="email" />}
                  />
                )}
              />

              <Controller
                control={control}
                name="customerAddress"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Address"
                    value={value}
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

            {/* Timeline */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateInput}
              >
                <View style={styles.dateInputContent}>
                  <Icon name="calendar" size={24} color="#666" />
                  <View style={styles.dateTextContainer}>
                    <Text style={styles.dateLabel}>Due Date *</Text>
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

            {/* Invoice Option */}
            <View style={styles.section}>
              <View style={styles.invoiceOption}>
                <View style={styles.invoiceOptionText}>
                  <Text style={styles.invoiceOptionTitle}>Create Invoice</Text>
                  <Text style={styles.invoiceOptionDescription}>
                    Automatically create an invoice for this job
                  </Text>
                </View>
                <Switch
                  value={createInvoice}
                  onValueChange={(value) => {
                    setCreateInvoice(value);
                    setValue('createInvoice', value);
                  }}
                  trackColor={{ false: '#767577', true: '#6C63FF' }}
                  thumbColor={createInvoice ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary</Text>
              
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Amount:</Text>
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
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              
              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Notes"
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
              Create Job
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  invoiceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0ff',
  },
  invoiceOptionText: {
    flex: 1,
  },
  invoiceOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  invoiceOptionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
  totalAmount: {
    fontSize: 18,
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
