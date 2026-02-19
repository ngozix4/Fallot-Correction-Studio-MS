import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, Title, List, RadioButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeSettingsScreen() {
  const { theme, setTheme, isDark, colors } = useTheme();

  const themeOptions = [
    {
      id: 'light',
      label: 'Light Mode',
      icon: 'weather-sunny',
      description: 'Bright theme for daytime use',
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      icon: 'weather-night',
      description: 'Dark theme for nighttime use',
    },
    {
      id: 'system',
      label: 'System Default',
      icon: 'theme-light-dark',
      description: 'Follow your device theme settings',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]}>
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Title style={[styles.title, { color: colors.text }]}>
            Appearance Settings
          </Title>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose how the app looks
          </Text>

          <View style={styles.themeOptions}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: theme === option.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTheme(option.id)}
              >
                <View style={styles.themeOptionLeft}>
                  <Icon
                    name={option.icon}
                    size={24}
                    color={theme === option.id ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.themeOptionText}>
                    <Text
                      style={[
                        styles.themeOptionLabel,
                        { color: colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.themeOptionDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                </View>
                <RadioButton.Android
                  value={option.id}
                  status={theme === option.id ? 'checked' : 'unchecked'}
                  onPress={() => setTheme(option.id)}
                  color={colors.primary}
                  uncheckedColor={colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.previewSection, { borderTopColor: colors.divider }]}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              Preview
            </Text>
            
            <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewAvatar, { backgroundColor: colors.primary }]} />
                <View>
                  <Text style={[styles.previewText, { color: colors.text }]}>
                    Sample Text
                  </Text>
                  <Text style={[styles.previewSubtext, { color: colors.textSecondary }]}>
                    Sample secondary text
                  </Text>
                </View>
              </View>
              
              <View style={[styles.previewStatus, { backgroundColor: colors.success }]}>
                <Text style={styles.previewStatusText}>Active</Text>
              </View>
              
              <View style={[styles.previewProgress, { backgroundColor: colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.previewProgressFill,
                    { backgroundColor: colors.primary, width: '60%' },
                  ]}
                />
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Title style={[styles.title, { color: colors.text }]}>
            Color Palette
          </Title>

          <View style={styles.colorPalette}>
            <View style={styles.colorRow}>
              <View style={[styles.colorItem, { backgroundColor: colors.primary }]}>
                <Text style={styles.colorLabel}>Primary</Text>
              </View>
              <View style={[styles.colorItem, { backgroundColor: colors.secondary }]}>
                <Text style={styles.colorLabel}>Secondary</Text>
              </View>
              <View style={[styles.colorItem, { backgroundColor: colors.success }]}>
                <Text style={styles.colorLabel}>Success</Text>
              </View>
            </View>
            
            <View style={styles.colorRow}>
              <View style={[styles.colorItem, { backgroundColor: colors.warning }]}>
                <Text style={styles.colorLabel}>Warning</Text>
              </View>
              <View style={[styles.colorItem, { backgroundColor: colors.error }]}>
                <Text style={styles.colorLabel}>Error</Text>
              </View>
              <View style={[styles.colorItem, { backgroundColor: colors.info }]}>
                <Text style={styles.colorLabel}>Info</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  themeOptions: {
    marginBottom: 24,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  themeOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeOptionDescription: {
    fontSize: 12,
  },
  previewSection: {
    paddingTop: 24,
    borderTopWidth: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  previewStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  previewStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  previewProgress: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  previewProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  colorPalette: {
    marginTop: 8,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  colorItem: {
    width: '31%',
    height: 80,
    borderRadius: 8,
    justifyContent: 'flex-end',
    padding: 8,
  },
  colorLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});