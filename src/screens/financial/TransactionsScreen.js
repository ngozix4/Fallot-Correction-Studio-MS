import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Button,
  SegmentedButtons,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import database from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

const { height: screenHeight } = Dimensions.get('window');

export default function TransactionsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'quarter', 'year'

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, period]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterType]);

  const fetchTransactions = async () => {
  try {
    setLoading(true);
    
    if (!user) return;
    
    // Use the database method for consistent transaction data
    const allTransactions = await database.getRecentTransactions(user.id, 1000); // Get all
    
    // Sort by date (newest first)
    const sortedTransactions = allTransactions.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    setTransactions(sortedTransactions);
  } catch (error) {
    console.error('Error loading transactions:', error);
    showMessage({
      message: 'Error loading transactions',
      type: 'danger',
    });
  } finally {
    setLoading(false);
  }
};

  const filterTransactions = () => {
    let filtered = transactions;
    
    if (filterType !== 'all') {
      filtered = transactions.filter(t => t.type === filterType);
    }
    
    // Apply period filter
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    filtered = filtered.filter(t => new Date(t.date) >= startDate);
    
    setFilteredTransactions(filtered);
  };

  const getTotalByType = (type) => {
    return filteredTransactions
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const groupTransactionsByDate = () => {
    const grouped = {};
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dateKey = format(date, 'yyyy-MM-dd');
      const displayDate = format(date, 'MMMM d, yyyy');
      
      if (!grouped[displayDate]) {
        grouped[displayDate] = {
          title: displayDate,
          data: [],
          totalIncome: 0,
          totalExpense: 0,
        };
      }
      
      grouped[displayDate].data.push(transaction);
      
      if (transaction.type === 'income') {
        grouped[displayDate].totalIncome += transaction.amount;
      } else {
        grouped[displayDate].totalExpense += transaction.amount;
      }
    });
    
    return Object.values(grouped).sort((a, b) => 
      new Date(b.data[0].date) - new Date(a.data[0].date)
    );
  };

  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => handleTransactionPress(item)}
    >
      <View style={styles.transactionLeft}>
        <Icon
          name={item.type === 'expense' ? 'cash-minus' : 'cash-plus'}
          size={24}
          color={item.type === 'expense' ? '#F44336' : '#4CAF50'}
        />
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {item.description.length > 40 
              ? item.description.substring(0, 40) + '...' 
              : item.description}
          </Text>
          <Text style={styles.transactionCategory}>
            {item.category} • {format(new Date(item.date), 'hh:mm a')}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: item.type === 'expense' ? '#F44336' : '#4CAF50' },
        ]}
      >
        {item.type === 'expense' ? '-' : '+'}R{item.amount.toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  const handleTransactionPress = (transaction) => {
    if (transaction.subType === 'invoice') {
      navigation.navigate('InvoiceDetail', { invoiceId: transaction.rawData.id });
    } else if (transaction.subType === 'expense') {
      navigation.navigate('ExpenseDetail', { expenseId: transaction.rawData.id });
    }
  };

  const renderSectionHeader = ({ section: { title, totalIncome, totalExpense } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionTotals}>
        <Text style={styles.sectionTotalIncome}>
          +R{totalIncome.toLocaleString()}
        </Text>
        <Text style={styles.sectionTotalExpense}>
          -R{totalExpense.toLocaleString()}
        </Text>
      </View>
    </View>
  );

  const sections = groupTransactionsByDate();

  const renderListHeader = () => (
    <>
      {/* Header with Totals */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Income</Text>
              <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                R{getTotalByType('income').toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={[styles.summaryAmount, { color: '#F44336' }]}>
                R{getTotalByType('expense').toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text style={[styles.summaryAmount, { 
                color: getTotalByType('income') - getTotalByType('expense') >= 0 ? '#4CAF50' : '#F44336' 
              }]}>
                R{(getTotalByType('income') - getTotalByType('expense')).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filterSection}>
            <SegmentedButtons
              value={filterType}
              onValueChange={setFilterType}
              buttons={[
                { value: 'all', label: 'All' },
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expenses' },
              ]}
              style={styles.filterButtons}
            />
            
            <SegmentedButtons
              value={period}
              onValueChange={setPeriod}
              buttons={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'quarter', label: 'Quarter' },
                { value: 'year', label: 'Year' },
              ]}
              style={styles.periodButtons}
            />
          </View>
        </Card.Content>
      </Card>
    </>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="receipt" size={64} color="#CCCCCC" />
      <Text style={styles.emptyText}>No transactions found</Text>
      <Text style={styles.emptySubtext}>
        Try changing your filters or add new transactions
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyComponent}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      />
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  summaryCard: {
    marginTop: 16,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterSection: {
    marginTop: 16,
  },
  filterButtons: {
    marginBottom: 8,
  },
  periodButtons: {
    marginBottom: 8,
  },
  sectionHeader: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sectionTotals: {
    alignItems: 'flex-end',
  },
  sectionTotalIncome: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  sectionTotalExpense: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
    marginTop: 2,
  },
  transactionItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});