import React, { useState, useEffect } from 'react';
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
  SegmentedButtons,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import database from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { showMessage } from 'react-native-flash-message';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

const schema = yup.object().shape({
  goalName: yup.string().required('Goal name is required'),
  targetAmount: yup.number()
    .min(1, 'Target amount must be at least R1')
    .required('Target amount is required'),
  currentAmount: yup.number()
    .min(0, 'Current amount cannot be negative')
    .required('Current amount is required'),
  periodType: yup.string().required('Period type is required'),
  startDate: yup.date().required('Start date is required'),
  endDate: yup.date()
    .required('End date is required')
    .min(yup.ref('startDate'), 'End date must be after start date'),
  notes: yup.string(),
});

export default function CreateGoalScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const goalId = route.params?.goalId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      goalName: '',
      targetAmount: '',
      currentAmount: '0',
      periodType: 'monthly',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: '',
    },
  });

  const targetAmount = watch('targetAmount');
  const currentAmount = watch('currentAmount');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  useEffect(() => {
    if (goalId) {
      fetchGoal();
      setIsEditing(true);
    }
  }, [goalId]);

  const fetchGoal = async () => {
    try {
      setLoading(true);
      const goals = await database.getGoals(user.id);
      const goal = goals.find(g => g.id === goalId);
      
      if (goal) {
        reset({
          goalName: goal.goalName,
          targetAmount: goal.targetAmount.toString(),
          currentAmount: goal.currentAmount.toString(),
          periodType: goal.periodType,
          startDate: goal.startDate ? new Date(goal.startDate) : new Date(),
          endDate: new Date(goal.endDate),
          notes: goal.notes || '',
        });
      }
    } catch (error) {
      showMessage({
        message: 'Error loading goal',
        type: 'danger',
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentAmount) || 0;
    
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const calculateRemaining = () => {
    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentAmount) || 0;
    return Math.max(target - current, 0);
  };

  const calculateDailyTarget = () => {
    const remaining = calculateRemaining();
    const daysRemaining = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) return remaining;
    return remaining / daysRemaining;
  };

  const onSubmit = async (data) => {
    if (!user) {
      showMessage({ message: 'Please login first', type: 'danger' });
      return;
    }

    try {
      setSaving(true);
      
      const goalData = {
        goalName: data.goalName,
        targetAmount: parseFloat(data.targetAmount),
        currentAmount: parseFloat(data.currentAmount),
        periodType: data.periodType,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes,
      };

      if (isEditing) {
        await database.updateGoal(goalId, goalData);
        showMessage({
          message: 'Goal updated successfully',
          type: 'success',
        });
      } else {
        await database.createGoal(goalData, user.id);
        showMessage({
          message: 'Goal created successfully',
          type: 'success',
        });
      }
      
      navigation.goBack();
      
    } catch (error) {
      console.error('Goal submission error:', error);
      showMessage({
        message: 'Failed to save goal',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const progress = calculateProgress();
  const remaining = calculateRemaining();
  const dailyTarget = calculateDailyTarget();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>
            {isEditing ? 'Edit Goal' : 'Create New Goal'}
          </Title>

          {/* Goal Name */}
          <Controller
            control={control}
            name="goalName"
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  label="Goal Name *"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="target" />}
                />
                {errors.goalName && (
                  <HelperText type="error">{errors.goalName.message}</HelperText>
                )}
              </>
            )}
          />

          {/* Amounts */}
          <View style={styles.amountsRow}>
            <Controller
              control={control}
              name="targetAmount"
              render={({ field: { onChange, value } }) => (
                <View style={styles.amountInput}>
                  <TextInput
                    label="Target Amount (R) *"
                    value={value}
                    onChangeText={onChange}
                    mode="outlined"
                    keyboardType="numeric"
                    left={<TextInput.Icon icon="currency-usd" />}
                  />
                  {errors.targetAmount && (
                    <HelperText type="error">{errors.targetAmount.message}</HelperText>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="currentAmount"
              render={({ field: { onChange, value } }) => (
                <View style={styles.amountInput}>
                  <TextInput
                    label="Current Amount (R) *"
                    value={value}
                    onChangeText={onChange}
                    mode="outlined"
                    keyboardType="numeric"
                    left={<TextInput.Icon icon="cash" />}
                  />
                  {errors.currentAmount && (
                    <HelperText type="error">{errors.currentAmount.message}</HelperText>
                  )}
                </View>
              )}
            />
          </View>

          {/* Progress Display */}
          <Card style={styles.progressCard}>
            <Card.Content>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPercentage}>{progress.toFixed(1)}%</Text>
              </View>
              
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%` },
                  ]}
                />
              </View>
              
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Target</Text>
                  <Text style={styles.progressStatValue}>
                    R{parseFloat(targetAmount || 0).toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Current</Text>
                  <Text style={styles.progressStatValue}>
                    R{parseFloat(currentAmount || 0).toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Remaining</Text>
                  <Text style={[styles.progressStatValue, { color: '#F44336' }]}>
                    R{remaining.toLocaleString()}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Period Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Period Type *</Text>
            <Controller
              control={control}
              name="periodType"
              render={({ field: { onChange, value } }) => (
                <SegmentedButtons
                  value={value}
                  onValueChange={onChange}
                  buttons={[
                    {
                      value: 'daily',
                      label: 'Daily',
                      icon: 'calendar-today',
                    },
                    {
                      value: 'weekly',
                      label: 'Weekly',
                      icon: 'calendar-week',
                    },
                    {
                      value: 'monthly',
                      label: 'Monthly',
                      icon: 'calendar-month',
                    },
                    {
                      value: 'yearly',
                      label: 'Yearly',
                      icon: 'calendar',
                    },
                  ]}
                  style={styles.segmentedButtons}
                />
              )}
            />
            {errors.periodType && (
              <HelperText type="error">{errors.periodType.message}</HelperText>
            )}
          </View>

          {/* Start Date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Start Date *</Text>
            <TouchableOpacity
              onPress={() => setShowStartDatePicker(true)}
              style={styles.dateInput}
            >
              <View style={styles.dateInputContent}>
                <Icon name="calendar-start" size={24} color="#666" />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateLabel}>Goal Start Date</Text>
                  <Text style={styles.dateValue}>
                    {startDate.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    setValue('startDate', selectedDate);
                    if (endDate < selectedDate) {
                      setValue('endDate', new Date(selectedDate.getTime() + 30 * 24 * 60 * 60 * 1000));
                    }
                  }
                }}
              />
            )}
            {errors.startDate && (
              <HelperText type="error">{errors.startDate.message}</HelperText>
            )}
          </View>

          {/* End Date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>End Date *</Text>
            <TouchableOpacity
              onPress={() => setShowEndDatePicker(true)}
              style={styles.dateInput}
            >
              <View style={styles.dateInputContent}>
                <Icon name="calendar-end" size={24} color="#666" />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateLabel}>Target Completion Date</Text>
                  <Text style={styles.dateValue}>
                    {endDate.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                minimumDate={startDate}
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    setValue('endDate', selectedDate);
                  }
                }}
              />
            )}
            {errors.endDate && (
              <HelperText type="error">{errors.endDate.message}</HelperText>
            )}
          </View>

          {/* Daily Target Calculation */}
          <Card style={styles.calculationCard}>
            <Card.Content>
              <View style={styles.calculationHeader}>
                <Text style={styles.calculationTitle}>Daily Target</Text>
                <Text style={styles.calculationDays}>
                  {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))} days
                </Text>
              </View>
              <Text style={styles.calculationAmount}>
                R{dailyTarget.toFixed(0).toLocaleString()}
              </Text>
              <Text style={styles.calculationText}>
                You need to save R{dailyTarget.toFixed(0).toLocaleString()} per day
                to reach your goal by {endDate.toLocaleDateString()}.
              </Text>
            </Card.Content>
          </Card>

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

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={saving}
            disabled={saving}
            style={styles.submitButton}
            icon={isEditing ? 'check' : 'plus'}
          >
            {isEditing ? 'Update Goal' : 'Create Goal'}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// Keep all your existing styles exactly as they were
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  progressCard: {
    backgroundColor: '#f8f9ff',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
  segmentedButtons: {
    marginBottom: 8,
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
  dateLabel: {
    fontSize: 12,
    color: '#666',
  },
  dateValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  calculationCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
    marginBottom: 16,
  },
  calculationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  calculationDays: {
    fontSize: 12,
    color: '#2E7D32',
    fontStyle: 'italic',
  },
  calculationAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  calculationText: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 16,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#6C63FF',
  },
});