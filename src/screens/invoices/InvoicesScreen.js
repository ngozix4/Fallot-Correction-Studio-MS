import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Searchbar, FAB, Card, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { showMessage } from 'react-native-flash-message';
import { useAuth } from '../../context/AuthContext';
import database from '../../services/database';

export default function InvoicesScreen({ navigation }) {
  const { user, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = useCallback(async () => {
    console.log('🔍 fetchInvoices called, user:', user?.id);
    
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    
    if (!user || !user.id) {
      console.log('👤 No authenticated user, showing empty state');
      setLoading(false);
      setInvoices([]);
      setFilteredInvoices([]);
      return;
    }

    try {
      console.log('📋 Fetching invoices for user:', user.id);
      setLoading(true);
      const invoicesData = await database.getInvoices(user.id);
      console.log('✅ Invoices fetched:', invoicesData?.length || 0);
      
      setInvoices(invoicesData || []);
      setFilteredInvoices(invoicesData || []);
    } catch (error) {
      console.error('❌ Error loading invoices:', error);
      showMessage({
        message: 'Error loading invoices',
        type: 'danger',
      });
      setInvoices([]);
      setFilteredInvoices([]);
    } finally {
      console.log('🏁 Finally block: setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    console.log('🔄 useEffect triggered, authLoading:', authLoading, 'user:', user?.id);
    fetchInvoices();
  }, [fetchInvoices, user, authLoading]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = invoices.filter(
      (invoice) =>
        invoice.jobDescription?.toLowerCase().includes(query) ||
        invoice.customerName?.toLowerCase().includes(query) ||
        invoice.invoiceNumber?.toLowerCase().includes(query)
    );
    setFilteredInvoices(filtered);
  }, [searchQuery, invoices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return '#4CAF50';
      case 'pending':
      default:
        return '#F44336';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'Paid';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'R0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return 'R0.00';
    return `R${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const renderInvoiceItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('InvoiceDetail', { invoiceId: item.id })
      }
      activeOpacity={0.7}
    >
      <Card style={styles.invoiceCard}>
        <Card.Content>
          <View style={styles.invoiceHeader}>
            <View style={styles.invoiceHeaderLeft}>
              <Text style={styles.invoiceNumber}>
                {item.invoiceNumber || 'No Invoice #'}
              </Text>
              <Text style={styles.jobDescription} numberOfLines={1}>
                {item.jobDescription || 'No Description'}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(item.paymentStatus)}20` }
            ]}>
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(item.paymentStatus) },
                ]}
              >
                {getStatusText(item.paymentStatus)}
              </Text>
            </View>
          </View>

          <View style={styles.invoiceDetails}>
            <View style={styles.detailRow}>
              <Icon name="account" size={16} color="#666" />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.customerName || 'No Customer'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Icon name="calendar" size={16} color="#666" />
              <Text style={styles.detailText}>
                Due: {formatDate(item.dueDate)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Icon name="cash" size={16} color="#666" />
              <Text style={styles.amountText}>
                {formatCurrency(item.totalAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.paymentInfo}>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Deposit Paid</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(item.depositAmount)}
              </Text>
            </View>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Balance Due</Text>
              <Text style={[
                styles.paymentValue,
                { color: parseFloat(item.balanceDue || 0) > 0 ? '#F44336' : '#4CAF50' }
              ]}>
                {formatCurrency(item.balanceDue)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (authLoading || (loading && !refreshing)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>
          {authLoading ? 'Loading app...' : 'Loading invoices...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search invoices..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        iconColor="#6C63FF"
        placeholderTextColor="#999"
      />

      {filteredInvoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="file-document-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No matching invoices' : 'No invoices found'}
          </Text>
          {searchQuery ? (
            <Text style={styles.emptySubtext}>
              Try a different search term
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateInvoice')}
              activeOpacity={0.8}
            >
              <Text style={styles.createButtonText}>Create Your First Invoice</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          renderItem={renderInvoiceItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6C63FF']}
              tintColor="#6C63FF"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {!loading && user && (
        <FAB
          style={styles.fab}
          icon="plus"
          color="#FFF"
          onPress={() => navigation.navigate('CreateInvoice')}
        />
      )}
    </View>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  invoiceCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  paymentItem: {
    alignItems: 'center',
    flex: 1,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  createButton: {
    marginTop: 24,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    elevation: 2,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
    borderRadius: 28,
  },
});