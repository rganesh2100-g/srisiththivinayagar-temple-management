import React, { useState, useEffect } from 'react';
import { Filter, X, Calendar as CalendarIcon, DollarSign, User, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ApprovalHistoryFilters = ({ filters, setFilters, poojasMap, isLoading }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isOpen, setIsOpen] = useState(false);

  // Sync local filters with props when popover opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  const handleApply = () => {
    setFilters(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const cleared = {
      poojaId: 'all',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
      devoteeName: ''
    };
    setLocalFilters(cleared);
    setFilters(cleared);
    setIsOpen(false);
  };

  const activeCount = Object.entries(filters).filter(([key, val]) => {
    if (key === 'poojaId') return val !== 'all';
    return val !== '' && val !== null && val !== undefined;
  }).length;

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-[120px] justify-between">
        <Filter className="w-4 h-4 mr-2" />
        Filters
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative border-border/60 hover:bg-muted/50 transition-colors">
          <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 rounded-xl shadow-lg border-border/60" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Filter History
            </h4>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive">
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-4 py-2">
            {/* Pooja Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Pooja Type
              </Label>
              <Select 
                value={localFilters.poojaId} 
                onValueChange={(val) => setLocalFilters(prev => ({ ...prev, poojaId: val }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Poojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Poojas</SelectItem>
                  {Object.values(poojasMap).map(pooja => (
                    <SelectItem key={pooja.id} value={pooja.id}>{pooja.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Devotee Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Devotee Name
              </Label>
              <Input 
                placeholder="Search by name..." 
                className="h-9 text-sm"
                value={localFilters.devoteeName}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, devoteeName: e.target.value }))}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" /> Approved Date Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="date" 
                  className="h-9 text-sm"
                  value={localFilters.dateFrom}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
                <Input 
                  type="date" 
                  className="h-9 text-sm"
                  value={localFilters.dateTo}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>

            {/* Amount Range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Donation Amount (€)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  placeholder="Min" 
                  className="h-9 text-sm"
                  value={localFilters.minAmount}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                />
                <Input 
                  type="number" 
                  placeholder="Max" 
                  className="h-9 text-sm"
                  value={localFilters.maxAmount}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ApprovalHistoryFilters;