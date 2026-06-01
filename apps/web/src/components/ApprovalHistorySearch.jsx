import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ApprovalHistorySearch = ({ searchTerm, setSearchTerm, isLoading }) => {
  const [localTerm, setLocalTerm] = useState(searchTerm);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [localTerm, setSearchTerm]);

  // Sync if external changes happen
  useEffect(() => {
    setLocalTerm(searchTerm);
  }, [searchTerm]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        type="text"
        placeholder="Search history..."
        className="pl-9 pr-8 h-10 bg-background border-border/60 focus-visible:ring-primary/20 rounded-xl"
        value={localTerm}
        onChange={(e) => setLocalTerm(e.target.value)}
        disabled={isLoading}
      />
      {localTerm && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute inset-y-0 right-0 h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-transparent"
          onClick={() => setLocalTerm('')}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
};

export default ApprovalHistorySearch;