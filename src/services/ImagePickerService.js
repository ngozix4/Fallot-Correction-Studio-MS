import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

class ImagePickerService {
  constructor() {
    this.profilePicturesDir = null;
    this.initPromise = this.init();
  }

  async init() {
    try {
      const documentDir = Paths.document;
      this.profilePicturesDir = new Directory(documentDir, 'profile_pictures');
      
      if (!this.profilePicturesDir.exists) {
        this.profilePicturesDir.create({ intermediates: true });
      }
      console.log('✅ Image Picker Service initialized');
    } catch (error) {
      console.error('❌ Image Picker Service init error:', error);
      throw error;
    }
  }

  async requestPermissions() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted' || cameraStatus.status !== 'granted') {
        alert('Sorry, we need camera and gallery permissions to work!');
        return false;
      }
    }
    return true;
  }

  async pickImage(options = {}) {
    try {
      await this.initPromise;
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return await this.processAndSaveImage(result.assets[0].uri, 'profile');
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  async takePhoto(options = {}) {
    try {
      await this.initPromise;
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return await this.processAndSaveImage(result.assets[0].uri, 'profile');
      }
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  async processAndSaveImage(uri, type = 'profile') {
    try {
      // Compress and resize image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 500, height: 500 } },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const filename = `${type}_${timestamp}_${random}.jpg`;

      // Save to appropriate directory
      let targetDir;
      if (type === 'profile') {
        targetDir = this.profilePicturesDir;
      } else {
        targetDir = new Directory(Paths.document, 'uploads');
        if (!targetDir.exists) {
          targetDir.create({ intermediates: true });
        }
      }

      // Copy image to permanent location
      const sourceFile = new File(manipulatedImage.uri);
      const destinationFile = new File(targetDir, filename);
      sourceFile.copy(destinationFile);

      console.log('✅ Image saved:', destinationFile.uri);
      return {
        uri: destinationFile.uri,
        filename: filename,
        type: type,
        size: destinationFile.size,
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }

  async getImageAsBase64(uri) {
    try {
      const file = new File(uri);
      if (file.exists) {
        const base64 = await file.readAsStringAsync({ encoding: 'base64' });
        return `data:image/jpeg;base64,${base64}`;
      }
      return null;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  }

  async deleteImage(uri) {
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
        console.log('🗑️ Image deleted:', uri);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  async clearProfilePicture(userId) {
    try {
      await this.initPromise;
      
      if (!this.profilePicturesDir.exists) return;
      
      const files = this.profilePicturesDir.list();
      const prefix = `profile_${userId}_`;
      
      for (const file of files) {
        if (file instanceof File && file.name.startsWith(prefix)) {
          file.delete();
        }
      }
    } catch (error) {
      console.error('Error clearing profile pictures:', error);
    }
  }

  // Utility to get profile picture directory
  getProfilePicturesDir() {
    return this.profilePicturesDir;
  }
}

export default new ImagePickerService();