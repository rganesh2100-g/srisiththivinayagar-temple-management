import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, RefreshCw, CheckCircle2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

const ContactForm = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('contactForm.errors.nameReq');
    if (!formData.email.trim()) {
      newErrors.email = t('contactForm.errors.emailReq');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('contactForm.errors.emailInv');
    }
    if (!formData.phone.trim()) newErrors.phone = t('contactForm.errors.phoneReq');
    if (!formData.subject.trim()) newErrors.subject = t('contactForm.errors.subjectReq');
    if (!formData.message.trim()) newErrors.message = t('contactForm.errors.messageReq');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
    setErrors({});
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await pb.collection('contact_inquiries').create({
        ...formData,
        status: 'pending'
      }, { $autoCancel: false });
      
      setSuccess(true);
      toast.success(t('contactForm.toast.success'));
      
      setTimeout(() => {
        handleReset();
      }, 3000);
      
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error(t('contactForm.toast.error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          {t('contactForm.successTitle')}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {t('contactForm.successDesc')}
        </p>
        <Button onClick={handleReset} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> {t('contactForm.sendAnother')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-card p-6 sm:p-8 rounded-2xl shadow-lg border border-border/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="name">{t('contactForm.fullName')} <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Maya Chen"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'border-destructive focus-visible:ring-destructive text-gray-900' : 'text-gray-900'}
            disabled={loading}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">{t('contactForm.email')} <span className="text-destructive">*</span></Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="e.g. maya@example.com"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'border-destructive focus-visible:ring-destructive text-gray-900' : 'text-gray-900'}
            disabled={loading}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="phone">{t('contactForm.phone')} <span className="text-destructive">*</span></Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="e.g. +49 151 23456789"
            value={formData.phone}
            onChange={handleChange}
            className={errors.phone ? 'border-destructive focus-visible:ring-destructive text-gray-900' : 'text-gray-900'}
            disabled={loading}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="subject">{t('contactForm.subject')} <span className="text-destructive">*</span></Label>
          <Input
            id="subject"
            name="subject"
            placeholder="How can we help you?"
            value={formData.subject}
            onChange={handleChange}
            className={errors.subject ? 'border-destructive focus-visible:ring-destructive text-gray-900' : 'text-gray-900'}
            disabled={loading}
          />
          {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">{t('contactForm.message')} <span className="text-destructive">*</span></Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Please provide details about your inquiry..."
          rows={5}
          value={formData.message}
          onChange={handleChange}
          className={errors.message ? 'border-destructive focus-visible:ring-destructive text-gray-900' : 'text-gray-900'}
          disabled={loading}
        />
        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button 
          type="submit" 
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? t('contactForm.sending') : t('contactForm.send')}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleReset}
          disabled={loading}
          className="sm:w-auto text-gray-900"
        >
          {t('contactForm.reset')}
        </Button>
      </div>
    </form>
  );
};

export default ContactForm;