import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HelperText } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Controller } from 'react-hook-form';
import DropDownPicker from 'react-native-dropdown-picker';

export default function FormSelect({
  control,
  name,
  label,
  items = [],
  rules = {},
  error,
  ...props
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { onChange, value } }) => (
          <DropDownPicker
            open={open}
            value={value}
            items={items}
            setOpen={setOpen}
            setValue={onChange}
            placeholder={label}
            style={[styles.dropdown, error && styles.errorBorder]}
            dropDownContainerStyle={styles.dropdownContainer}
            {...props}
          />
        )}
      />
      {error && <HelperText type="error">{error.message}</HelperText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  dropdown: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
  },
  dropdownContainer: {
    borderColor: '#ccc',
  },
  errorBorder: {
    borderColor: '#F44336',
  },
});