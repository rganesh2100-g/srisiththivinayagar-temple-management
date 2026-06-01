export const getNextAvailableDate = (pooja) => {
  if (!pooja) return 'Unknown';
  const type = pooja.availabilityType || 'allDays';

  if (type === 'allDays') return 'Always Available';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (type === 'specificDate') {
    try {
      const dates = JSON.parse(pooja.specificDates || '[]');
      if (!dates.length) return 'No dates set';
      
      const futureDates = dates
        .map(d => new Date(d))
        .filter(d => d >= today)
        .sort((a, b) => a - b);
        
      if (futureDates.length === 0) return 'No upcoming dates';
      return futureDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Invalid dates';
    }
  }

  if (type === 'specificDaysRegularly') {
    try {
      const days = JSON.parse(pooja.specificDays || '[]');
      if (!days.length) return 'No days set';
      
      const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      const targetDays = days.map(d => dayMap[d]).filter(d => d !== undefined);

      if (targetDays.length === 0) return 'Invalid days';

      let nextDate = new Date(today);
      for (let i = 0; i < 7; i++) {
        if (targetDays.includes(nextDate.getDay())) {
          const dayName = days.find(d => dayMap[d] === nextDate.getDay());
          return `${nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${dayName})`;
        }
        nextDate.setDate(nextDate.getDate() + 1);
      }
    } catch (e) {
      return 'Invalid days';
    }
  }

  return 'Unknown';
};