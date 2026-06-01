import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import UnifiedDashboardSidebar from '@/components/UnifiedDashboardSidebar.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import NotificationPreferences from '@/components/NotificationPreferences.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Shield, User, Phone, Lock } from 'lucide-react';
import { toast } from 'sonner';

const ProfileSettings = () => {
  const { currentUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const [settings, setSettings] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    preferred_language: currentUser?.preferred_language || 'Tamil'
  });

  const [passwords, setPasswords] = useState({
    oldPassword: '',
    password: '',
    passwordConfirm: ''
  });

  const handleSettingsChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleLanguageChange = (value) => {
    setSettings({ ...settings, preferred_language: value });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await pb.collection('users').update(currentUser.id, settings, { $autoCancel: false });
      
      try {
        const prefs = await pb.collection('user_preferences').getFullList({
          filter: `user_id="${currentUser.id}"`,
          $autoCancel: false
        });
        if (prefs.length > 0) {
          await pb.collection('user_preferences').update(prefs[0].id, {
            preferred_language: settings.preferred_language
          }, { $autoCancel: false });
        } else {
          await pb.collection('user_preferences').create({
            user_id: currentUser.id,
            preferred_language: settings.preferred_language
          }, { $autoCancel: false });
        }
      } catch (prefErr) {
        console.error('Preferences update error (non-critical):', prefErr);
      }

      await refreshUser();
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Settings error:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (passwords.password !== passwords.passwordConfirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setPwdLoading(true);
    try {
      await pb.collection('users').update(currentUser.id, {
        oldPassword: passwords.oldPassword,
        password: passwords.password,
        passwordConfirm: passwords.passwordConfirm
      }, { $autoCancel: false });
      
      setPasswords({ oldPassword: '', password: '', passwordConfirm: '' });
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Password error:', error);
      toast.error(error.response?.message || 'Failed to update password. Check current password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Settings | Sri Siththi Vinayagar Tempel Kultur Verein e.V</title>
      </Helmet>
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        <UnifiedDashboardSidebar />
        
        <main className="flex-1 p-fluid min-w-0">
          <div className="mb-6 min-w-0">
            <h1 className="text-fluid-h2 font-bold text-primary mb-1 truncate">Account Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground text-pretty">Update your preferences and security settings.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            <div className="space-y-6 min-w-0">
              <Card className="border-none shadow-sm h-fit bg-card min-w-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base truncate">General Preferences</CardTitle>
                  <CardDescription className="text-pretty">Update your basic account settings.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={saveSettings} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="truncate">Email Address</Label>
                      <Input id="email" value={currentUser?.email || ''} disabled className="bg-muted text-muted-foreground truncate w-full" />
                      <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Display Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground shrink-0" />
                        <Input id="name" name="name" value={settings.name} onChange={handleSettingsChange} className="pl-10 w-full" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Contact Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground shrink-0" />
                        <Input id="phone" name="phone" value={settings.phone} onChange={handleSettingsChange} className="pl-10 w-full" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Preferred Language</Label>
                      <Select value={settings.preferred_language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tamil">Tamil</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" disabled={loading} size="default" className="w-full mt-4">
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" /> : <Save className="w-4 h-4 mr-2 shrink-0" />}
                      Save Preferences
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="min-w-0 overflow-hidden">
                <NotificationPreferences />
              </div>
            </div>

            <div className="min-w-0">
              <Card className="border-none shadow-sm h-fit bg-card min-w-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base truncate">
                    <Shield className="w-5 h-5 text-primary shrink-0" /> Security
                  </CardTitle>
                  <CardDescription className="text-pretty">Change your password to keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={updatePassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="oldPassword">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground shrink-0" />
                        <Input 
                          id="oldPassword" 
                          name="oldPassword" 
                          type="password" 
                          value={passwords.oldPassword} 
                          onChange={handlePasswordChange} 
                          required
                          className="pl-10 w-full"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="password">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground shrink-0" />
                        <Input 
                          id="password" 
                          name="password" 
                          type="password" 
                          value={passwords.password} 
                          onChange={handlePasswordChange} 
                          required
                          className="pl-10 w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="passwordConfirm">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground shrink-0" />
                        <Input 
                          id="passwordConfirm" 
                          name="passwordConfirm" 
                          type="password" 
                          value={passwords.passwordConfirm} 
                          onChange={handlePasswordChange} 
                          required
                          className="pl-10 w-full"
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={pwdLoading} variant="outline" size="default" className="w-full mt-4">
                      {pwdLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" /> : null}
                      Update Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default ProfileSettings;