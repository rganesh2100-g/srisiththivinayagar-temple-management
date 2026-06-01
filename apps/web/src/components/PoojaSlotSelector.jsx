import React from 'react';
import { Clock } from 'lucide-react';

const PoojaSlotSelector = ({ availableSlots = [], bookedSlots = [], selectedSlotId, onSelectSlot, selectedDate }) => {
  if (!selectedDate) return null;

  if (!availableSlots || availableSlots.length === 0) {
    return <p className="text-sm text-muted-foreground">No time slots configured.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {availableSlots.map((slot, idx) => {
        const isBooked = bookedSlots.includes(slot);
        const isSelected = selectedSlotId === slot;

        return (
          <button
            key={idx}
            type="button"
            disabled={isBooked}
            onClick={() => !isBooked && onSelectSlot(slot)}
            title={isBooked ? 'Booked' : 'Available'}
            className={`relative py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border flex flex-col items-center justify-center gap-1
              ${isBooked 
                ? 'bg-[#D1D5DB] text-gray-500 border-[#D1D5DB] cursor-not-allowed opacity-60' 
                : isSelected
                  ? 'bg-[#10B981] text-white border-[#10B981] shadow-md scale-[0.98]'
                  : 'bg-white text-[#10B981] border-[#10B981] hover:bg-[#10B981]/10 hover:shadow-sm active:scale-[0.98]'
              }`}
          >
            <span className={`flex items-center gap-1.5 ${isBooked ? 'line-through' : ''}`}>
              {!isBooked && <Clock className="w-3.5 h-3.5" />}
              {slot}
            </span>
            {isBooked && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">
                Booked
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PoojaSlotSelector;