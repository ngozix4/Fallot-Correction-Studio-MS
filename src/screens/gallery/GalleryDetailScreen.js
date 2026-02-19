import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Alert,
  Dimensions,
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
import database from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { showMessage } from 'react-native-flash-message';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

export default function GalleryDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { galleryId } = route.params;

  const [galleryItem, setGalleryItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    clientName: '',
    featured: false,
  });

  useEffect(() => {
    fetchGalleryItem();
  }, [galleryId]);

  const fetchGalleryItem = async () => {
    try {
      setLoading(true);
      const item = await database.getGalleryItemById(galleryId);
      setGalleryItem(item);
      setEditForm({
        title: item.title,
        description: item.description || '',
        category: item.category,
        clientName: item.clientName || '',
        featured: item.featured || false,
      });
    } catch (error) {
      showMessage({
        message: 'Error loading gallery item',
        type: 'danger',
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Gallery Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await database.deleteGalleryItem(galleryId);
              
              showMessage({
                message: 'Gallery item deleted successfully',
                type: 'success',
              });
              
              navigation.goBack();
            } catch (error) {
              showMessage({
                message: 'Error deleting gallery item',
                type: 'danger',
              });
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await database.updateGalleryItem(galleryId, editForm);
      
      showMessage({
        message: 'Gallery item updated successfully',
        type: 'success',
      });
      
      setEditModalVisible(false);
      fetchGalleryItem();
    } catch (error) {
      showMessage({
        message: 'Error updating gallery item',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        title: galleryItem.title,
        message: `Check out this design: ${galleryItem.title}\n${galleryItem.description || ''}`,
      };
      
      if (galleryItem.images && galleryItem.images.length > 0) {
        shareContent.url = galleryItem.images[0].uri;
      }
      
      await Share.share(shareContent);
    } catch (error) {
      showMessage({
        message: 'Error sharing gallery item',
        type: 'danger',
      });
    }
  };

  const getCategoryLabel = (category) => {
    const categories = {
      wedding: 'Wedding',
      evening_wear: 'Evening Wear',
      casual: 'Casual',
      traditional: 'Traditional',
      custom: 'Custom',
      other: 'Other',
    };
    return categories[category] || category;
  };

  if (loading && !deleting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!galleryItem) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Images Grid */}
      {galleryItem.images && galleryItem.images.length > 0 ? (
        <View style={styles.imagesGrid}>
          {galleryItem.images.slice(0, 4).map((image, index) => (
            <TouchableOpacity
              key={image.id}
              style={styles.imageWrapper}
              onPress={() => {
                // Show image full screen
                navigation.navigate('ImageViewer', { images: galleryItem.images, index });
              }}
            >
              <Image source={{ uri: image.uri }} style={styles.image} />
              {index === 3 && galleryItem.images.length > 4 && (
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>
                    +{galleryItem.images.length - 4}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.noImagesContainer}>
          <Icon name="image-off" size={80} color="#ccc" />
          <Text style={styles.noImagesText}>No images available</Text>
        </View>
      )}

      {/* Header Info */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Title style={styles.title}>{galleryItem.title}</Title>
              {galleryItem.featured && (
                <Chip
                  style={styles.featuredChip}
                  textStyle={styles.featuredChipText}
                  icon="star"
                >
                  Featured
                </Chip>
              )}
            </View>
            <Chip
              mode="outlined"
              style={styles.categoryChip}
              textStyle={styles.categoryText}
            >
              {getCategoryLabel(galleryItem.category)}
            </Chip>
          </View>

          {galleryItem.description && (
            <Paragraph style={styles.description}>
              {galleryItem.description}
            </Paragraph>
          )}

          <View style={styles.detailsGrid}>
            {galleryItem.clientName && (
              <View style={styles.detailItem}>
                <Icon name="account" size={16} color="#666" />
                <Text style={styles.detailText}>{galleryItem.clientName}</Text>
              </View>
            )}
            
            {galleryItem.dateCompleted && (
              <View style={styles.detailItem}>
                <Icon name="calendar" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {new Date(galleryItem.dateCompleted).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            <View style={styles.detailItem}>
              <Icon name="image-multiple" size={16} color="#666" />
              <Text style={styles.detailText}>
                {galleryItem.images?.length || 0} images
              </Text>
            </View>
          </View>

          {galleryItem.tags && galleryItem.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {galleryItem.tags.map((tag, index) => (
                <Chip
                  key={index}
                  mode="outlined"
                  style={styles.tagChip}
                  textStyle={styles.tagText}
                >
                  {tag}
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Danger Zone */}
      <Card style={[styles.card, styles.dangerCard]}>
        <Card.Content>
          <Title style={[styles.sectionTitle, styles.dangerTitle]}>
            Danger Zone
          </Title>
          <Paragraph style={styles.dangerText}>
            Once you delete this gallery item, there is no going back. Please
            be certain.
          </Paragraph>
          <Button
            mode="contained"
            onPress={handleDelete}
            loading={deleting}
            disabled={deleting}
            style={styles.deleteButton}
            icon="delete"
          >
            Delete Gallery Item
          </Button>
        </Card.Content>
      </Card>

      {/* Edit Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>Edit Gallery Item</Title>
              
              <TextInput
                label="Title"
                value={editForm.title}
                onChangeText={(text) => setEditForm({ ...editForm, title: text })}
                mode="outlined"
                style={styles.input}
              />
              
              <TextInput
                label="Description"
                value={editForm.description}
                onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={3}
              />
              
              <TextInput
                label="Client Name"
                value={editForm.clientName}
                onChangeText={(text) => setEditForm({ ...editForm, clientName: text })}
                mode="outlined"
                style={styles.input}
              />
              
              <TouchableOpacity
                style={styles.featuredToggle}
                onPress={() => setEditForm({ ...editForm, featured: !editForm.featured })}
              >
                <Icon
                  name={editForm.featured ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color="#6C63FF"
                />
                <Text style={styles.featuredToggleText}>Featured Item</Text>
              </TouchableOpacity>
              
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
                  onPress={handleUpdate}
                  style={[styles.modalButton, { backgroundColor: '#6C63FF' }]}
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
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#fff',
  },
  imageWrapper: {
    width: screenWidth / 2 - 24,
    height: screenWidth / 2 - 24,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  noImagesContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  noImagesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  card: {
    margin: 16,
    marginTop: 0,
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  featuredChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
  },
  featuredChipText: {
    color: '#FF9800',
  },
  categoryChip: {
    backgroundColor: '#F0F0FF',
    borderColor: '#6C63FF',
  },
  categoryText: {
    color: '#6C63FF',
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  tagText: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  imageAction: {
    alignItems: 'center',
    padding: 12,
  },
  imageActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  dangerCard: {
    borderColor: '#F44336',
    borderWidth: 1,
  },
  dangerTitle: {
    color: '#F44336',
  },
  dangerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#F44336',
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
  featuredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featuredToggleText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
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