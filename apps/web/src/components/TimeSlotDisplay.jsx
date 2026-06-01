import React from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

const TimeSlotDisplay = ({ slots, selectedSlotId, onSelectSlot }) => {
  if (!slots || slots.length === 0) {
    return <p className="text-sm text-muted-foreground">No slots available for this date.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {slots.map((slot) => {
        const isAvailable = slot.booking_status === 'available';
        const isSelected = selectedSlotId === slot.id;

        return (
          <button
            key={slot.id}
            type="button"
            disabled={!isAvailable}
            onClick={() => isAvailable && onSelectSlot(slot)}
            className={cn(
              "relative flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all duration-200",
              isAvailable 
                ? isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                  : "bg-card text-foreground border-border hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5"
                : "bg-muted text-muted-foreground border-transparent opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{slot.time_slot}</span>
            </div>
            <span className={cn(
              "text-[10px] uppercase tracking-wider font-bold",
              isAvailable 
                ? isSelected ? "text-primary-foreground/90" : "text-green-600"
                : "text-muted-foreground"
            )}>
              {isAvailable ? 'Available' : 'Booked'}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default TimeSlotDisplay;