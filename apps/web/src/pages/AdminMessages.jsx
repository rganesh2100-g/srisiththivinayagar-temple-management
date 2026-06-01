import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Send, MessageSquare, History, AlertCircle, RefreshCw, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';

const AdminMessages = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    message: '',
    recipientType: 'all'
  });

  const fetchMessages = async () => {
    setLoadingMessages(true);
    setError(null);
    try {
      const records = await pb.collection('admin_messages').getFullList({
        sort: '-sent_date',
        expand: 'user_id',
        $autoCancel: false
      });
      setMessages(records);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load message history.');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (value) => {
    setFormData({ ...formData, recipientType: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      toast.error('Message content cannot be empty');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch users based on recipientType
      let userFilter = '';
      if (formData.recipientType === 'premium') {
        userFilter = 'membershipTier="premium" || membership_type="premium"';
      }
      
      const users = await pb.collection('users').getFullList({
        filter: userFilter,
        $autoCancel: false
      });

      if (users.length === 0) {
        toast.error('No users found matching the criteria');
        setLoading(false);
        return;
      }

      // 2. Fetch preferences to check notification settings and language
      const preferences = await pb.collection('user_preferences').getFullList({ $autoCancel: false });
      const prefMap = new Map(preferences.map(p => [p.user_id, p]));

      // 3. Create messages
      let sentCount = 0;
      const promises = [];

      for (const user of users) {
        const pref = prefMap.get(user.id);
        
        // Skip if user opted out of all messages
        if (pref?.notification_preference === 'none') continue;

        const lang = pref?.preferred_language || user.preferred_language || 'English';

        promises.push(
          pb.collection('admin_messages').create({
            user_id: user.id,
            message: formData.message,
            language_preference: lang,
            sent_date: new Date().toISOString(),
            read_status: false
          }, { $autoCancel: false })
        );
        sentCount++;
      }

      await Promise.all(promises);
      
      toast.success(`Message sent successfully to ${sentCount} users`);
      setFormData({ message: '', recipientType: 'all' });
      fetchMessages(); // Refresh the list

    } catch (err) {
      console.error('Error sending messages:', err);
      toast.error('Failed to send messages');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Broadcast Messages | Admin | Sri Siththi Vinayagar Tempel Kultur Verein e.V</title>
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#8B0000] mb-2">Broadcast Messages</h1>
        <p className="text-gray-600">Send announcements and updates to temple devotees.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compose Section */}
        <div className="lg:col-span-1">
          <Card className="border-none shadow-md sticky top-24">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-[#CC2222]" /> Compose Message
              </CardTitle>
              <CardDescription>
                Messages will appear in the users' notification center.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="recipientType" className="font-semibold">Recipients</Label>
                  <div className="input-icon-wrapper">
                    <Users className="input-icon-left w-5 h-5" />
                    <Select value={formData.recipientType} onValueChange={handleSelectChange}>
                      <SelectTrigger className="input-with-icon bg-white text-black">
                        <SelectValue placeholder="Select recipients" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-black">
                        <SelectItem value="all">All Registered Users</SelectItem>
                        <SelectItem value="premium">Premium Members Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="font-semibold">Message Content</Label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    value={formData.message} 
                    onChange={handleInputChange} 
                    placeholder="Type your announcement here..."
                    rows={6}
                    className="bg-white text-black resize-none"
                    required
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-[#CC2222] hover:bg-[#8B0000] text-white h-11">
                  {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                  Send Broadcast
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* History Section */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-md h-full flex flex-col">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-[#CC2222]" /> Message History
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchMessages} disabled={loadingMessages} className="h-8 px-2">
                <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {loadingMessages ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load history</h3>
                  <p className="text-gray-500 mb-6 max-w-md">{error}</p>
                  <Button onClick={fetchMessages} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 px-4 text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No messages sent yet</h3>
                  <p>Your broadcast history will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Recipient</th>
                        <th className="px-6 py-4 font-semibold">Message</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Sent Date</th>
                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {messages.map((msg) => (
                        <tr key={msg.id} className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 align-top">
                            <div className="font-medium text-gray-900">
                              {msg.expand?.user_id?.name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {msg.expand?.user_id?.email || msg.user_id}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">
                              Lang: {msg.language_preference || 'EN'}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <p className="text-gray-700 line-clamp-3 max-w-md" title={msg.message}>
                              {msg.message}
                            </p>
                          </td>
                          <td className="px-6 py-4 align-top text-gray-600 whitespace-nowrap">
                            {formatDate(msg.sent_date)}
                          </td>
                          <td className="px-6 py-4 align-top text-center">
                            {msg.read_status ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" /> Read
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                Unread
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;