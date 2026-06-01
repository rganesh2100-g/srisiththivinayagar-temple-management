import { useState, useCallback } from 'react';

export const useBookingForm = (initialState = {}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    useProfileDetails: null, // true/false
    name: '',
    email: '',
    contact: '',
    transactionId: '',
    ...initialState
  });
  const [errors, setErrors] = useState({});

  const totalSteps = 6;

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const validateStep = () => {
    const newErrors = {};
    let isValid = true;

    switch (currentStep) {
      case 1:
        if (!formData.date) newErrors.date = 'Please select a date';
        if (!formData.time) newErrors.time = 'Please select a time slot';
        break;
      case 2:
        if (formData.useProfileDetails === null) {
          newErrors.useProfileDetails = 'Please select an option';
        } else if (!formData.useProfileDetails) {
          if (!formData.name.trim()) newErrors.name = 'Name is required';
          if (!formData.email.trim()) newErrors.email = 'Email is required';
          else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
          if (!formData.contact.trim()) newErrors.contact = 'Contact number is required';
        }
        break;
      case 5:
        if (!formData.transactionId.trim()) newErrors.transactionId = 'Transaction ID is required';
        break;
      default:
        break;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
    }

    return isValid;
  };

  const nextStep = useCallback(() => {
    if (validateStep() && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, formData, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const setStep = useCallback((step) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  return {
    currentStep,
    totalSteps,
    formData,
    errors,
    updateField,
    nextStep,
    prevStep,
    setStep,
    setFormData
  };
};