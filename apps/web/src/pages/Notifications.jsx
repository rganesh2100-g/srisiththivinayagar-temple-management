import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const Notifications = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const records = await pb.collection('admin_messages').getFullList({
          filter: `user_id="${currentUser.id}"`,
          sort: '-sent_date',
          $autoCancel: false
        });
        setMessages(records);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [currentUser.id]);

  const markAsRead = async (id) => {
    try {
      await pb.collection('admin_messages').update(id, { read_status: true }, { $autoCancel: false });
      setMessages(messages.map(m => m.id === id ? { ...m, read_status: true } : m));
      toast.success('Message marked as read');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Notifications | Sri Siththi Vinayagar Tempel Kultur Verein e.V</title>
      </Helmet>
      
      <div className="mb-8 min-w-0">
        <h1 className="text-fluid-h2 font-bold text-primary mb-2 truncate">Notifications</h1>
        <p className="text-muted-foreground text-sm sm:text-base text-pretty">Messages and updates from the temple administration.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center p-8 sm:py-16 bg-card rounded-2xl shadow-sm border border-border/50 mx-auto max-w-2xl w-full">
          <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50 shrink-0" />
          <h3 className="text-lg font-medium text-foreground">No notifications yet</h3>
          <p className="text-muted-foreground mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-4 w-full">
          {messages.map((msg) => (
            <Card key={msg.id} className={`border-none shadow-sm transition-all min-w-0 ${!msg.read_status ? 'bg-destructive/5 ring-1 ring-destructive/20' : 'bg-card'}`}>
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center min-w-0">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 mb-2 sm:mb-1 shrink-0">
                    {!msg.read_status && <span className="w-2 h-2 rounded-full bg-destructive shrink-0"></span>}
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {formatDate(msg.sent_date || msg.created)}
                    </span>
                  </div>
                  <p className={`text-foreground text-sm sm:text-base break-words text-pretty ${!msg.read_status ? 'font-medium' : ''}`}>
                    {msg.message}
                  </p>
                </div>
                {!msg.read_status && (
                  <Button 
                    onClick={() => markAsRead(msg.id)} 
                    variant="outline" 
                    size="sm"
                    className="shrink-0 w-full sm:w-auto text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground mt-2 sm:mt-0"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Notifications;