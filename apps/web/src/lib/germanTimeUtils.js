export const getGermanDate = () => {
  const now = new Date();
  const germanTimeStr = now.toLocaleString("en-US", { timeZone: "Europe/Berlin" });
  return new Date(germanTimeStr);
};

export const getLastDayOfMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

export const getNextRenewalDate = (subscriptionType, currentDate) => {
  const d = new Date(currentDate);
  if (subscriptionType === 'Monthly') {
    // Last day of next month
    return new Date(d.getFullYear(), d.getMonth() + 2, 0);
  } else {
    // Last day of same month next year
    return new Date(d.getFullYear() + 1, d.getMonth() + 1, 0);
  }
};

export const formatDateGerman = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

export const formatForPocketBase = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
};