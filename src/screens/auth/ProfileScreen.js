import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  Image,
} from 'react-native';
import {
  Avatar,
  Title,
  Paragraph,
  Card,
  Button,
  TextInput,
  Modal,
  Portal,
  ActivityIndicator,
  Divider,
  Chip,
  Switch,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { showMessage } from 'react-native-flash-message';
import database from '../../services/database';
import ImagePickerService from '../../services/ImagePickerService';

export default function ProfileScreen({ navigation }) {
  const { user, updateProfile, updateBalance } = useAuth();
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    phone: '',
    address: '',
    profilePicture: '',
  });

  const [balanceData, setBalanceData] = useState({
    startingCapital: '0',
    currentBalance: '0',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        businessName: user.businessName || '',
        phone: user.phone || '',
        address: user.address || '',
        profilePicture: user.profilePicture || '',
      });
      
      setBalanceData({
        startingCapital: (user.startingCapital || 0).toString(),
        currentBalance: (user.currentBalance || 0).toString(),
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!formData.name || !formData.businessName) {
      showMessage({
        message: 'Please fill in all required fields',
        type: 'danger',
      });
      return;
    }

    try {
      setLoading(true);
      await updateProfile(formData);
      setEditModalVisible(false);
      showMessage({
        message: 'Profile updated successfully',
        type: 'success',
      });
    } catch (error) {
      showMessage({
        message: 'Failed to update profile',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    const startingCapital = parseFloat(balanceData.startingCapital) || 0;
    const currentBalance = parseFloat(balanceData.currentBalance) || 0;

    if (isNaN(startingCapital) || isNaN(currentBalance)) {
      showMessage({
        message: 'Please enter valid numbers',
        type: 'danger',
      });
      return;
    }

    if (currentBalance < 0) {
      showMessage({
        message: 'Current balance cannot be negative',
        type: 'danger',
      });
      return;
    }

    try {
      setLoading(true);
      await updateBalance(startingCapital, currentBalance);
      setBalanceModalVisible(false);
      showMessage({
        message: 'Balance updated successfully',
        type: 'success',
      });
    } catch (error) {
      showMessage({
        message: 'Failed to update balance',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfilePicture = async (source) => {
    try {
      setUploadingImage(true);

      let result;
      if (source === 'camera') {
        console.log('📷 Calling ImagePickerService.takePhoto()');
        result = await ImagePickerService.takePhoto();
      } else {
        console.log('🖼️ Calling ImagePickerService.pickImage()');
        result = await ImagePickerService.pickImage();
      }

      console.log('📸 Image picker result:', result);

      if (result) {
        // Delete old profile picture if exists
        if (user.profilePicture) {
          console.log('🗑️ Deleting old profile picture:', user.profilePicture);
          await ImagePickerService.deleteImage(user.profilePicture);
        }

        // Update user profile with new picture
        const updates = { profilePicture: result.uri };
        console.log('💾 Updating user in database with profile picture');
        await database.updateUser(user.id, updates);
        
        // Update local state
        setFormData({ ...formData, profilePicture: result.uri });
        
        // Update auth context
        console.log('🔄 Updating auth context profile');
        await updateProfile({ profilePicture: result.uri });
        
        showMessage({
          message: 'Profile picture updated successfully',
          type: 'success',
        });
      } else {
        console.log('⚠️ No image selected or selection cancelled');
      }
    } catch (error) {
      console.error('❌ Error selecting profile picture:', error);
      showMessage({
        message: 'Failed to update profile picture: ' + error.message,
        type: 'danger',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      if (!user.profilePicture) {
        console.log('⚠️ No profile picture to remove');
        return;
      }

      Alert.alert(
        'Remove Profile Picture',
        'Are you sure you want to remove your profile picture?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              console.log('🗑️ Removing profile picture:', user.profilePicture);
              // Delete the image file
              await ImagePickerService.deleteImage(user.profilePicture);
              
              // Update user profile
              const updates = { profilePicture: null };
              await database.updateUser(user.id, updates);
              
              // Update auth context
              await updateProfile({ profilePicture: null });

              // Update local state
              setFormData({ ...formData, profilePicture: '' });
              
              showMessage({
                message: 'Profile picture removed',
                type: 'success',
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error removing profile picture:', error);
      showMessage({
        message: 'Failed to remove profile picture',
        type: 'danger',
      });
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: `Check out my Fashion Studio app - The ultimate fashion designer business management app!`,
        title: 'Fashion Studio App',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@example.com?subject=Support Request');
  };

  const calculateNetGrowth = () => {
    const starting = parseFloat(user?.startingCapital) || 0;
    const current = parseFloat(user?.currentBalance) || 0;
    return current - starting;
  };

  const calculateGrowthPercentage = () => {
    const starting = parseFloat(user?.startingCapital) || 0;
    const current = parseFloat(user?.currentBalance) || 0;
    if (starting === 0) return 0;
    return ((current - starting) / starting) * 100;
  };

  const renderAvatar = () => {
    if (uploadingImage) {
      return (
        <View style={styles.avatarContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      );
    }

    if (formData.profilePicture) {
      return (
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: formData.profilePicture }}
            style={styles.profileImage}
          />
          <TouchableOpacity
            style={styles.editAvatarButton}
            onPress={() => {
              console.log('📸 Camera button pressed - showing Alert');
              
              Alert.alert(
                'Profile Picture',
                'How would you like to update your profile picture?',
                [
                  {
                    text: 'Take Photo',
                    onPress: () => {
                      console.log('📷 Take Photo selected');
                      handleSelectProfilePicture('camera');
                    }
                  },
                  {
                    text: 'Choose from Gallery',
                    onPress: () => {
                      console.log('🖼️ Choose from Gallery selected');
                      handleSelectProfilePicture('gallery');
                    }
                  },
                  {
                    text: 'Remove Picture',
                    style: 'destructive',
                    onPress: () => {
                      console.log('🗑️ Remove Picture selected');
                      handleRemoveProfilePicture();
                    }
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => console.log('❌ Cancelled')
                  }
                ],
                { cancelable: true }
              );
            }}
          >
            <Icon name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.avatarContainer}>
        <Avatar.Text
          size={100}
          label={user?.name?.charAt(0)?.toUpperCase() || 'U'}
          style={[styles.avatar, { backgroundColor: '#6C63FF' }]}
          labelStyle={styles.avatarLabel}
        />
        <TouchableOpacity
          style={styles.editAvatarButton}
          onPress={() => {
            console.log('📸 Camera button pressed - showing Alert');
            
            Alert.alert(
              'Profile Picture',
              'How would you like to update your profile picture?',
              [
                {
                  text: 'Take Photo',
                  onPress: () => {
                    console.log('📷 Take Photo selected');
                    handleSelectProfilePicture('camera');
                  }
                },
                {
                  text: 'Choose from Gallery',
                  onPress: () => {
                    console.log('🖼️ Choose from Gallery selected');
                    handleSelectProfilePicture('gallery');
                  }
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => console.log('❌ Cancelled')
                }
              ],
              { cancelable: true }
            );
          }}
        >
          <Icon name="camera" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const netGrowth = calculateNetGrowth();
  const growthPercentage = calculateGrowthPercentage();

  const actionItems = [
    {
      icon: 'account-edit',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () => setEditModalVisible(true),
      color: '#6C63FF',
    },
    {
      icon: 'cash-sync',
      title: 'Update Balance',
      subtitle: 'Adjust your capital and current balance',
      onPress: () => setBalanceModalVisible(true),
      color: '#4CAF50',
    },
    {
      icon: 'share-variant',
      title: 'Share App',
      subtitle: 'Share with other designers',
      onPress: handleShareApp,
      color: '#9C27B0',
    },
    {
      icon: 'help-circle',
      title: 'Help & Support',
      subtitle: 'Contact support team',
      onPress: handleContactSupport,
      color: '#FF5722',
    },
  ];

  const appInfoItems = [
    { label: 'App Version', value: '1.0.0' },
    { label: 'Last Updated', value: 'February 2026' },
    { label: 'Developer', value: 'github.com/ngozix4' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          {renderAvatar()}
          
          <Title style={styles.userName}>{user.name}</Title>
          <Paragraph style={styles.businessName}>
            {user.businessName}
          </Paragraph>
          
          <Chip
            icon="check-circle"
            style={styles.verifiedChip}
            textStyle={{ color: '#4CAF50' }}
          >
            Fashion Studio Account
          </Chip>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Icon name="email" size={16} color="#666" />
              <Text style={styles.contactText}>
                {user.email}
              </Text>
            </View>
            <View style={styles.contactItem}>
              <Icon name="phone" size={16} color="#666" />
              <Text style={styles.contactText}>
                {user.phone}
              </Text>
            </View>
            <View style={styles.contactItem}>
              <Icon name="map-marker" size={16} color="#666" />
              <Text 
                style={styles.contactText} 
                numberOfLines={2}
              >
                {user.address}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Business Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>
              Business Overview
            </Title>
            <TouchableOpacity onPress={() => setBalanceModalVisible(true)}>
              <Icon name="pencil" size={20} color="#6C63FF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Icon name="cash" size={24} color="#6C63FF" />
              <Text style={styles.statLabel}>
                Current Balance
              </Text>
              <Text style={styles.statValue}>
                R{(user.currentBalance || 0).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="bank" size={24} color="#4CAF50" />
              <Text style={styles.statLabel}>
                Starting Capital
              </Text>
              <Text style={styles.statValue}>
                R{(user.startingCapital || 0).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon 
                name={netGrowth >= 0 ? 'trending-up' : 'trending-down'} 
                size={24} 
                color={netGrowth >= 0 ? '#4CAF50' : '#F44336'} 
              />
              <Text style={styles.statLabel}>
                Net Growth
              </Text>
              <Text style={[
                styles.statValue, 
                { color: netGrowth >= 0 ? '#4CAF50' : '#F44336' }
              ]}>
                R{netGrowth.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon 
                name="percent" 
                size={24} 
                color={growthPercentage >= 0 ? '#4CAF50' : '#F44336'} 
              />
              <Text style={styles.statLabel}>
                Growth %
              </Text>
              <Text style={[
                styles.statValue, 
                { color: growthPercentage >= 0 ? '#4CAF50' : '#F44336' }
              ]}>
                {growthPercentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Account Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>
            Account Settings
          </Title>
          
          {actionItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionItem}
              onPress={item.onPress}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: `${item.color}20` }]}>
                  <Icon name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.actionSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          ))}
        </Card.Content>
      </Card>

      {/* App Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>
            App Information
          </Title>
          
          {appInfoItems.map((item, index) => (
            <View 
              key={index} 
              style={styles.infoItem}
            >
              <Text style={styles.infoLabel}>
                {item.label}
              </Text>
              <Text style={styles.infoValue}>
                {item.value}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Edit Profile Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>
                Edit Profile
              </Title>
              
              <TextInput
                label="Full Name *"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                mode="outlined"
                style={styles.input}
              />
              
              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <TextInput
                label="Business Name *"
                value={formData.businessName}
                onChangeText={(text) => setFormData({ ...formData, businessName: text })}
                mode="outlined"
                style={styles.input}
              />
              
              <TextInput
                label="Phone Number"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                mode="outlined"
                style={styles.input}
                keyboardType="phone-pad"
              />
              
              <TextInput
                label="Business Address"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setEditModalVisible(false)}
                  style={styles.modalButton}
                  disabled={loading}
                >
                  Cancel
                </Button>
                
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  style={styles.modalButton}
                  loading={loading}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Update Balance Modal */}
      <Portal>
        <Modal
          visible={balanceModalVisible}
          onDismiss={() => setBalanceModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>
                Update Balance
              </Title>
              
              <TextInput
                label="Starting Capital (R)"
                value={balanceData.startingCapital}
                onChangeText={(text) => setBalanceData({ ...balanceData, startingCapital: text })}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              
              <TextInput
                label="Current Balance (R)"
                value={balanceData.currentBalance}
                onChangeText={(text) => setBalanceData({ ...balanceData, currentBalance: text })}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              
              <View style={styles.balanceSummary}>
                <Text style={styles.balanceSummaryText}>
                  Net Growth: R{calculateNetGrowth().toLocaleString()}
                </Text>
                <Text style={[
                  styles.balanceSummaryText, 
                  { color: calculateGrowthPercentage() >= 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  Growth: {calculateGrowthPercentage().toFixed(1)}%
                </Text>
              </View>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setBalanceModalVisible(false)}
                  style={styles.modalButton}
                  disabled={loading}
                >
                  Cancel
                </Button>
                
                <Button
                  mode="contained"
                  onPress={handleUpdateBalance}
                  style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                  loading={loading}
                  disabled={loading}
                >
                  Update Balance
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
    marginBottom: 12,
    elevation: 2,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    elevation: 4,
  },
  avatarLabel: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#f0f0f0',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  verifiedChip: {
    marginBottom: 20,
  },
  contactInfo: {
    width: '100%',
    alignItems: 'flex-start',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  contactText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
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
  input: {
    marginBottom: 16,
  },
  balanceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  balanceSummaryText: {
    fontSize: 14,
    fontWeight: '500',
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