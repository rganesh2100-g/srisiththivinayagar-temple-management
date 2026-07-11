export function isPoojaExpired(pooja) {
  if (pooja.is_archived || pooja.is_deleted) return true;

  if (pooja.availabilityType === 'specificDate') {
    let dates = [];
    try {
      dates = JSON.parse(pooja.dates || pooja.specificDates || '[]');
    } catch {
      return false;
    }
    if (!dates.length) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dates.every(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      return d < today;
    });
  }

  return false;
}

export function filterExpiredPoojas(poojas) {
  return poojas.filter(p => !isPoojaExpired(p));
}
