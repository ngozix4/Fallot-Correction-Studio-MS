import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Card, Title, Paragraph, ActivityIndicator, Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import database from '../../services/database';
import { showMessage } from 'react-native-flash-message';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    invoices: { totalInvoices: 0, pendingInvoices: 0, paidInvoices: 0, totalRevenue: 0 },
    jobs: { totalJobs: 0, completedJobs: 0, inProgressJobs: 0 },
    financial: { balance: 0, monthlyIncome: 0, monthlyExpenses: 0 },
  });
  const [galleryStats, setGalleryStats] = useState({ total: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!user || !user.id) {
        console.log('❌ No user found, skipping dashboard data fetch');
        setStats({
          invoices: { totalInvoices: 0, pendingInvoices: 0, paidInvoices: 0, totalRevenue: 0 },
          jobs: { totalJobs: 0, completedJobs: 0, inProgressJobs: 0 },
          financial: { balance: 0, monthlyIncome: 0, monthlyExpenses: 0 },
        });
        setLoading(false);
        return;
      }
      
      console.log('🔄 Fetching dashboard data for user:', user.id);
      
      const dashboardStats = await database.getDashboardStats(user.id);
      console.log('✅ Dashboard stats received:', dashboardStats);
      
      // Ensure we have valid data
      setStats({
        invoices: dashboardStats?.invoices || { 
          totalInvoices: 0, 
          pendingInvoices: 0, 
          paidInvoices: 0, 
          totalRevenue: 0 
        },
        jobs: dashboardStats?.jobs || { 
          totalJobs: 0, 
          completedJobs: 0, 
          inProgressJobs: 0 
        },
        financial: dashboardStats?.financial || { 
          balance: 0, 
          monthlyIncome: 0, 
          monthlyExpenses: 0 
        },
      });

      // Get other data
      const [invoices, jobs, galleryItems] = await Promise.all([
        database.getInvoices(user.id),
        database.getJobs(user.id),
        database.getGalleryItems(user.id)
      ]);
      
      // Set gallery stats
      setGalleryStats({
        total: galleryItems?.length || 0
      });

      // Get recent 5 invoices and jobs
      setRecentInvoices(invoices?.slice(0, 5) || []);
      setRecentJobs(jobs?.slice(0, 5) || []);

    } catch (error) {
      console.error('❌ Dashboard data fetch error:', error);
      showMessage({
        message: 'Error loading dashboard data',
        type: 'danger',
      });
      // Set default values on error
      setStats({
        invoices: { totalInvoices: 0, pendingInvoices: 0, paidInvoices: 0, totalRevenue: 0 },
        jobs: { totalJobs: 0, completedJobs: 0, inProgressJobs: 0 },
        financial: { balance: 0, monthlyIncome: 0, monthlyExpenses: 0 },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const calculateJobProgress = () => {
    if (stats.jobs.totalJobs === 0) return 0;
    return stats.jobs.completedJobs / stats.jobs.totalJobs;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header - UPDATED WITH PROFILE PICTURE */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          {user?.profilePicture ? (
            <Image
              source={{ uri: user.profilePicture }}
              style={styles.profileImage}
            />
          ) : (
            <Avatar.Text
              size={50}
              label={user?.name?.charAt(0) || 'U'}
              style={{ backgroundColor: '#6C63FF' }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <Card style={styles.balanceCard}>
        <Card.Content>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>
            R{(stats.financial?.balance || 0).toLocaleString()}
          </Text>
          <View style={styles.incomeExpenseRow}>
            <View style={styles.incomeExpenseItem}>
              <Text style={styles.incomeExpenseLabel}>Income</Text>
              <Text style={styles.incomeText}>
                R{(stats.financial?.monthlyIncome || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.incomeExpenseItem}>
              <Text style={styles.incomeExpenseLabel}>Expenses</Text>
              <Text style={styles.expenseText}>
                R{(stats.financial?.monthlyExpenses || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.quickStatsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Invoices')}
          >
            <Icon name="file-document" size={30} color="#6C63FF" />
            <Text style={styles.statNumber}>{stats.invoices.totalInvoices}</Text>
            <Text style={styles.statLabel}>Invoices</Text>
            <Text style={styles.statSubText}>
              {stats.invoices.pendingInvoices} pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Jobs')}
          >
            <Icon name="briefcase" size={30} color="#4CAF50" />
            <Text style={styles.statNumber}>{stats.jobs.totalJobs}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
            <Text style={styles.statSubText}>
              {stats.jobs.inProgressJobs} in progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Financial')}
          >
            <View style={styles.currencyIconContainer}>
              <Icon name="currency-usd" size={24} color="#fff" />
              <Text style={styles.currencyText}>R</Text>
            </View>
            <Text style={styles.statNumber}>
              R{(stats.invoices?.totalRevenue || 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={styles.statSubText}>Total income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Gallery')}
          >
            <Icon name="image" size={30} color="#9C27B0" />
            <Text style={styles.statNumber}>{galleryStats.total}</Text>
            <Text style={styles.statLabel}>Gallery</Text>
            <Text style={styles.statSubText}>Portfolio items</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Job Progress */}
      <Card style={styles.progressCard}>
        <Card.Content>
          <View style={styles.progressHeader}>
            <Title>Job Progress</Title>
            <Text style={styles.progressPercentage}>
              {Math.round(calculateJobProgress() * 100)}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${calculateJobProgress() * 100}%` },
              ]}
            />
          </View>
          <View style={styles.progressStats}>
            <View>
              <Text style={styles.progressStatNumber}>{stats.jobs.completedJobs}</Text>
              <Text style={styles.progressStatLabel}>Completed</Text>
            </View>
            <View>
              <Text style={styles.progressStatNumber}>{stats.jobs.inProgressJobs}</Text>
              <Text style={styles.progressStatLabel}>In Progress</Text>
            </View>
            <View>
              <Text style={styles.progressStatNumber}>
                {stats.jobs.totalJobs - stats.jobs.completedJobs - stats.jobs.inProgressJobs}
              </Text>
              <Text style={styles.progressStatLabel}>Pending</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Recent Invoices */}
      <Card style={styles.recentCard}>
        <Card.Content>
          <View style={styles.recentHeader}>
            <Title>Recent Invoices</Title>
            <TouchableOpacity onPress={() => navigation.navigate('Invoices')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentInvoices.length > 0 ? (
            recentInvoices.map((invoice) => (
              <TouchableOpacity
                key={invoice.id}
                style={styles.recentItem}
                onPress={() =>
                  navigation.navigate('Invoices', {
                    screen: 'InvoiceDetail',
                    params: { invoiceId: invoice.id },
                  })
                }
              >
                <View style={styles.recentItemLeft}>
                  <Icon
                    name="file-document"
                    size={24}
                    color={
                      invoice.paymentStatus === 'completed'
                        ? '#4CAF50'
                        : '#F44336'
                    }
                  />
                  <View style={styles.recentItemInfo}>
                    <Text style={styles.recentItemTitle} numberOfLines={1}>
                      {invoice.jobDescription}
                    </Text>
                    <Text style={styles.recentItemSubtitle}>
                      {invoice.customerName}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.recentItemAmount}>
                    R{((invoice.totalAmount) || 0).toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.recentItemStatus,
                      {
                        color:
                          invoice.paymentStatus === 'completed'
                            ? '#4CAF50'
                            : '#F44336',
                      },
                    ]}
                  >
                    {invoice.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noDataText}>No invoices yet</Text>
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Invoices', {
              screen: 'CreateInvoice'
            })}
          >
            <Icon name="plus-circle" size={30} color="#6C63FF" />
            <Text style={styles.quickActionText}>New Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Financial', {
              screen: 'AddExpense'
            })}
          >
            <Icon name="cash-minus" size={30} color="#F44336" />
            <Text style={styles.quickActionText}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Gallery', {
              screen: 'UploadGallery'
            })}
          >
            <Icon name="image-plus" size={30} color="#9C27B0" />
            <Text style={styles.quickActionText}>Add to Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Financial', {
              screen: 'CreateGoal'
            })}
          >
            <Icon name="target" size={30} color="#4CAF50" />
            <Text style={styles.quickActionText}>Set Goal</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#f0f0f0',
  },
  balanceCard: {
    margin: 16,
    backgroundColor: '#6C63FF',
    borderRadius: 16,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  incomeExpenseItem: {
    alignItems: 'center',
  },
  incomeExpenseLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  incomeText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  expenseText: {
    color: '#F44336',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickStatsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statSubText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  currencyIconContainer: {
    position: 'relative',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyText: {
    position: 'absolute',
    top: -2,
    right: -4,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 2,
  },
  progressCard: {
    margin: 16,
    marginTop: 0,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  progressStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  recentCard: {
    margin: 16,
    marginTop: 0,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  recentItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recentItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  recentItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recentItemStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});