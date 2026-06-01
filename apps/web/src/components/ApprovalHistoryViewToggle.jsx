import React, { useEffect } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const ApprovalHistoryViewToggle = ({ view, setView, isLoading }) => {
  
  // Load preference on mount
  useEffect(() => {
    const savedView = localStorage.getItem('approvalHistoryViewPref');
    if (savedView === 'list' || savedView === 'card') {
      setView(savedView);
    }
  }, [setView]);

  const handleViewChange = (value) => {
    if (value) {
      setView(value);
      localStorage.setItem('approvalHistoryViewPref', value);
    }
  };

  return (
    <ToggleGroup 
      type="single" 
      value={view} 
      onValueChange={handleViewChange}
      disabled={isLoading}
      className="bg-muted/50 p-1 rounded-xl border border-border/50"
    >
      <ToggleGroupItem 
        value="card" 
        aria-label="Card View"
        className="rounded-lg px-3 h-8 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm transition-all"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">Cards</span>
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="list" 
        aria-label="List View"
        className="rounded-lg px-3 h-8 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm transition-all"
      >
        <List className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">List</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ApprovalHistoryViewToggle;