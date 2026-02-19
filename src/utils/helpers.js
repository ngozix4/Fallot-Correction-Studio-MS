import moment from 'moment';

export const formatCurrency = (amount) => {
  return `₦${parseFloat(amount || 0).toLocaleString('en-US')}`;
};

export const formatDate = (date, format = 'MMM DD, YYYY') => {
  return moment(date).format(format);
};

export const formatDateTime = (date, format = 'MMM DD, YYYY HH:mm') => {
  return moment(date).format(format);
};

export const getStatusColor = (status) => {
  const colors = {
    // Invoice status
    draft: '#9E9E9E',
    sent: '#2196F3',
    paid: '#4CAF50',
    partially_paid: '#FF9800',
    overdue: '#F44336',
    
    // Job status
    not_started: '#9E9E9E',
    in_progress: '#2196F3',
    completed: '#4CAF50',
    delivered: '#9C27B0',
  };
  
  return colors[status] || '#9E9E9E';
};

export const getStatusText = (status) => {
  const statusMap = {
    // Invoice status
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    partially_paid: '50% Paid',
    overdue: 'Overdue',
    
    // Job status
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    delivered: 'Delivered',
  };
  
  return statusMap[status] || status;
};

export const calculatePercentage = (part, total) => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

export const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `INV-${year}${month}${day}-${random}`;
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[0-9]{10,15}$/;
  return re.test(phone);
};

export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};