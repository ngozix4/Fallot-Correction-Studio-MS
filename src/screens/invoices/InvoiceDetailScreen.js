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
import QRCode from 'react-native-qrcode-svg';
import database from '../../services/database';
import pdfService from '../../services/pdfService';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import PDFCache from '../../utils/PDFCache';

export default function InvoiceDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { invoiceId } = route.params;
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState('deposit');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);
  const [processingPDF, setProcessingPDF] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  useEffect(() => {
    if (invoice) {
      preloadPDF();
    }
  }, [invoice]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const invoiceData = await database.getInvoiceById(invoiceId);
      if (!invoiceData) {
        throw new Error('Invoice not found');
      }
      setInvoice(invoiceData);
    } catch (error) {
      console.error('Error loading invoice:', error);
      showMessage({
        message: 'Error loading invoice',
        type: 'danger',
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const preloadPDF = async () => {
    try {
      setPdfReady(false);
      const uri = await pdfService.getOrCreateInvoicePDF(invoice, user?.profilePicture || null);
      setPdfUri(uri);
      setPdfReady(true);
    } catch (error) {
      console.error('Error preloading PDF:', error);
    }
  };

  const clearInvoicePDFCache = async () => {
    try {
      PDFCache.clear();
      await pdfService.deleteInvoicePDFs(invoice);
      console.log('✅ Cleared PDF cache for invoice updates');
    } catch (error) {
      console.warn('Error clearing PDF cache:', error);
    }
  };

  const handleSharePDF = async () => {
    try {
      setProcessingPDF(true);
      
      PDFCache.clear();
      await pdfService.regenerateInvoicePDF(invoice, user?.profilePicture || null);
      
      const pdfUri = await pdfService.getOrCreateInvoicePDF(invoice, user?.profilePicture || null);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Fallo Tailor Invoice - ${invoice.invoiceNumber || ''}`,
          UTI: 'com.adobe.pdf'
        });
        return true;
      } else {
        throw new Error('Sharing not available on this device');
      }
      
    } catch (error) {
      console.error('Error sharing PDF:', error);
      showMessage({
        message: error.message || 'Error sharing PDF',
        type: 'danger',
      });
    } finally {
      setProcessingPDF(false);
    }
  };

  const handleDeleteInvoice = async () => {
    try {
      setProcessingDelete(true);
      
      // Start transaction
      await database.db.execAsync('BEGIN TRANSACTION');
      
      // Get invoice data before deletion
      const invoiceData = invoice;
      
      if (!invoiceData) {
        throw new Error('Invoice data not found');
      }
      
      // 1. Get the job ID if exists
      const jobId = invoiceData.jobId;
      
      // 2. If job exists, delete it
      if (jobId) {
        await database.db.runAsync('DELETE FROM jobs WHERE id = ?', [jobId]);
        console.log('✅ Linked job deleted:', jobId);
      }
      
      // 3. Adjust user balance (remove the invoice amount from balance)
      await database.db.runAsync(
        'UPDATE users SET currentBalance = currentBalance - ? WHERE id = ?',
        [invoiceData.totalAmount, invoiceData.userId]
      );
      console.log('✅ User balance adjusted');
      
      // 4. Delete the invoice
      await database.db.runAsync('DELETE FROM invoices WHERE id = ?', [invoiceId]);
      console.log('✅ Invoice deleted');
      
      // Commit transaction
      await database.db.execAsync('COMMIT');
      
      // Clear PDF cache
      await clearInvoicePDFCache();
      
      showMessage({
        message: 'Invoice deleted successfully',
        type: 'success',
      });
      
      // Navigate back to invoices list
      navigation.goBack();
      
    } catch (error) {
      // Rollback on error
      await database.db.execAsync('ROLLBACK');
      
      console.error('Error deleting invoice:', error);
      showMessage({
        message: 'Failed to delete invoice: ' + error.message,
        type: 'danger',
      });
    } finally {
      setProcessingDelete(false);
      setDeleteModalVisible(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice? This will also:\n\n• Remove the linked job\n• Adjust your account balance\n• Remove from transaction history\n\nThis action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: handleDeleteInvoice,
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const handleProcessPayment = async () => {
    if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
      showMessage({
        message: 'Please enter a valid amount',
        type: 'danger',
      });
      return;
    }

    try {
      setProcessingPayment(true);
      
      const amount = Number(paymentAmount);
      let newDepositPaid = invoice.depositAmount;
      let newBalanceDue = invoice.balanceDue;
      let newPaymentStatus = invoice.paymentStatus;
      let updateJobData = {};
      
      if (paymentType === 'deposit') {
        newDepositPaid = amount;
        newBalanceDue = invoice.totalAmount - amount;
        
        if (amount >= invoice.totalAmount * 0.5) {
          newPaymentStatus = 'deposit_received';
          updateJobData = {
            depositReceived: true,
            depositAmount: amount
          };
        } else if (amount > 0 && amount < invoice.totalAmount * 0.5) {
          newPaymentStatus = 'partial_deposit';
          updateJobData = {
            depositReceived: true,
            depositAmount: amount
          };
        }
      } else {
        newDepositPaid = invoice.depositAmount;
        newBalanceDue = Math.max(0, invoice.balanceDue - amount);
        
        if (newBalanceDue <= 0) {
          newPaymentStatus = 'completed';
          updateJobData = {
            finalPaymentReceived: true,
            finalPaymentAmount: amount,
            status: 'completed'
          };
        } else if (amount > 0) {
          newPaymentStatus = 'partial_payment';
          updateJobData = {
            finalPaymentAmount: amount
          };
        }
      }
      
      // Update invoice in database
      await database.db.runAsync(
        `UPDATE invoices SET 
          depositAmount = ?, 
          balanceDue = ?, 
          paymentStatus = ? 
        WHERE id = ?`,
        [newDepositPaid, newBalanceDue, newPaymentStatus, invoice.id]
      );
      
      // Update user balance
      await database.db.runAsync(
        'UPDATE users SET currentBalance = currentBalance + ? WHERE id = ?',
        [amount, invoice.userId]
      );
      
      // Update linked job if exists
      if (invoice.jobId) {
        try {
          const currentJob = await database.getJobById(invoice.jobId);
          if (currentJob) {
            const mergedUpdates = {
              ...updateJobData,
              depositAmount: newDepositPaid,
              finalPaymentAmount: newBalanceDue > 0 ? newBalanceDue : 0
            };
            
            await database.updateJob(invoice.jobId, mergedUpdates);
            console.log('✅ Job updated with payment:', mergedUpdates);
          }
        } catch (jobError) {
          console.error('Error updating job:', jobError);
        }
      }
      
      showMessage({
        message: `Payment of R${amount.toLocaleString()} processed successfully`,
        type: 'success',
      });
      
      fetchInvoice();
      
      if (invoice.jobId) {
        setTimeout(() => {
          showMessage({
            message: 'Job status updated successfully',
            type: 'success',
          });
        }, 500);
      }
      
      setPaymentModalVisible(false);
      setPaymentAmount('');
      
      await clearInvoicePDFCache();
      setPdfReady(false);
      setPdfUri(null);
      preloadPDF();
      
    } catch (error) {
      console.error('Payment error:', error);
      showMessage({
        message: 'Payment failed: ' + error.message,
        type: 'danger',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Paid';
      case 'deposit_received':
        return 'Deposit Received';
      case 'partial_deposit':
        return 'Partial Deposit';
      case 'partial_payment':
        return 'Partial Payment';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'deposit_received':
        return '#2196F3';
      case 'partial_deposit':
        return '#FF9800';
      case 'partial_payment':
        return '#FF9800';
      case 'pending':
      default:
        return '#F44336';
    }
  };

  const calculatePaymentAmount = () => {
    if (!invoice) return 0;
    
    if (paymentType === 'deposit') {
      return invoice.depositAmount || invoice.totalAmount * 0.5;
    } else {
      return invoice.balanceDue;
    }
  };

  if (loading || !invoice) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View>
              <Title style={styles.invoiceNumber}>
                {invoice.invoiceNumber}
              </Title>
              <Paragraph style={styles.jobDescription}>
                {invoice.jobDescription}
              </Paragraph>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(invoice.paymentStatus) + '20' }]}
              textStyle={{ color: getStatusColor(invoice.paymentStatus) }}
            >
              {getStatusText(invoice.paymentStatus)}
            </Chip>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>
              R{invoice.totalAmount.toLocaleString()}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Payment Summary */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Payment Summary</Title>
          
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Deposit Paid:</Text>
            <Text style={styles.paymentValue}>
              R{invoice.depositAmount.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Balance Due:</Text>
            <Text style={[styles.paymentValue, { color: invoice.balanceDue > 0 ? '#F44336' : '#4CAF50' }]}>
              R{invoice.balanceDue.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.paymentProgress}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(invoice.depositAmount / invoice.totalAmount) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>0%</Text>
              <Text style={styles.progressLabel}>
                {Math.round((invoice.depositAmount / invoice.totalAmount) * 100)}% Paid
              </Text>
              <Text style={styles.progressLabel}>100%</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Customer Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Customer Details</Title>
          
          <View style={styles.detailRow}>
            <Icon name="account" size={20} color="#666" />
            <Text style={styles.detailText}>{invoice.customerName}</Text>
          </View>
          
          {invoice.customerEmail && (
            <View style={styles.detailRow}>
              <Icon name="email" size={20} color="#666" />
              <Text style={styles.detailText}>{invoice.customerEmail}</Text>
            </View>
          )}
          
          {invoice.customerPhone && (
            <View style={styles.detailRow}>
              <Icon name="phone" size={20} color="#666" />
              <Text style={styles.detailText}>{invoice.customerPhone}</Text>
            </View>
          )}
          
          {invoice.customerAddress && (
            <View style={styles.detailRow}>
              <Icon name="map-marker" size={20} color="#666" />
              <Text style={styles.detailText}>{invoice.customerAddress}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Items */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Items</Title>
          
          {invoice.items && invoice.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <Text style={styles.itemQuantity}>
                  {item.quantity} × R{item.unitPrice.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                R{item.total.toLocaleString()}
              </Text>
            </View>
          ))}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              R{invoice.subtotal.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>
              R{invoice.tax.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>
              R{invoice.totalAmount.toLocaleString()}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Dates */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Dates</Title>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Issue Date:</Text>
            <Text style={styles.dateValue}>
              {moment(invoice.invoiceDate).format('MMM DD, YYYY')}
            </Text>
          </View>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Due Date:</Text>
            <Text style={[
              styles.dateValue,
              new Date(invoice.dueDate) < new Date() && invoice.balanceDue > 0
                ? { color: '#F44336' }
                : {},
            ]}>
              {moment(invoice.dueDate).format('MMM DD, YYYY')}
              {new Date(invoice.dueDate) < new Date() && invoice.balanceDue > 0 && ' (Overdue)'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Bank Details */}
      {invoice.bankDetails && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Bank Details</Title>
            <Text style={styles.bankDetails}>{invoice.bankDetails}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Terms */}
      {invoice.terms && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Terms & Conditions</Title>
            <Text style={styles.termsText}>{invoice.terms}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Notes</Title>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </Card.Content>
        </Card>
      )}

      {/* QR Code for Quick Payment */}
      <Card style={styles.card}>
        <Card.Content style={styles.qrContainer}>
          <Title style={styles.cardTitle}>Quick Payment</Title>
          <View style={styles.qrCodeContainer}>
            <QRCode
              value={`INVOICE:${invoice.id}|AMOUNT:${invoice.balanceDue}`}
              size={150}
              color="#6C63FF"
              backgroundColor="white"
            />
          </View>
          <Paragraph style={styles.qrText}>
            Scan to view invoice details
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          style={[styles.actionButton, { backgroundColor: '#F44336' }]}
          icon="delete"
          onPress={confirmDelete}
          loading={processingDelete}
          disabled={processingDelete}
        >
          Delete
        </Button>
        
        <Button
          mode="contained"
          style={[styles.actionButton, { backgroundColor: '#6C63FF' }]}
          icon="share-variant"
          onPress={handleSharePDF}
          loading={processingPDF}
          disabled={processingPDF}
        >
          Share PDF
        </Button>
        
        <Button
          mode="contained"
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          icon="cash"
          onPress={() => setPaymentModalVisible(true)}
          disabled={invoice.paymentStatus === 'completed'}
        >
          {invoice.paymentStatus === 'completed' ? 'Paid' : 'Pay'}
        </Button>
      </View>

      {/* Payment Modal */}
      <Portal>
        <Modal
          visible={paymentModalVisible}
          onDismiss={() => setPaymentModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>Record Payment</Title>
              
              <View style={styles.paymentTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'deposit' && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => setPaymentType('deposit')}
                >
                  <Text
                    style={[
                      styles.paymentTypeText,
                      paymentType === 'deposit' && styles.paymentTypeTextActive,
                    ]}
                  >
                    Deposit
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'final' && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => setPaymentType('final')}
                >
                  <Text
                    style={[
                      styles.paymentTypeText,
                      paymentType === 'final' && styles.paymentTypeTextActive,
                    ]}
                  >
                    Final Payment
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.expectedAmount}>
                Expected Amount: R{calculatePaymentAmount().toLocaleString()}
              </Text>
              
              <TextInput
                label="Amount (R)"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                mode="outlined"
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder={calculatePaymentAmount().toString()}
              />
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setPaymentModalVisible(false)}
                  style={styles.modalButton}
                  disabled={processingPayment}
                >
                  Cancel
                </Button>
                
                <Button
                  mode="contained"
                  onPress={handleProcessPayment}
                  style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                  loading={processingPayment}
                  disabled={processingPayment}
                >
                  Process Payment
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
    backgroundColor: '#f5f5f5',
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
    marginBottom: 16,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusChip: {
    height: 32,
  },
  amountContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentProgress: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#999',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  bankDetails: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 16,
  },
  qrText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
  paymentTypeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  paymentTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  paymentTypeButtonActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  paymentTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  paymentTypeTextActive: {
    color: '#FFFFFF',
  },
  expectedAmount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  amountInput: {
    marginBottom: 20,
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