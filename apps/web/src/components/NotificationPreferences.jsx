import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, BellRing, Save } from 'lucide-react';
import { toast } from 'sonner';

const NotificationPreferences = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferenceId, setPreferenceId] = useState(null);
  const [preference, setPreference] = useState('all');

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const records = await pb.collection('user_preferences').getFullList({
          filter: `user_id="${currentUser.id}"`,
          $autoCancel: false
        });
        
        if (records.length > 0) {
          setPreferenceId(records[0].id);
          if (records[0].notification_preference) {
            setPreference(records[0].notification_preference);
          }
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [currentUser.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (preferenceId) {
        await pb.collection('user_preferences').update(preferenceId, {
          notification_preference: preference
        }, { $autoCancel: false });
      } else {
        const record = await pb.collection('user_preferences').create({
          user_id: currentUser.id,
          notification_preference: preference
        }, { $autoCancel: false });
        setPreferenceId(record.id);
      }
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-none shadow-md">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#CC2222]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-[#CC2222]" /> Notifications
        </CardTitle>
        <CardDescription>Manage how you receive messages from the temple.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <RadioGroup value={preference} onValueChange={setPreference} className="space-y-3">
            <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex-1 cursor-pointer font-medium">Receive all messages</Label>
            </div>
            <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <RadioGroupItem value="important" id="important" />
              <Label htmlFor="important" className="flex-1 cursor-pointer font-medium">Only important messages</Label>
            </div>
            <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none" className="flex-1 cursor-pointer font-medium">No messages</Label>
            </div>
          </RadioGroup>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#CC2222] hover:bg-[#8B0000] text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;