import React from 'react';
import { TextInput, HelperText } from 'react-native-paper';
import { Controller } from 'react-hook-form';

export default function FormInput({
  control,
  name,
  label,
  rules = {},
  error,
  ...props
}) {
  return (
    <>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { onChange, value } }) => (
          <TextInput
            label={label}
            value={value}
            onChangeText={onChange}
            mode="outlined"
            error={!!error}
            {...props}
          />
        )}
      />
      {error && <HelperText type="error">{error.message}</HelperText>}
    </>
  );
}