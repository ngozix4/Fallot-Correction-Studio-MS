import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Searchbar, FAB, Card, ActivityIndicator, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { showMessage } from 'react-native-flash-message';
import { useTheme } from '../../context/ThemeContext';
import database from '../../services/database';
import { useAuth } from '../../context/AuthContext';

export default function JobsScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, in_progress, completed, not_started

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  useEffect(() => {
    filterJobs();
  }, [searchQuery, jobs, filter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      const jobsList = await database.getJobs(user.id);
      
      // Fetch invoice details for each job
      const jobsWithInvoices = await Promise.all(
        jobsList.map(async (job) => {
          if (job.invoiceId) {
            const invoice = await database.getInvoiceById(job.invoiceId);
            return {
              ...job,
              invoiceNumber: invoice?.invoiceNumber,
              invoiceStatus: invoice?.paymentStatus,
              invoiceTotal: invoice?.totalAmount
            };
          }
          return job;
        })
      );
      
      setJobs(jobsWithInvoices);
      setFilteredJobs(jobsWithInvoices);
    } catch (error) {
      console.error('Error loading jobs:', error);
      showMessage({
        message: 'Error loading jobs',
        type: 'danger',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(job => job.status === filter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        job =>
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          job.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
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

  const renderJobItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('JobDetail', { jobId: item.id })
      }
    >
      <Card style={[styles.jobCard, { backgroundColor: colors.card }]}>
        <Card.Content>
          <View style={styles.jobHeader}>
            <View style={styles.jobTitleContainer}>
              <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.clientName, { color: colors.textSecondary }]}>{item.customerName}</Text>
            </View>
            <Chip
              style={[
                styles.statusChip,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
              textStyle={{ color: getStatusColor(item.status) }}
            >
              {getStatusText(item.status)}
            </Chip>
          </View>

          <Text style={[styles.jobDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>

          {/* Invoice Badge */}
          {item.invoiceId && (
            <View style={styles.invoiceBadge}>
              <Icon name="file-document" size={16} color={colors.primary} />
              <Text style={[styles.invoiceBadgeText, { color: colors.primary }]}>
                Invoice #{item.invoiceNumber}
              </Text>
            </View>
          )}

          <View style={styles.jobDetails}>
            <View style={styles.detailItem}>
              <Icon name="calendar-start" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'No date'}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Icon name="calendar-end" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Progress</Text>
              <Text style={[styles.progressPercentage, { color: colors.primary }]}>{item.progress || 0}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant || '#E0E0E0' }]}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${item.progress || 0}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.paymentInfo, { borderTopColor: colors.divider }]}>
            <View style={styles.paymentItem}>
              <Icon
                name={item.depositReceived ? 'check-circle' : 'circle-outline'}
                size={20}
                color={item.depositReceived ? colors.success : colors.textSecondary}
              />
              <Text style={[styles.paymentText, { color: colors.textSecondary }]}>
                Deposit: R{(item.depositAmount || 0).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.paymentItem}>
              <Icon
                name={item.finalPaymentReceived ? 'check-circle' : 'circle-outline'}
                size={20}
                color={item.finalPaymentReceived ? colors.success : colors.textSecondary}
              />
              <Text style={[styles.paymentText, { color: colors.textSecondary }]}>
                Total: R{(item.price || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary || '#6C63FF'} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Searchbar
        placeholder="Search jobs..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchBar, { backgroundColor: colors.card }]}
        iconColor={colors.primary}
        placeholderTextColor={colors.textSecondary}
        inputStyle={{ color: colors.text }}
      />

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip, 
            filter === 'all' && styles.filterChipActive,
            { backgroundColor: colors.card, borderColor: colors.border },
            filter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[
            styles.filterText, 
            { color: colors.textSecondary },
            filter === 'all' && styles.filterTextActive
          ]}>
            All Jobs
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterChip, 
            filter === 'not_started' && styles.filterChipActive,
            { backgroundColor: colors.card, borderColor: colors.border },
            filter === 'not_started' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setFilter('not_started')}
        >
          <Text style={[
            styles.filterText, 
            { color: colors.textSecondary },
            filter === 'not_started' && styles.filterTextActive
          ]}>
            Not Started
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterChip, 
            filter === 'in_progress' && styles.filterChipActive,
            { backgroundColor: colors.card, borderColor: colors.border },
            filter === 'in_progress' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setFilter('in_progress')}
        >
          <Text style={[
            styles.filterText, 
            { color: colors.textSecondary },
            filter === 'in_progress' && styles.filterTextActive
          ]}>
            In Progress
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterChip, 
            filter === 'completed' && styles.filterChipActive,
            { backgroundColor: colors.card, borderColor: colors.border },
            filter === 'completed' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[
            styles.filterText, 
            { color: colors.textSecondary },
            filter === 'completed' && styles.filterTextActive
          ]}>
            Completed
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterChip, 
            filter === 'delivered' && styles.filterChipActive,
            { backgroundColor: colors.card, borderColor: colors.border },
            filter === 'delivered' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setFilter('delivered')}
        >
          <Text style={[
            styles.filterText, 
            { color: colors.textSecondary },
            filter === 'delivered' && styles.filterTextActive
          ]}>
            Delivered
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {filteredJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="briefcase-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No jobs found</Text>
          {searchQuery || filter !== 'all' ? (
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Try a different search or filter
            </Text>
          ) : (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('CreateJob')}
            >
              <Text style={styles.createButtonText}>
                Create your first job
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
      
      <FAB
        style={[styles.fab, { backgroundColor: colors.primary }]}
        icon="plus"
        onPress={() => navigation.navigate('CreateJob')}
        color="#fff"
      />
    </View>
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
  searchBar: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  filterContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  filterContent: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipActive: {
    borderColor: '#6C63FF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  jobCard: {
    marginBottom: 12,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 14,
    marginTop: 4,
  },
  statusChip: {
    height: 28,
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  invoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  invoiceBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  jobDetails: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 6,
  },
  progressContainer: {
    marginBottom: 16,
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
    fontSize: 14,
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
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  createButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
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
  },
});
