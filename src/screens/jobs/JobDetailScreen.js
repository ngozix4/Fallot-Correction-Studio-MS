import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Chip,
  Modal,
  Portal,
  TextInput,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { showMessage } from 'react-native-flash-message';
import { useNavigation, useRoute } from '@react-navigation/native';
import moment from 'moment';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../context/ThemeContext';
import database from '../../services/database';
import { useAuth } from '../../context/AuthContext';

export default function JobDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { jobId } = route.params;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [materialsModalVisible, setMaterialsModalVisible] = useState(false);
  const [newProgress, setNewProgress] = useState(0);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [linkedInvoice, setLinkedInvoice] = useState(null);

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      // Get job from SQLite database
      const jobData = await database.getJobById(jobId);
      
      if (!jobData) {
        throw new Error('Job not found');
      }
      
      setJob(jobData);
      setNewProgress(jobData.progress || 0);
      
      // Fetch linked invoice if exists
      if (jobData.invoiceId) {
        const invoice = await database.getInvoiceById(jobData.invoiceId);
        setLinkedInvoice(invoice);
      }
    } catch (error) {
      console.error('Error loading job:', error);
      showMessage({
        message: 'Error loading job',
        type: 'danger',
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Update the handleUpdateProgress method to sync with invoice:
const handleUpdateProgress = async () => {
    try {
        setProcessing(true);
        if (!user) return;
        
        // Update job progress in SQLite
        await database.updateJob(jobId, {
            progress: newProgress,
            status: newStatus || job.status,
            notes: notes || `Progress updated to ${newProgress}%`,
        });
        
        // If job has an invoice, ensure it reflects job status
        if (job.invoiceId) {
            try {
                const invoice = await database.getInvoiceById(job.invoiceId);
                if (invoice) {
                    // Update invoice based on job status
                    let paymentStatus = invoice.paymentStatus;
                    if (newStatus === 'completed' && !invoice.paymentStatus === 'completed') {
                        // Prompt to mark invoice as paid if job is completed
                        showMessage({
                            message: 'Job marked as completed. Please ensure invoice is paid.',
                            type: 'info',
                        });
                    }
                }
            } catch (invoiceError) {
                console.error('Error syncing with invoice:', invoiceError);
            }
        }
        
        showMessage({
            message: 'Progress updated successfully',
            type: 'success',
        });
        
        setProgressModalVisible(false);
        setNotes('');
        fetchJob();
    } catch (error) {
        console.error('Error updating progress:', error);
        showMessage({
            message: 'Error updating progress',
            type: 'danger',
        });
    } finally {
        setProcessing(false);
    }
};

// Update the handleUpdateStatus method:
const handleUpdateStatus = async () => {
    if (!newStatus) {
        showMessage({
            message: 'Please select a status',
            type: 'danger',
        });
        return;
    }

    try {
        setProcessing(true);
        if (!user) return;
        
        // Update job status in SQLite
        await database.updateJob(jobId, { 
            status: newStatus,
            progress: newProgress || job.progress,
        });
        
        // Sync with invoice if job is completed
        if (newStatus === 'completed' && job.invoiceId) {
            try {
                const invoice = await database.getInvoiceById(job.invoiceId);
                if (invoice && invoice.paymentStatus !== 'completed') {
                    showMessage({
                        message: 'Job completed. Please ensure invoice is marked as paid.',
                        type: 'info',
                    });
                }
            } catch (error) {
                console.error('Error checking invoice:', error);
            }
        }
        
        showMessage({
            message: 'Status updated successfully',
            type: 'success',
        });
        
        setStatusModalVisible(false);
        fetchJob();
    } catch (error) {
        console.error('Error updating status:', error);
        showMessage({
            message: 'Error updating status',
            type: 'danger',
        });
    } finally {
        setProcessing(false);
    }
};

  const handleCreateInvoice = async () => {
    try {
      setProcessing(true);
      
      if (!job.invoiceId) {
        const invoice = await database.createInvoiceFromJob(jobId, user.id);
        showMessage({
          message: 'Invoice created successfully',
          type: 'success',
        });
        setLinkedInvoice(invoice);
        
        // Update job with new invoice reference
        await database.updateJob(jobId, { invoiceId: invoice.id });
        fetchJob();
      } else {
        navigation.navigate('InvoiceDetail', { invoiceId: job.invoiceId });
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      showMessage({
        message: 'Error creating invoice',
        type: 'danger',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return colors.success || '#4CAF50';
      case 'in_progress':
        return colors.info || '#2196F3';
      case 'delivered':
        return colors.secondary || '#9C27B0';
      default:
        return colors.warning || '#FF9800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Not Started';
    }
  };

  const getDaysRemaining = () => {
    if (!job) return 0;
    
    // Handle both string and Date objects
    let dueDate;
    if (typeof job.dueDate === 'string') {
      dueDate = new Date(job.dueDate);
    } else if (job.dueDate instanceof Date) {
      dueDate = job.dueDate;
    } else if (job.dueDate) {
      dueDate = new Date(job.dueDate);
    } else {
      return 0;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading || !job) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary || '#6C63FF'} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background || '#f5f5f5' }]}>
      {/* Header */}
      <Card style={[styles.headerCard, { backgroundColor: colors.card }]}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Title style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Title>
              <Paragraph style={[styles.clientName, { color: colors.textSecondary }]}>{job.customerName}</Paragraph>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(job.status) + '20' }]}
              textStyle={{ color: getStatusColor(job.status) }}
            >
              {getStatusText(job.status)}
            </Chip>
          </View>

          <Text style={[styles.jobDescription, { color: colors.textSecondary }]}>{job.description}</Text>
        </Card.Content>
      </Card>

      {/* Linked Invoice Section */}
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={[styles.sectionTitle, { color: colors.text }]}>Invoice</Title>
            <Button
              mode="contained"
              compact
              buttonColor={colors.primary}
              onPress={handleCreateInvoice}
              loading={processing}
              disabled={processing}
            >
              {job.invoiceId ? 'View Invoice' : 'Create Invoice'}
            </Button>
          </View>
          
          {linkedInvoice ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: linkedInvoice.id })}
              style={styles.linkedInvoice}
            >
              <Icon name="file-document" size={24} color={colors.primary} />
              <View style={styles.linkedInvoiceInfo}>
                <Text style={[styles.linkedInvoiceText, { color: colors.text }]}>
                  Invoice #{linkedInvoice.invoiceNumber}
                </Text>
                <View style={styles.invoiceDetails}>
                  <Text style={[styles.invoiceStatus, { 
                    color: linkedInvoice.paymentStatus === 'completed' ? colors.success : colors.warning 
                  }]}>
                    {linkedInvoice.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                  </Text>
                  <Text style={[styles.invoiceAmount, { color: colors.primary }]}>
                    R{linkedInvoice.totalAmount?.toLocaleString() || '0'}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.noInvoice}>
              <Icon name="file-document-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.noInvoiceText, { color: colors.text }]}>No invoice created yet</Text>
              <Text style={[styles.noInvoiceSubtext, { color: colors.textSecondary }]}>
                Create an invoice to track payments for this job
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Progress Section */}
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={[styles.sectionTitle, { color: colors.text }]}>Progress</Title>
            <TouchableOpacity onPress={() => setProgressModalVisible(true)}>
              <Text style={[styles.editButton, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Current Progress</Text>
              <Text style={[styles.progressPercentage, { color: colors.primary }]}>{job.progress || 0}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant || '#E0E0E0' }]}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${job.progress || 0}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Dates Section */}
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Title style={[styles.sectionTitle, { color: colors.text }]}>Timeline</Title>
          
          <View style={styles.dateGrid}>
            <View style={styles.dateItem}>
              <Icon name="calendar-start" size={24} color={colors.primary} />
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Start Date</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {job.createdAt ? moment(job.createdAt).format('MMM DD, YYYY') : 'Not set'}
              </Text>
            </View>
            
            <View style={styles.dateItem}>
              <Icon name="calendar-end" size={24} color={colors.warning} />
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Due Date</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {job.dueDate ? moment(job.dueDate).format('MMM DD, YYYY') : 'Not set'}
              </Text>
            </View>
          </View>
          
          <View style={[styles.daysRemaining, { backgroundColor: colors.surface }]}>
            <Icon
              name="clock"
              size={20}
              color={getDaysRemaining() < 0 ? colors.error : getDaysRemaining() <= 3 ? colors.warning : colors.success}
            />
            <Text style={[
              styles.daysRemainingText,
              { 
                color: getDaysRemaining() < 0 ? colors.error : getDaysRemaining() <= 3 ? colors.warning : colors.success 
              },
            ]}>
              {getDaysRemaining() < 0
                ? `${Math.abs(getDaysRemaining())} days overdue`
                : `${getDaysRemaining()} days remaining`}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Payment Section */}
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Title style={[styles.sectionTitle, { color: colors.text }]}>Payment Status</Title>
          
          <View style={styles.paymentGrid}>
            <View style={styles.paymentItem}>
              <View style={styles.paymentHeader}>
                <Icon
                  name={job.depositReceived ? 'check-circle' : 'alert-circle'}
                  size={24}
                  color={job.depositReceived ? colors.success : colors.warning}
                />
                <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Deposit</Text>
              </View>
              <Text style={[styles.paymentAmount, { color: colors.text }]}>
                R{(job.depositAmount || 0).toLocaleString()}
              </Text>
              <Text style={styles.paymentStatus}>
                {job.depositReceived ? 'Received' : 'Pending'}
              </Text>
            </View>
            
            <View style={styles.paymentItem}>
              <View style={styles.paymentHeader}>
                <Icon
                  name={job.finalPaymentReceived ? 'check-circle' : 'alert-circle'}
                  size={24}
                  color={job.finalPaymentReceived ? colors.success : colors.warning}
                />
                <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Final Payment</Text>
              </View>
              <Text style={[styles.paymentAmount, { color: colors.text }]}>
                R{(job.finalPaymentAmount || 0).toLocaleString()}
              </Text>
              <Text style={styles.paymentStatus}>
                {job.finalPaymentReceived ? 'Received' : 'Pending'}
              </Text>
            </View>
          </View>
          
          <View style={[styles.totalPayment, { borderTopColor: colors.divider }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Job Value:</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              R{((job.depositAmount || 0) + (job.finalPaymentAmount || 0)).toLocaleString()}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Notes Section */}
      {job.notes && (
        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: colors.text }]}>Notes</Title>
            
            <Text style={[styles.noteText, { color: colors.text }]}>{job.notes}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          style={[styles.actionButton]}
          buttonColor={colors.primary}
          icon="update"
          onPress={() => setProgressModalVisible(true)}
        >
          Update Progress
        </Button>
        
        <Button
          mode="contained"
          style={[styles.actionButton]}
          buttonColor={colors.info}
          icon="swap-vertical"
          onPress={() => setStatusModalVisible(true)}
        >
          Change Status
        </Button>
      </View>

      {/* Progress Update Modal */}
      <Portal>
        <Modal
          visible={progressModalVisible}
          onDismiss={() => setProgressModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={{ backgroundColor: colors.card }}>
            <Card.Content>
              <Title style={[styles.modalTitle, { color: colors.text }]}>Update Progress</Title>
              
              <View style={styles.progressSliderContainer}>
                <Text style={[styles.progressValue, { color: colors.primary }]}>{newProgress}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={5}
                  value={newProgress}
                  onValueChange={setNewProgress}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.surfaceVariant}
                  thumbTintColor={colors.primary}
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>0%</Text>
                  <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>50%</Text>
                  <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>100%</Text>
                </View>
              </View>
              
              <TextInput
                label="Notes (Optional)"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                style={styles.notesInput}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setProgressModalVisible(false)}
                  style={styles.modalButton}
                  textColor={colors.text}
                  disabled={processing}
                >
                  Cancel
                </Button>
                
                <Button
                  mode="contained"
                  onPress={handleUpdateProgress}
                  style={[styles.modalButton]}
                  buttonColor={colors.primary}
                  loading={processing}
                  disabled={processing}
                >
                  Update
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Status Update Modal */}
      <Portal>
        <Modal
          visible={statusModalVisible}
          onDismiss={() => setStatusModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={{ backgroundColor: colors.card }}>
            <Card.Content>
              <Title style={[styles.modalTitle, { color: colors.text }]}>Update Status</Title>
              
              {['not_started', 'in_progress', 'completed', 'delivered'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    newStatus === status && styles.statusOptionActive,
                    { borderColor: colors.border },
                    newStatus === status && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => setNewStatus(status)}
                >
                  <Icon
                    name={
                      status === 'completed' ? 'check-circle' :
                      status === 'in_progress' ? 'progress-clock' :
                      status === 'delivered' ? 'truck-delivery' :
                      'clock-start'
                    }
                    size={24}
                    color={newStatus === status ? colors.primary : getStatusColor(status)}
                  />
                  <Text style={[
                    styles.statusOptionText,
                    { color: newStatus === status ? colors.primary : colors.text },
                  ]}>
                    {getStatusText(status)}
                  </Text>
                </TouchableOpacity>
              ))}
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setStatusModalVisible(false)}
                  style={styles.modalButton}
                  textColor={colors.text}
                  disabled={processing}
                >
                  Cancel
                </Button>
                
                <Button
                  mode="contained"
                  onPress={handleUpdateStatus}
                  style={[styles.modalButton]}
                  buttonColor={colors.info}
                  loading={processing}
                  disabled={processing || !newStatus}
                >
                  Update Status
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 14,
    marginTop: 4,
  },
  statusChip: {
    height: 32,
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    fontWeight: '600',
  },
  linkedInvoice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9ff',
  },
  linkedInvoiceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  linkedInvoiceText: {
    fontSize: 16,
    fontWeight: '500',
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  invoiceStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noInvoice: {
    alignItems: 'center',
    padding: 20,
  },
  noInvoiceText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  noInvoiceSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dateItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  daysRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  daysRemainingText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentItem: {
    width: '48%',
    alignItems: 'center',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 12,
    color: '#999',
  },
  totalPayment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalContainer: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressSliderContainer: {
    marginBottom: 20,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  slider: {
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
  },
  notesInput: {
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  statusOptionActive: {
    borderColor: '#6C63FF',
  },
  statusOptionText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
