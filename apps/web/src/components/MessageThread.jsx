import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, User, ShieldAlert } from 'lucide-react';

const MessageThread = ({ messages, currentUserRole }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
        <p className="text-sm">No messages yet.</p>
        <p className="text-xs opacity-70">Start the conversation below.</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="flex flex-col gap-4 max-h-[400px] overflow-y-auto p-4 bg-muted/10 rounded-xl border border-border"
    >
      {messages.map((msg) => {
        const isOwnMessage = msg.sender_type === currentUserRole;
        
        return (
          <div 
            key={msg.id} 
            className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
              
              <div className="flex-shrink-0 mt-auto">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.sender_type === 'admin' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-secondary/20 text-secondary-foreground'
                }`}>
                  {msg.sender_type === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
              </div>

              <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-medium text-muted-foreground mb-1 px-1 uppercase tracking-wider">
                  {msg.sender_type === 'admin' ? 'Admin' : 'Devotee'}
                </span>
                
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                  isOwnMessage 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-card border border-border text-card-foreground rounded-bl-sm shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message_content}</p>
                </div>
                
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(msg.created), 'MMM d, h:mm a')}
                  </span>
                  {isOwnMessage && (
                    <span className="text-muted-foreground">
                      {msg.read_status ? <CheckCheck className="w-3 h-3 text-primary" /> : <Check className="w-3 h-3" />}
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageThread;