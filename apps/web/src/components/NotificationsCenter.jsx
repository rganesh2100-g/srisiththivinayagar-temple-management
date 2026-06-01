import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Bell, FileText } from 'lucide-react';
import { toast } from 'sonner';

const NotificationsCenter = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const records = await pb.collection('notifications').getFullList({
        filter: `user_id="${currentUser.id}"`,
        sort: '-created_at',
        $autoCancel: false
      });
      setNotifications(records);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser]);

  const markAsRead = async (id) => {
    try {
      await pb.collection('notifications').update(id, { read: true }, { $autoCancel: false });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    try {
      await Promise.all(unread.map(n => 
        pb.collection('notifications').update(n.id, { read: true }, { $autoCancel: false })
      ));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!currentUser) return null;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between bg-muted/30 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold">Notifications</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-8 text-muted-foreground hover:text-foreground">
            <Check className="w-3.5 h-3.5 mr-1.5" /> Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 px-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground opacity-40" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No notifications yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              We'll notify you when there are updates to your bookings, donations, or receipts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`p-5 flex gap-4 transition-colors hover:bg-muted/30 ${!notification.read ? 'bg-primary/5' : ''}`}
              >
                <div className="mt-1 shrink-0">
                  {notification.receipt_id ? (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                      <Bell className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className={`text-sm leading-relaxed ${!notification.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(notification.created_at).toLocaleString()}</span>
                    {notification.receipt_id && (
                      <span className="font-mono bg-background border border-border px-1.5 py-0.5 rounded text-[10px] shadow-sm">
                        {notification.receipt_id}
                      </span>
                    )}
                  </div>
                </div>
                {!notification.read && (
                  <div className="shrink-0 flex items-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => markAsRead(notification.id)}
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsCenter;