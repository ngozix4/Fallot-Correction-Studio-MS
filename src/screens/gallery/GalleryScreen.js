import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Searchbar, FAB, Card, ActivityIndicator, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import database from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { showMessage } from 'react-native-flash-message';

const { width } = Dimensions.get('window');
const itemWidth = (width - 48) / 2;

export default function GalleryScreen({ navigation }) {
  const { user } = useAuth();
  const [galleryItems, setGalleryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All', icon: 'view-grid' },
    { id: 'wedding', label: 'Wedding', icon: 'ring' },
    { id: 'evening_wear', label: 'Evening Wear', icon: 'star' },
    { id: 'casual', label: 'Casual', icon: 'tshirt-crew' },
    { id: 'traditional', label: 'Traditional', icon: 'account-tie' },
    { id: 'custom', label: 'Custom', icon: 'pencil-ruler' },
  ];

  useEffect(() => {
    if (user) {
      fetchGalleryItems();
    }
  }, [user, category]);

  useEffect(() => {
    filterItems();
  }, [searchQuery, galleryItems, category]);

  const fetchGalleryItems = async () => {
    try {
      setLoading(true);
      
      if (!user) return;
      
      const items = await database.getGalleryItems(user.id, category === 'all' ? undefined : category);
      setGalleryItems(items);
      setFilteredItems(items);
    } catch (error) {
      console.error('❌ [GalleryScreen] Fetch error:', error);
      showMessage({
        message: 'Error loading gallery',
        type: 'danger',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterItems = () => {
    let filtered = [...galleryItems];

    // Apply category filter (already done in query, but double-check)
    if (category !== 'all') {
      filtered = filtered.filter(item => item.category === category);
    }

    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
          item.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGalleryItems();
  };

  const renderGalleryItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('GalleryDetail', { galleryId: item.id })
      }
      style={styles.galleryItem}
    >
      <Card style={styles.galleryCard}>
        {item.images && item.images.length > 0 ? (
          <Card.Cover
            source={{ uri: item.images[0].uri }}
            style={styles.galleryImage}
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Icon name="image-off" size={40} color="#ccc" />
          </View>
        )}
        
        <Card.Content style={styles.galleryContent}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.featured && (
              <Icon name="star" size={16} color="#FFD700" />
            )}
          </View>
          
          {item.description && (
            <Text style={styles.galleryDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.galleryFooter}>
            <Chip
              mode="outlined"
              style={styles.categoryChip}
              textStyle={styles.categoryText}
            >
              {getCategoryLabel(item.category)}
            </Chip>
            
            {item.clientName && (
              <Text style={styles.clientName} numberOfLines={1}>
                {item.clientName}
              </Text>
            )}
          </View>
          
          {item.dateCompleted && (
            <Text style={styles.dateText}>
              {new Date(item.dateCompleted).toLocaleDateString()}
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const getCategoryLabel = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.label : 'Other';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search gallery..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryButton,
              category === cat.id && styles.categoryButtonActive,
            ]}
            onPress={() => setCategory(cat.id)}
          >
            <Icon
              name={cat.icon}
              size={20}
              color={category === cat.id ? '#fff' : '#6C63FF'}
            />
            <Text
              style={[
                styles.categoryButtonText,
                category === cat.id && styles.categoryButtonTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="image-multiple" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No gallery items found</Text>
          {searchQuery || category !== 'all' ? (
            <Text style={styles.emptySubtext}>
              Try a different search or filter
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('UploadGallery')}
            >
              <Text style={styles.createButtonText}>
                Add Your First Portfolio Item
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderGalleryItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('UploadGallery')}
      />
    </View>
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
  searchBar: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  categoryContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  categoryContent: {
    paddingRight: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryButtonActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 6,
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  galleryItem: {
    width: itemWidth,
  },
  galleryCard: {
    flex: 1,
    elevation: 2,
  },
  galleryImage: {
    height: 120,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  noImageContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  galleryContent: {
    padding: 12,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  galleryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 4,
  },
  galleryDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 8,
  },
  galleryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryChip: {
    height: 24,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 10,
  },
  clientName: {
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
  dateText: {
    fontSize: 10,
    color: '#999',
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
    backgroundColor: '#6C63FF',
  },
});