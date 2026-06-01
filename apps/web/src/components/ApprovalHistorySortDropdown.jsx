import React from 'react';
import { ArrowDownAZ, ArrowUpZA, ArrowDown01, ArrowUp10, CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const ApprovalHistorySortDropdown = ({ sortOption, setSortOption, sortDirection, setSortDirection, isLoading }) => {
  
  const toggleDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getDirectionIcon = () => {
    if (sortOption.includes('date')) {
      return sortDirection === 'desc' ? <CalendarDays className="w-4 h-4" /> : <CalendarDays className="w-4 h-4 rotate-180" />;
    }
    if (sortOption === 'amount') {
      return sortDirection === 'desc' ? <ArrowDown01 className="w-4 h-4" /> : <ArrowUp10 className="w-4 h-4" />;
    }
    return sortDirection === 'asc' ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpZA className="w-4 h-4" />;
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={sortOption} onValueChange={setSortOption} disabled={isLoading}>
        <SelectTrigger className="w-[180px] h-10 bg-background border-border/60 rounded-xl">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Approved Date</SelectItem>
          <SelectItem value="pooja">Pooja Name</SelectItem>
          <SelectItem value="amount">Donation Amount</SelectItem>
          <SelectItem value="devotee">Devotee Name</SelectItem>
        </SelectContent>
      </Select>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="h-10 w-10 rounded-xl border-border/60 text-muted-foreground hover:text-foreground"
        onClick={toggleDirection}
        disabled={isLoading}
        title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
      >
        {getDirectionIcon()}
      </Button>
    </div>
  );
};

export default ApprovalHistorySortDropdown;