import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Chip,
  SegmentedButtons,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import database from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { showMessage } from 'react-native-flash-message';

const { width: screenWidth } = Dimensions.get('window');

export default function FinancialScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    currentBalance: 0,
    startingCapital: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netProfit: 0,
    recentRecords: [],
    invoiceIncome: 0,
    otherIncome: 0,
  });
  const [goals, setGoals] = useState([]);
  const [expenseStats, setExpenseStats] = useState({
    categoryStats: [],
    monthlyTrend: [],
  });
  const [invoices, setInvoices] = useState([]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month');
  const [showIncomeAnalytics, setShowIncomeAnalytics] = useState(true);
  const [incomeRecords, setIncomeRecords] = useState([]);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user, analyticsPeriod]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      if (!user) return;
      
      const [dashboardStats, goalsList, expensesList, expensesStats, invoicesList, incomeList] = await Promise.all([
        database.getDashboardStats(user.id),
        database.getGoals(user.id),
        database.getExpenses(user.id),
        database.getExpenseStats(user.id),
        database.getInvoices(user.id),
        database.getIncome(user.id) // Get income records
      ]);

      // Calculate total income (invoices + other income)
      const invoiceIncome = calculateIncomeByPeriod(invoicesList, analyticsPeriod);
      const otherIncome = incomeList
        .filter(income => {
          const date = new Date(income.date);
          const now = new Date();
          let startDate = new Date();
          
          switch (analyticsPeriod) {
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
            default:
              startDate.setMonth(now.getMonth() - 1);
          }
          return date >= startDate;
        })
        .reduce((total, income) => total + Math.abs(income.amount), 0);

      const monthlyIncome = invoiceIncome + otherIncome;
      const monthlyExpenses = calculateExpensesByPeriod(expensesList, analyticsPeriod);
      
      // Combine recent transactions (invoice income + other income + expenses)
      const recentInvoices = invoicesList.slice(0, 2).map(invoice => ({
        ...invoice,
        type: 'invoice_income',
        description: `Invoice: ${invoice.customerName}`,
        amount: invoice.totalAmount,
        category: 'Invoice',
        date: invoice.createdAt,
        invoiceNumber: invoice.invoiceNumber
      }));

      const recentOtherIncome = incomeList.slice(0, 2).map(income => ({
        ...income,
        type: 'other_income',
        description: income.description.replace('[Income] ', ''),
        amount: Math.abs(income.amount),
        category: income.category.replace('income_', ''),
        date: income.date
      }));

      const recentExpenses = expensesList.slice(0, 1).map(expense => ({
        ...expense,
        type: 'expense',
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date
      }));

      // Combine and sort by date
      const recentRecords = [...recentInvoices, ...recentOtherIncome, ...recentExpenses]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      setSummary({
        currentBalance: dashboardStats.financial.balance,
        startingCapital: user.startingCapital || 0,
        monthlyIncome,
        monthlyExpenses,
        netProfit: monthlyIncome + monthlyExpenses,
        recentRecords,
        invoiceIncome,
        otherIncome
      });
      
      setGoals(goalsList);
      setExpenseStats(expensesStats);
      setInvoices(invoicesList);
      setIncomeRecords(incomeList);
    } catch (error) {
      console.error('Error loading financial data:', error);
      showMessage({
        message: 'Error loading financial data',
        type: 'danger',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateIncomeByPeriod = (invoices, period) => {
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
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return invoices
      .filter(invoice => new Date(invoice.createdAt) >= startDate)
      .reduce((total, invoice) => total + invoice.totalAmount, 0);
  };

  const calculateExpensesByPeriod = (expenses, period) => {
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
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return expenses
      .filter(expense => new Date(expense.date) >= startDate && expense.amount > 0)
      .reduce((total, expense) => total + expense.amount, 0);
  };

const prepareIncomeAnalyticsData = () => {
  // Get all income data (invoices + other income)
  const allIncomeData = [
    ...invoices.map(inv => ({
      date: new Date(inv.createdAt),
      amount: inv.totalAmount,
      type: 'invoice'
    })),
    ...incomeRecords.map(inc => ({
      date: new Date(inc.date),
      amount: Math.abs(inc.amount),
      type: 'other'
    }))
  ];

  if (allIncomeData.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  // Sort by date
  allIncomeData.sort((a, b) => a.date - b.date);

  // Get date range
  const earliestDate = allIncomeData[0].date;
  const latestDate = new Date(); // Current date or use most recent transaction
  
  // Group by month
  const monthlyData = {};
  const monthsSet = new Set();
  
  // Add all months between earliest and latest dates
  let currentDate = new Date(earliestDate);
  currentDate.setDate(1); // Start from first day of month
  
  while (currentDate <= latestDate) {
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthName,
        yearMonth: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
        invoiceIncome: 0,
        otherIncome: 0,
        totalIncome: 0
      };
      monthsSet.add(monthKey);
    }
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Fill with actual data
  allIncomeData.forEach(item => {
    const date = item.date;
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    if (monthlyData[monthKey]) {
      if (item.type === 'invoice') {
        monthlyData[monthKey].invoiceIncome += item.amount;
      } else {
        monthlyData[monthKey].otherIncome += item.amount;
      }
      monthlyData[monthKey].totalIncome += item.amount;
    }
  });

  // Sort months chronologically
  const sortedMonths = Array.from(monthsSet).sort((a, b) => {
    const [aYear, aMonth] = a.split('-').map(Number);
    const [bYear, bMonth] = b.split('-').map(Number);
    return aYear === bYear ? aMonth - bMonth : aYear - bYear;
  });

  // Limit to max 12 months for readability
  const displayMonths = sortedMonths.slice(-12);
  
  const labels = displayMonths.map(key => monthlyData[key].month);
  const invoiceIncomeData = displayMonths.map(key => monthlyData[key].invoiceIncome || 0);
  const otherIncomeData = displayMonths.map(key => monthlyData[key].otherIncome || 0);

  return {
    labels,
    datasets: [
      {
        data: invoiceIncomeData,
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 3,
      },
      {
        data: otherIncomeData,
        color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
        strokeWidth: 3,
      }
    ],
    monthlyData
  };
};

  const prepareProfitLossData = () => {
  const incomeData = prepareIncomeAnalyticsData();
  
  if (incomeData.labels.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  // Get expenses by month
  const monthlyExpenses = {};
  expenseStats.monthlyTrend.forEach(item => {
    if (item.month) {
      monthlyExpenses[item.month] = item.total || 0;
    }
  });

  // Match months with income data and calculate profit
  const profitData = incomeData.labels.map((label, index) => {
    const monthYear = Object.keys(incomeData.monthlyData)[index];
    const invoiceIncome = incomeData.datasets[0].data[index] || 0;
    const otherIncome = incomeData.datasets[1].data[index] || 0;
    const totalIncome = invoiceIncome + otherIncome;
    
    // Find corresponding expense
    let expense = 0;
    Object.keys(monthlyExpenses).forEach(monthKey => {
      if (monthKey.includes(incomeData.monthlyData[Object.keys(incomeData.monthlyData)[index]].yearMonth)) {
        expense = monthlyExpenses[monthKey] || 0;
      }
    });
    
    return totalIncome - expense;
  });

  return {
    labels: incomeData.labels,
    datasets: [{
      data: profitData,
      color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
      strokeWidth: 2
    }]
  };
};

  const prepareCategoryComparison = () => {
    const invoiceIncome = summary.invoiceIncome;
    const otherIncome = summary.otherIncome;
    const expenseTotal = summary.monthlyExpenses;
    
    const data = [];
    
    // Add invoice income
    if (invoiceIncome > 0) {
      data.push({
        name: 'Invoice Income',
        amount: invoiceIncome,
        color: '#4CAF50', // Green
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      });
    }
    
    // Add other income
    if (otherIncome > 0) {
      data.push({
        name: 'Other Income',
        amount: otherIncome,
        color: '#FFC107', // Yellow
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      });
    }
    
    // Add top 3 expense categories
    const expenseCategories = expenseStats.categoryStats.slice(0, 3);
    expenseCategories.forEach((stat, index) => {
      if (stat.total > 0) {
        data.push({
          name: stat._id.charAt(0).toUpperCase() + stat._id.slice(1),
          amount: stat.total,
          color: index === 0 ? '#F44336' : // Red for first expense
                 index === 1 ? '#E91E63' : // Pink for second
                 '#9C27B0', // Purple for third
          legendFontColor: '#7F7F7F',
          legendFontSize: 12
        });
      }
    });
    
    return data;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFinancialData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16
  },
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: '#e0e0e0',
    strokeDasharray: '0',
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#6C63FF'
  }
};

  const incomeAnalyticsData = prepareIncomeAnalyticsData();
  const profitLossData = prepareProfitLossData();
  const categoryComparisonData = prepareCategoryComparison();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Balance Overview */}
      <Card style={styles.balanceCard}>
        <Card.Content>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>
                R{summary.currentBalance.toLocaleString()}
              </Text>
            </View>
            <View style={styles.balanceChange}>
              <Icon
                name={summary.netProfit >= 0 ? 'trending-up' : 'trending-down'}
                size={24}
                color={summary.netProfit >= 0 ? '#4CAF50' : '#F44336'}
              />
              <Text style={[
                styles.netProfit,
                { color: summary.netProfit >= 0 ? '#4CAF50' : '#F44336' },
              ]}>
                {summary.netProfit >= 0 ? '+' : '-'}R{Math.abs(summary.netProfit).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.incomeExpenseRow}>
            <View style={styles.incomeExpenseItem}>
              <Icon name="cash-plus" size={20} color="#4CAF50" />
              <View style={styles.incomeExpenseText}>
                <Text style={styles.incomeExpenseLabel}>Income</Text>
                <Text style={styles.incomeText}>
                  R{summary.monthlyIncome.toLocaleString()}
                </Text>
              </View>
            </View>
            
            <View style={styles.incomeExpenseItem}>
              <Icon name="cash-minus" size={20} color="#F44336" />
              <View style={styles.incomeExpenseText}>
                <Text style={styles.incomeExpenseLabel}>Expenses</Text>
                <Text style={styles.expenseText}>
                  R{summary.monthlyExpenses.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Income Breakdown */}
          <View style={styles.incomeBreakdown}>
            <View style={styles.breakdownItem}>
              <Icon name="file-document" size={16} color="#4CAF50" />
              <Text style={styles.breakdownLabel}>Invoices</Text>
              <Text style={styles.breakdownAmount}>
                R{summary.invoiceIncome?.toLocaleString() || '0'}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Icon name="gift" size={16} color="#FFC107" />
              <Text style={styles.breakdownLabel}>Other</Text>
              <Text style={styles.breakdownAmount}>
                R{summary.otherIncome?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>

          {/* Period Selector */}
          <View style={styles.periodSelector}>
            <Text style={styles.periodLabel}>Period:</Text>
            <SegmentedButtons
              value={analyticsPeriod}
              onValueChange={setAnalyticsPeriod}
              buttons={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'quarter', label: 'Quarter' },
                { value: 'year', label: 'Year' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Button
          mode="contained"
          style={styles.quickActionButton}
          icon="target"
          onPress={() => navigation.navigate('CreateGoal')}
        >
          Set Goal
        </Button>
        
        <Button
          mode="contained"
          style={[styles.quickActionButton, { backgroundColor: '#4CAF50' }]}
          icon="cash-plus"
          onPress={() => navigation.navigate('IncomeOptions')}
        >
          Add Income
        </Button>
        
        <Button
          mode="contained"
          style={[styles.quickActionButton, { backgroundColor: '#F44336' }]}
          icon="cash-minus"
          onPress={() => navigation.navigate('AddExpense')}
        >
          Add Expense
        </Button>
      </View>

      {/* Analytics Toggle */}
      <View style={styles.analyticsToggle}>
        <TouchableOpacity 
          style={[styles.analyticsTab, showIncomeAnalytics && styles.analyticsTabActive]}
          onPress={() => setShowIncomeAnalytics(true)}
        >
          <Icon 
            name="chart-line" 
            size={20} 
            color={showIncomeAnalytics ? '#fff' : '#666'} 
          />
          <Text style={[styles.analyticsTabText, showIncomeAnalytics && styles.analyticsTabTextActive]}>
            Income Analytics
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.analyticsTab, !showIncomeAnalytics && styles.analyticsTabActive]}
          onPress={() => setShowIncomeAnalytics(false)}
        >
          <Icon 
            name="chart-pie" 
            size={20} 
            color={!showIncomeAnalytics ? '#fff' : '#666'} 
          />
          <Text style={[styles.analyticsTabText, !showIncomeAnalytics && styles.analyticsTabTextActive]}>
            Category Analysis
          </Text>
        </TouchableOpacity>
      </View>

      {/* Analytics Charts */}
      {showIncomeAnalytics ? (
        <>
          {/* Combined Income Trend (Invoice + Other) */}
<Card style={styles.card}>
  <Card.Content>
    <View style={styles.sectionHeader}>
      <Title style={styles.sectionTitle}>Income Trend</Title>
    </View>
    {incomeAnalyticsData.labels.length > 0 && incomeAnalyticsData.datasets[0].data.length > 0 ? (
      <>
        <LineChart
          data={{
            labels: incomeAnalyticsData.labels,
            datasets: incomeAnalyticsData.datasets
          }}
          width={screenWidth - 48}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          formatYLabel={(value) => `R${parseInt(value)?.toLocaleString() || '0'}`}
          withVerticalLines={false}
          withHorizontalLines={true}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          withShadow={false}
          segments={5}
          fromZero={true}
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Invoice Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>Other Income</Text>
          </View>
        </View>
      </>
    ) : (
      <Text style={styles.noDataText}>No income data available</Text>
    )}
  </Card.Content>
</Card>

{/* Income vs Expenses Comparison */}
<Card style={styles.card}>
  <Card.Content>
    <View style={styles.sectionHeader}>
      <Title style={styles.sectionTitle}>Income vs Expenses</Title>
    </View>
    {incomeAnalyticsData.labels.length > 0 && expenseStats.monthlyTrend.length > 0 ? (
      <>
        <LineChart
          data={{
            labels: incomeAnalyticsData.labels.slice(-6),
            datasets: [
              {
                data: incomeAnalyticsData.labels.slice(-6).map((label, index) => {
                  const invoiceIncome = incomeAnalyticsData.datasets[0].data[index] || 0;
                  const otherIncome = incomeAnalyticsData.datasets[1].data[index] || 0;
                  return invoiceIncome + otherIncome;
                }),
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                strokeWidth: 3,
              },
              {
                data: expenseStats.monthlyTrend.slice(-6).map(item => item?.total || 0),
                color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
                strokeWidth: 3,
              }
            ]
          }}
          width={screenWidth - 48}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          formatYLabel={(value) => `R${parseInt(value)?.toLocaleString() || '0'}`}
          withVerticalLines={false}
          withShadow={false}
          segments={5}
          fromZero={true}
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Total Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Expenses</Text>
          </View>
        </View>
      </>
    ) : (
      <Text style={styles.noDataText}>No comparison data available</Text>
    )}
  </Card.Content>
</Card>

{/* Profit/Loss Trend */}
<Card style={styles.card}>
  <Card.Content>
    <View style={styles.sectionHeader}>
      <Title style={styles.sectionTitle}>Profit/Loss Trend</Title>
    </View>
    {profitLossData.labels.length > 0 && profitLossData.datasets[0].data.length > 0 ? (
      <>
        <LineChart
          data={{
            labels: profitLossData.labels,
            datasets: profitLossData.datasets
          }}
          width={screenWidth - 48}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => {
              // Handle both profit and loss colors
              return `rgba(108, 99, 255, ${opacity})`;
            },
          }}
          bezier
          style={styles.chart}
          formatYLabel={(value) => {
            const numValue = parseInt(value) || 0;
            return `${numValue >= 0 ? '+' : ''}R${Math.abs(numValue).toLocaleString()}`;
          }}
          withVerticalLines={false}
          withShadow={false}
          segments={5}
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Profit</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Loss</Text>
          </View>
        </View>
      </>
    ) : (
      <Text style={styles.noDataText}>No profit/loss data available</Text>
    )}
  </Card.Content>
</Card>
        </>
      ) : (
        /* Category Comparison Pie Chart */
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Income vs Expenses Breakdown</Title>
            </View>
            {categoryComparisonData.length > 0 ? (
              <>
                <PieChart
                  data={categoryComparisonData.map(item => ({
                    ...item,
                    color: item.name === 'Invoice Income' ? '#4CAF50' : // Green
                           item.name === 'Other Income' ? '#FFC107' : // Yellow
                           item.name.includes('Income') ? '#FF9800' : // Orange for other income types
                           '#F44336', // Red for expenses
                    legendFontColor: '#7F7F7F',
                    legendFontSize: 12
                  }))}
                  width={screenWidth - 48}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
                <View style={styles.pieChartLegend}>
                  {categoryComparisonData.slice(0, 4).map((item, index) => (
                    <View key={index} style={styles.pieLegendItem}>
                      <View style={[
                        styles.pieLegendDot, 
                        { 
                          backgroundColor: item.name === 'Invoice Income' ? '#4CAF50' :
                                         item.name === 'Other Income' ? '#FFC107' :
                                         item.name.includes('Income') ? '#FF9800' : '#F44336'
                        }
                      ]} />
                      <Text style={styles.pieLegendText}>
                        {item.name}: R{item.amount.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.noDataText}>No data available</Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Goals Section */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Financial Goals</Title>
            <TouchableOpacity onPress={() => navigation.navigate('CreateGoal')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {goals.length > 0 ? (
            goals.slice(0, 3).map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalItem}
                onPress={() => navigation.navigate('CreateGoal', { goalId: goal.id })}
              >
                <View style={styles.goalInfo}>
                  <Text style={styles.goalName}>{goal.goalName}</Text>
                  <Text style={styles.goalPeriod}>
                    {goal.periodType} • {new Date(goal.endDate).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.goalProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${goal.progress || 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(goal.progress || 0)}%</Text>
                </View>
                
                <View style={styles.goalAmounts}>
                  <Text style={styles.currentAmount}>
                    R{goal.currentAmount.toLocaleString()}
                  </Text>
                  <Text style={styles.targetAmount}>
                    / R{goal.targetAmount.toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              style={styles.addGoalButton}
              onPress={() => navigation.navigate('CreateGoal')}
            >
              <Icon name="plus-circle" size={24} color="#6C63FF" />
              <Text style={styles.addGoalText}>Set your first financial goal</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>

      {/* Recent Transactions */}
<Card style={styles.card}>
  <Card.Content>
    <View style={styles.sectionHeader}>
      <Title style={styles.sectionTitle}>Recent Transactions</Title>
      <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
        <Text style={styles.seeAllText}>See All</Text>
      </TouchableOpacity>
    </View>
    
    {summary.recentRecords.length > 0 ? (
      summary.recentRecords.map((record, index) => (
        <TouchableOpacity
          key={index}
          style={styles.transactionItem}
          onPress={() => {
            if (record.type === 'invoice_income') {
              navigation.navigate('InvoiceDetail', { invoiceId: record.id });
            } else if (record.type === 'other_income') {
              // Navigate to income detail if available
              showMessage({
                message: 'Income detail view coming soon',
                type: 'info',
              });
            } else if (record.type === 'expense') {
              navigation.navigate('ExpenseDetail', { expenseId: record.id });
            }
          }}
        >
          <View style={styles.transactionLeft}>
            <Icon
              name={record.type === 'expense' ? 'cash-minus' : 'cash-plus'}
              size={24}
              color={record.type === 'expense' ? '#F44336' : '#4CAF50'}
            />
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDescription}>
                {record.description.length > 40 
                  ? record.description.substring(0, 40) + '...' 
                  : record.description}
              </Text>
              <Text style={styles.transactionCategory}>
                {record.category} • {new Date(record.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.transactionAmount,
              { color: record.type === 'expense' ? '#F44336' : '#4CAF50' },
            ]}
          >
            {record.type === 'expense' ? '-' : '+'}R{record.amount.toLocaleString()}
          </Text>
        </TouchableOpacity>
      ))
    ) : (
      <Text style={styles.noDataText}>No recent transactions</Text>
    )}
  </Card.Content>
</Card>
    </ScrollView>
  );
}

const getCategoryColor = (index) => {
  const colors = ['#6C63FF', '#FF9800', '#2196F3', '#9C27B0', '#F44336', '#4CAF50'];
  return colors[index % colors.length];
};

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
  balanceCard: {
    margin: 16,
    marginBottom: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginTop: 4,
  },
  balanceChange: {
    alignItems: 'center',
  },
  netProfit: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  incomeExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incomeExpenseText: {
    marginLeft: 12,
  },
  incomeExpenseLabel: {
    fontSize: 12,
    color: '#666',
  },
  incomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 2,
  },
  expenseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 2,
  },
  incomeBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  periodSelector: {
    marginTop: 16,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#6C63FF',
  },
  incomeMenuButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    paddingVertical: 12,
  },
  incomeMenuText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  analyticsToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
  },
  analyticsTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  analyticsTabActive: {
    backgroundColor: '#6C63FF',
  },
  analyticsTabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  analyticsTabTextActive: {
    color: '#fff',
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
    color: '#333',
  },
  seeAllText: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  pieChartLegend: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pieLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  pieLegendText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  goalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  goalInfo: {
    marginBottom: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  goalPeriod: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
    minWidth: 40,
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  targetAmount: {
    fontSize: 14,
    color: '#666',
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  addGoalText: {
    color: '#6C63FF',
    fontWeight: '600',
    marginLeft: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 40,
  },
});
