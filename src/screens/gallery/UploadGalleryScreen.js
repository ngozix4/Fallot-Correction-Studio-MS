import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  HelperText,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import database from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { showMessage } from 'react-native-flash-message';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  category: yup.string().required('Category is required'),
  description: yup.string(),
  clientName: yup.string(),
  dateCompleted: yup.date(),
  tags: yup.array().of(yup.string()),
  featured: yup.boolean(),
});

const categories = [
  { id: 'wedding', label: 'Wedding', icon: 'ring' },
  { id: 'evening_wear', label: 'Evening Wear', icon: 'star' },
  { id: 'casual', label: 'Casual', icon: 'tshirt-crew' },
  { id: 'traditional', label: 'Traditional', icon: 'account-tie' },
  { id: 'custom', label: 'Custom', icon: 'pencil-ruler' },
  { id: 'other', label: 'Other', icon: 'folder' },
];

export default function UploadGalleryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [images, setImages] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [featured, setFeatured] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: '',
      category: '',
      description: '',
      clientName: '',
      dateCompleted: new Date(),
      tags: [],
      featured: false,
    },
  });

 const handlePickImages = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showMessage({
        message: 'Sorry, we need camera roll permissions to make this work!',
        type: 'danger',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`,
        size: asset.fileSize,
      }));
      
      const totalImages = [...images, ...newImages].slice(0, 10);
      setImages(totalImages);
    }
  } catch (error) {
    console.error('❌ Image picker error:', error);
    showMessage({
      message: 'Error picking images',
      type: 'danger',
    });
  }
};

  const handleRemoveImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setValue('category', categoryId);
  };

  const onSubmit = async (data) => {
    if (!user) {
      showMessage({ message: 'Please login first', type: 'danger' });
      return;
    }

    if (images.length === 0) {
      showMessage({
        message: 'Please select at least one image',
        type: 'danger',
      });
      return;
    }

    try {
      setUploading(true);
      
      const galleryData = {
        title: data.title,
        description: data.description || '',
        category: data.category,
        clientName: data.clientName || '',
        dateCompleted: data.dateCompleted,
        featured: featured,
        tags: tags
      };

      await database.createGalleryItem(galleryData, images, user.id);
      
      showMessage({
        message: 'Gallery item uploaded successfully!',
        type: 'success',
        duration: 3000,
      });
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Gallery upload error:', error);
      
      let errorMessage = 'Upload failed. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      
      showMessage({
        message: errorMessage,
        type: 'danger',
        duration: 4000,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Add to Gallery</Title>

          {/* Title */}
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  label="Title *"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="format-title" />}
                  disabled={uploading}
                />
                {errors.title && (
                  <HelperText type="error">{errors.title.message}</HelperText>
                )}
              </>
            )}
          />

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Category *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonActive,
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                  disabled={uploading}
                >
                  <Icon
                    name={category.icon}
                    size={24}
                    color={selectedCategory === category.id ? '#fff' : '#6C63FF'}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === category.id && styles.categoryTextActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category && (
              <HelperText type="error">{errors.category.message}</HelperText>
            )}
          </View>

          {/* Images Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Images *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePickImages}
              disabled={uploading}
            >
              <Icon name="image-plus" size={40} color="#6C63FF" />
              <Text style={styles.uploadText}>Select Images</Text>
              <Text style={styles.uploadSubtext}>
                {images.length} image(s) selected
              </Text>
              <Text style={styles.uploadLimitText}>Max 10 images</Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagesPreview}
              >
                {images.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: image.uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                      disabled={uploading}
                    >
                      <Icon name="close-circle" size={24} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Description"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={3}
                left={<TextInput.Icon icon="text" />}
                disabled={uploading}
              />
            )}
          />

          {/* Client Name */}
          <Controller
            control={control}
            name="clientName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Client Name (Optional)"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="account" />}
                disabled={uploading}
              />
            )}
          />

          {/* Date Completed */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date Completed</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateInput}
              disabled={uploading}
            >
              <View style={styles.dateInputContent}>
                <Icon name="calendar" size={24} color="#666" />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateValue}>
                    {watch('dateCompleted').toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={watch('dateCompleted')}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setValue('dateCompleted', selectedDate);
                  }
                }}
              />
            )}
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.tagInputContainer}>
              <TextInput
                placeholder="Add a tag..."
                value={tagInput}
                onChangeText={setTagInput}
                mode="outlined"
                style={styles.tagInput}
                onSubmitEditing={handleAddTag}
                blurOnSubmit={false}
                disabled={uploading}
              />
              <Button
                mode="contained"
                onPress={handleAddTag}
                style={styles.addTagButton}
                disabled={uploading || !tagInput.trim()}
              >
                Add
              </Button>
            </View>
            
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <Chip
                    key={index}
                    mode="outlined"
                    onClose={() => handleRemoveTag(tag)}
                    style={styles.tagChip}
                    disabled={uploading}
                  >
                    {tag}
                  </Chip>
                ))}
              </View>
            )}
          </View>

          {/* Featured Toggle */}
          <TouchableOpacity
            style={styles.featuredToggle}
            onPress={() => {
              const newFeatured = !featured;
              setFeatured(newFeatured);
              setValue('featured', newFeatured);
            }}
            disabled={uploading}
          >
            <Icon
              name={featured ? 'star' : 'star-outline'}
              size={24}
              color={featured ? '#FFD700' : '#666'}
            />
            <Text style={styles.featuredText}>
              {featured ? 'Featured Item' : 'Mark as Featured'}
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={uploading}
            disabled={uploading || images.length === 0}
            style={styles.submitButton}
            icon="upload"
          >
            {uploading ? 'Uploading...' : 'Upload to Gallery'}
          </Button>

          {/* Upload Status */}
          {uploading && (
            <View style={styles.uploadStatus}>
              <ActivityIndicator size="small" color="#6C63FF" />
              <Text style={styles.uploadStatusText}>
                Uploading {images.length} image(s)...
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// Keep all your existing styles exactly as they were
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  categoryTextActive: {
    color: '#fff',
  },
  uploadButton: {
    alignItems: 'center',
    padding: 40,
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8f9ff',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  uploadLimitText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  imagesPreview: {
    marginTop: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 16,
  },
  dateInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTextContainer: {
    marginLeft: 12,
  },
  dateValue: {
    fontSize: 16,
    color: '#333',
  },
  tagInputContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tagInput: {
    flex: 1,
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: '#6C63FF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  featuredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9ff',
    borderRadius: 8,
    marginBottom: 24,
  },
  featuredText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#6C63FF',
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  uploadStatusText: {
    marginLeft: 12,
    color: '#666',
    fontSize: 14,
  },
});