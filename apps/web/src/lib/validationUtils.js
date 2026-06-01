/**
 * Utility functions for client-side validation
 */

export const validateEmail = (email) => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePhone = (phone) => {
  if (!phone) return false;
  // Allows 10 to 15 digits, ignoring spaces and dashes
  const re = /^\d{10,15}$/;
  return re.test(String(phone).replace(/[\s-]/g, ''));
};

export const validatePincode = (pincode) => {
  if (!pincode) return false;
  return /^\d{6}$/.test(String(pincode));
};

export const validateAmount = (amount, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const val = parseFloat(amount);
  return !isNaN(val) && val >= min && val <= max;
};

export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate) <= new Date(endDate);
};

export const validateStringLength = (str, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (str === null || str === undefined) return min === 0;
  const len = String(str).trim().length;
  return len >= min && len <= max;
};

export const validateFutureDate = (date) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate >= today;
};

export const validateTimeFormat = (time) => {
  if (!time) return false;
  // Matches HH:MM or HH:MM AM/PM
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]/.test(String(time));
};