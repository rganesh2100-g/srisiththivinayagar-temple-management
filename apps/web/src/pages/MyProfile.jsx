import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import pb from '@/lib/pocketbaseClient.js';
import { updateRecord } from '@/lib/pbHelper.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import DonationHistorySection from '@/components/DonationHistorySection.jsx';
import SubscriptionHistorySection from '@/components/SubscriptionHistorySection.jsx';
import SubscriptionStatusCard from '@/components/SubscriptionStatusCard.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Loader2, Camera, Edit2, Check, X, Crown, User as UserIcon, Mail, Phone, Globe, ShieldCheck, AlertCircle, MapPin, LogOut, Lock } from 'lucide-react';
import { toast } from 'sonner';

const MyProfile = () => {
  const { currentUser, refreshUser, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    preferred_language: 'Tamil',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const user = await pb.collection('users').getOne(currentUser.id, { $autoCancel: false });
        setProfileData(user);
        setFormData({
          name: user.name || '',
          phone: user.phone || '',
          address: user.address || '',
          preferred_language: user.preferred_language || 'Tamil',
        });
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data. Please try refreshing the page or checking your connection.');
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser?.id) {
      fetchProfile();
      
      // Real-time synchronization for user profile
      pb.collection('users').subscribe(currentUser.id, function (e) {
        if (e.action === 'update') {
          setProfileData(e.record);
          // Only update form data if not currently editing
          if (!isEditing) {
            setFormData({
              name: e.record.name || '',
              phone: e.record.phone || '',
              address: e.record.address || '',
              preferred_language: e.record.preferred_language || 'Tamil',
            });
          }
        }
      });
    }

    return () => {
      if (currentUser?.id) {
        pb.collection('users').unsubscribe(currentUser.id);
      }
    };
  }, [currentUser?.id, isEditing]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLanguageChange = (value) => {
    setFormData({ ...formData, preferred_language: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await updateRecord('users', currentUser.id, formData);
      setProfileData(updatedUser);
      await refreshUser();
      setIsEditing(false);
      toast.success(t('common.success', 'Profile updated successfully'));
    } catch (err) {
      toast.error(err.message || t('common.error', 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    setUpdatingPassword(true);
    try {
      await updateRecord('users', currentUser.id, {
        password: newPassword,
        passwordConfirm: newPassword
      });
      toast.success('Password updated successfully');
      setNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to update password. Please try again.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = new FormData();
      data.append('avatar', file);
      const updatedUser = await updateRecord('users', currentUser.id, data);
      setProfileData(updatedUser);
      await refreshUser();
      toast.success(t('common.success', 'Avatar updated successfully'));
    } catch (err) {
      toast.error(err.message || t('common.error', 'Failed to upload avatar'));
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 w-full">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">{t('common.loading', 'Loading...')}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <div className="bg-card p-6 rounded-xl shadow-sm border border-destructive/20 text-center max-w-sm w-full mx-4">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-bold text-foreground mb-1">Connection Error</h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full h-11">
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isAdmin = profileData?.role === 'admin' || profileData?.account_type === 'Admin' || profileData?.account_type === 'admin';
  const isPremium = profileData?.membershipTier === 'premium' || profileData?.membership_type === 'premium';
  
  const avatarUrl = profileData?.avatar 
    ? pb.files.getUrl(profileData, profileData.avatar) 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData?.name || profileData?.email)}&background=8B0000&color=fff`;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto w-full space-y-6 pb-12">
        <Helmet>
          <title>{t('userProfile.myAccount', 'My Account')} | Sri Sithivinayagar Temple</title>
        </Helmet>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-fluid-h2 font-bold text-primary truncate" style={{ fontFamily: 'Playfair Display, serif' }}>
                {t('userProfile.myAccount', 'My Account')}
              </h1>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                isAdmin ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                isPremium ? 'bg-accent/20 text-primary border border-accent/50' : 'bg-muted text-muted-foreground border border-border'
              }`}>
                {isAdmin ? <ShieldCheck className="w-3 h-3" /> : isPremium ? <Crown className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                {isAdmin ? 'Admin' : isPremium ? t('membershipPage.premiumTitle', 'Premium') : t('membershipPage.freeTitle', 'Regular')}
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">{t('userProfile.manageInfo', 'Manage your personal information')}</p>
          </div>
          
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-1.5 w-full md:w-auto shrink-0 h-11">
              <Edit2 className="w-4 h-4" /> {t('userProfile.editProfile', 'Edit Profile')}
            </Button>
          ) : (
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              <Button onClick={() => setIsEditing(false)} variant="ghost" className="gap-1.5 flex-1 md:flex-none h-11">
                <X className="w-4 h-4" /> {t('userProfile.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-1.5 flex-1 md:flex-none shadow-sm h-11">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t('userProfile.saveChanges', 'Save Changes')}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
          
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-card rounded-xl shadow-sm border border-border/50 p-4 flex flex-col items-center text-center overflow-hidden min-w-0">
              <div className="relative group mb-4">
                <div className={`w-24 h-24 rounded-full overflow-hidden border-2 shadow-md transition-all duration-300 ${isAdmin ? 'border-destructive' : isPremium ? 'border-accent' : 'border-background'}`}>
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 touch-target"
                  aria-label="Upload profile picture"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              
              <h2 className="text-lg font-bold text-foreground mb-0.5 w-full truncate px-2">{profileData?.name || t('userProfile.templeDevotee', 'Temple Devotee')}</h2>
              <p className="text-muted-foreground text-xs mb-4 w-full truncate px-2">{profileData?.email}</p>
              
              <div className="w-full bg-muted/50 rounded-lg p-3 border border-border/50 text-left">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t('userProfile.accountStatus', 'Account Status')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{t('userProfile.membership', 'Membership')}</span>
                    <span className={`text-xs font-semibold truncate ${isAdmin ? 'text-destructive' : isPremium ? 'text-primary' : 'text-blue-600'}`}>
                      {isAdmin ? 'Admin' : isPremium ? t('membershipPage.premiumTitle', 'Premium') : t('membershipPage.freeTitle', 'Regular')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{t('userProfile.emailVerification', 'Email')}</span>
                    <span className="text-xs font-semibold text-green-600 flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3" /> {t('userProfile.verified', 'Verified')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{t('userProfile.joined', 'Joined')}</span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {new Date(profileData?.created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden min-w-0">
              <div className="px-4 py-3 border-b border-border/50 bg-card">
                <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <LogOut className="w-4 h-4 text-destructive shrink-0" /> Session Management
                </h2>
              </div>
              <div className="p-4 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground text-sm">Sign out of your account</p>
                  <p className="text-xs text-muted-foreground mt-1">You will be required to sign back in.</p>
                </div>
                <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto h-11 shrink-0">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6 min-w-0">
            
            {isPremium && !isAdmin && <SubscriptionStatusCard />}

            <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden min-w-0">
              <div className="px-4 py-3 border-b border-border/50 bg-card">
                <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-primary shrink-0" /> {t('userProfile.personalDetails', 'Personal Details')}
                </h2>
              </div>
              <div className="p-4 bg-card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="name" className="text-foreground font-medium flex items-center gap-1.5">
                      {t('userProfile.fullName', 'Full Name')}
                    </Label>
                    {isEditing ? (
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground shrink-0" />
                        <Input 
                          id="name" 
                          name="name" 
                          value={formData.name} 
                          onChange={handleInputChange} 
                          className="pl-9 h-11 rounded-lg" 
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 min-h-[44px] bg-muted/50 border border-border/50 rounded-lg text-foreground text-sm font-medium flex items-center gap-2 overflow-hidden">
                        <UserIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{profileData?.name || <span className="text-muted-foreground italic">Not provided</span>}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="email" className="text-foreground font-medium flex items-center gap-1.5">
                      {t('userProfile.emailAddress', 'Email Address')}
                    </Label>
                    <div className="p-2.5 min-h-[44px] bg-muted/50 border border-border/50 rounded-lg text-muted-foreground text-sm font-medium flex items-center gap-2 cursor-not-allowed opacity-80 overflow-hidden">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{profileData?.email}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="phone" className="text-foreground font-medium flex items-center gap-1.5">
                      {t('userProfile.contactNumber', 'Contact Number')}
                    </Label>
                    {isEditing ? (
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground shrink-0" />
                        <Input 
                          id="phone" 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleInputChange} 
                          placeholder="+43 1 234 5678"
                          className="pl-9 h-11 rounded-lg" 
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 min-h-[44px] bg-muted/50 border border-border/50 rounded-lg text-foreground text-sm font-medium flex items-center gap-2 overflow-hidden">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{profileData?.phone || <span className="text-muted-foreground italic">Not provided</span>}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="preferred_language" className="text-foreground font-medium flex items-center gap-1.5">
                      {t('userProfile.communicationPref', 'Preferred Language')}
                    </Label>
                    {isEditing ? (
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 shrink-0" />
                        <Select value={formData.preferred_language} onValueChange={handleLanguageChange}>
                          <SelectTrigger className="pl-9 h-11 rounded-lg">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tamil" className="h-11">Tamil</SelectItem>
                            <SelectItem value="English" className="h-11">English</SelectItem>
                            <SelectItem value="Deutsch" className="h-11">Deutsch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="p-2.5 min-h-[44px] bg-muted/50 border border-border/50 rounded-lg text-foreground text-sm font-medium flex items-center gap-2 overflow-hidden">
                        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{profileData?.preferred_language || 'Tamil'}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 md:col-span-2 min-w-0">
                    <Label htmlFor="address" className="text-foreground font-medium flex items-center gap-1.5">
                      {t('userProfile.address', 'Address')}
                    </Label>
                    {isEditing ? (
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground shrink-0" />
                        <Input 
                          id="address" 
                          name="address" 
                          value={formData.address} 
                          onChange={handleInputChange} 
                          placeholder="Enter your full address"
                          className="pl-9 h-11 rounded-lg" 
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 min-h-[44px] bg-muted/50 border border-border/50 rounded-lg text-foreground text-sm font-medium flex items-center gap-2 overflow-hidden">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{profileData?.address || <span className="text-muted-foreground italic">Not provided</span>}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!isPremium && !isAdmin && (
              <div className="bg-card rounded-xl border border-border/50 p-5 shadow-sm relative overflow-hidden min-w-0">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-accent/30 rounded-md shrink-0">
                        <Crown className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-primary truncate" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {t('userProfile.upgradeToPremium', 'Upgrade to Premium')}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 max-w-md text-pretty">
                      {t('userProfile.upgradeDesc', 'Unlock exclusive access to financial records and priority bookings.')}
                    </p>
                    
                    <div className="space-y-2 mb-4 sm:mb-0">
                      <h4 className="font-bold text-foreground text-[10px] uppercase tracking-wider">{t('userProfile.premiumBenefits', 'Premium Benefits')}</h4>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 bg-primary/10 p-0.5 rounded-full shrink-0">
                            <Check className="w-2.5 h-2.5 text-primary" />
                          </div>
                          <span className="text-foreground font-medium text-xs">Access to Temple Accounts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 bg-primary/10 p-0.5 rounded-full shrink-0">
                            <Check className="w-2.5 h-2.5 text-primary" />
                          </div>
                          <span className="text-foreground font-medium text-xs">Priority Pooja Booking</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 bg-primary/10 p-0.5 rounded-full shrink-0">
                            <Check className="w-2.5 h-2.5 text-primary" />
                          </div>
                          <span className="text-foreground font-medium text-xs">Exclusive Monthly Newsletter</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                    <Link to="/membership-selection" className="block w-full">
                      <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-300 py-4 px-6 text-base font-bold rounded-xl border border-accent/30 min-h-[48px]">
                        {t('userProfile.upgradeNow', 'Upgrade Now')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <DonationHistorySection />
            {isPremium && <SubscriptionHistorySection />}

            <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden min-w-0">
              <div className="px-4 py-3 border-b border-border/50 bg-card">
                <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" /> Change Password
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Update your password to keep your account secure</p>
              </div>
              <div className="p-4 bg-card">
                <div className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 8 characters)"
                      className="h-11 rounded-lg"
                    />
                  </div>
                  <Button
                    onClick={handlePasswordUpdate}
                    disabled={updatingPassword || !newPassword}
                    className="w-full sm:w-auto h-11"
                  >
                    {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2 shrink-0" /> : <Lock className="w-4 h-4 mr-2 shrink-0" />}
                    Update Password
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyProfile;