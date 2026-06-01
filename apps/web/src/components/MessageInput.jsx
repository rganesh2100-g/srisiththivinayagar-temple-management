import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const MessageInput = ({ onSend, placeholder = "Type your message here...", maxLength = 1000 }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = message.length;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`min-h-[100px] resize-none pr-12 pb-8 ${isOverLimit ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          disabled={isSending}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <span className={`text-xs ${isOverLimit ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
            {charCount}/{maxLength}
          </span>
          <Button 
            size="icon" 
            className="h-8 w-8 rounded-full" 
            onClick={handleSend}
            disabled={!message.trim() || isSending || isOverLimit}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;