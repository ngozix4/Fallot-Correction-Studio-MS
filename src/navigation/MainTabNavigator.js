import React from 'react';
import { 
  createBottomTabNavigator,
  BottomTabBar 
} from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import TransactionsScreen from '../screens/financial/TransactionsScreen';

// Import all screens
// Dashboard
import DashboardScreen from '../screens/dashboard/DashboardScreen';

// Invoices
import InvoicesScreen from '../screens/invoices/InvoicesScreen';
import CreateInvoiceScreen from '../screens/invoices/CreateInvoiceScreen';
import InvoiceDetailScreen from '../screens/invoices/InvoiceDetailScreen';

// Jobs
import JobsScreen from '../screens/jobs/JobsScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';

// Gallery
import GalleryScreen from '../screens/gallery/GalleryScreen';
import UploadGalleryScreen from '../screens/gallery/UploadGalleryScreen';
import GalleryDetailScreen from '../screens/gallery/GalleryDetailScreen';

// Financial
import FinancialScreen from '../screens/financial/FinancialScreen';
import CreateGoalScreen from '../screens/financial/CreateGoalScreen';
import AddExpenseScreen from '../screens/financial/AddExpenseScreen';
import PDFViewer from '../screens/PDFViewer';
import IncomeOptionsScreen from '../screens/financial/IncomeOptionsScreen';
import AddIncomeScreen from '../screens/financial/AddIncomeScreen';

// Profile
import ProfileScreen from '../screens/auth/ProfileScreen';

// Settings
import ThemeSettingsScreen from '../screens/settings/ThemeSettingsScreen';

const Tab = createBottomTabNavigator();
const InvoiceStack = createStackNavigator();
const JobStack = createStackNavigator();
const GalleryStack = createStackNavigator();
const FinancialStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// Create custom TabBar with SafeAreaView
function SafeTabBar(props) {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView 
      style={{ 
        backgroundColor: colors.card,
      }}
      edges={['bottom']}
    >
      <BottomTabBar {...props} />
    </SafeAreaView>
  );
}

// Invoice Stack Navigator
function InvoiceStackNavigator() {
  const { colors } = useTheme();
  
  return (
    <InvoiceStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <InvoiceStack.Screen 
        name="InvoicesMain" 
        component={InvoicesScreen} 
        options={{ title: 'Invoices' }}
      />
      <InvoiceStack.Screen 
        name="CreateInvoice" 
        component={CreateInvoiceScreen} 
        options={{ title: 'Create Invoice' }}
      />
      <InvoiceStack.Screen 
        name="InvoiceDetail" 
        component={InvoiceDetailScreen} 
        options={{ title: 'Invoice Details' }}
      />
      <InvoiceStack.Screen 
        name="PDFViewer" 
        component={PDFViewer}
        options={{ title: 'PDF Viewer' }}
      />
    </InvoiceStack.Navigator>
  );
}

// Job Stack Navigator
function JobStackNavigator() {
  const { colors } = useTheme();
  
  return (
    <JobStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <JobStack.Screen 
        name="JobsMain" 
        component={JobsScreen} 
        options={{ title: 'Jobs' }}
      />
      <JobStack.Screen 
        name="JobDetail" 
        component={JobDetailScreen} 
        options={{ title: 'Job Details' }}
      />
    </JobStack.Navigator>
  );
}

// Gallery Stack Navigator
function GalleryStackNavigator() {
  const { colors } = useTheme();
  
  return (
    <GalleryStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <GalleryStack.Screen 
        name="GalleryMain" 
        component={GalleryScreen} 
        options={{ title: 'Gallery' }}
      />
      <GalleryStack.Screen 
        name="UploadGallery" 
        component={UploadGalleryScreen} 
        options={{ title: 'Add to Gallery' }}
      />
      <GalleryStack.Screen 
        name="GalleryDetail" 
        component={GalleryDetailScreen} 
        options={{ title: 'Gallery Details' }}
      />
    </GalleryStack.Navigator>
  );
}

// Financial Stack Navigator
function FinancialStackNavigator() {
  const { colors } = useTheme();
  
  return (
    <FinancialStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <FinancialStack.Screen 
        name="FinancialMain" 
        component={FinancialScreen} 
        options={{ title: 'Financial' }}
      />
      
      <FinancialStack.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{ title: 'All Transactions' }}
      />
      <FinancialStack.Screen 
        name="CreateGoal" 
        component={CreateGoalScreen} 
        options={{ title: 'Create Goal' }}
      />
      <FinancialStack.Screen 
        name="AddExpense" 
        component={AddExpenseScreen} 
        options={{ title: 'Add Expense' }}
      />
      <FinancialStack.Screen 
        name="IncomeOptions" 
        component={IncomeOptionsScreen} 
        options={{ title: 'Income Options' }}
      />
      <FinancialStack.Screen 
        name="AddIncome" 
        component={AddIncomeScreen} 
        options={{ title: 'Add Income' }}
      />
    </FinancialStack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileStackNavigator() {
  const { colors } = useTheme();
  
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <ProfileStack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          headerShown: true,
        }}
      />
      <ProfileStack.Screen 
        name="ThemeSettings" 
        component={ThemeSettingsScreen} 
        options={{ title: 'Appearance' }}
      />
    </ProfileStack.Navigator>
  );
}

// Main Tab Navigator
export default function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      tabBar={props => <SafeTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Invoices') {
            iconName = focused ? 'file-document' : 'file-document-outline';
          } else if (route.name === 'Jobs') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Gallery') {
            iconName = focused ? 'image' : 'image-outline';
          } else if (route.name === 'Financial') {
            iconName = focused ? 'chart-bar' : 'chart-bar-stacked';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen 
        name="Invoices" 
        component={InvoiceStackNavigator} 
        options={{
          tabBarLabel: 'Invoices',
        }}
      />
      <Tab.Screen 
        name="Jobs" 
        component={JobStackNavigator} 
        options={{
          tabBarLabel: 'Jobs',
        }}
      />
      <Tab.Screen 
        name="Gallery" 
        component={GalleryStackNavigator} 
        options={{
          tabBarLabel: 'Gallery',
        }}
      />
      <Tab.Screen 
        name="Financial" 
        component={FinancialStackNavigator} 
        options={{
          tabBarLabel: 'Financial',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator} 
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}