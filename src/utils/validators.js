import * as yup from 'yup';

export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export const registerSchema = yup.object().shape({
  name: yup.string().required('Full name is required'),
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  businessName: yup.string().required('Business name is required'),
  phone: yup
    .string()
    .matches(/^[0-9]{10,15}$/, 'Please enter a valid phone number')
    .required('Phone number is required'),
  address: yup.string().required('Business address is required'),
});

export const invoiceSchema = yup.object().shape({
  customer: yup.object().shape({
    name: yup.string().required('Customer name is required'),
    email: yup
      .string()
      .email('Please enter a valid email')
      .required('Email is required'),
    phone: yup
      .string()
      .matches(/^[0-9]{10,15}$/, 'Please enter a valid phone number')
      .required('Phone number is required'),
    address: yup.string().required('Address is required'),
  }),
  jobDescription: yup.string().required('Job description is required'),
  items: yup
    .array()
    .of(
      yup.object().shape({
        description: yup.string().required('Item description is required'),
        quantity: yup
          .number()
          .min(1, 'Minimum quantity is 1')
          .required('Quantity is required'),
        unitPrice: yup
          .number()
          .min(0, 'Price must be positive')
          .required('Price is required'),
      })
    )
    .min(1, 'At least one item is required'),
  dueDate: yup.date().required('Due date is required'),
});

export const profileSchema = yup.object().shape({
  name: yup.string().required('Full name is required'),
  businessName: yup.string().required('Business name is required'),
  phone: yup
    .string()
    .matches(/^[0-9]{10,15}$/, 'Please enter a valid phone number')
    .required('Phone number is required'),
  address: yup.string().required('Business address is required'),
});