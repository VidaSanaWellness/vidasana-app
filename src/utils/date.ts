export const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '';
  // Try parsing as full ISO
  let date = new Date(timeStr);
  if (isNaN(date.getTime())) {
    // Try appending date if it's just a time string (e.g. "14:00:00")
    date = new Date(`2000-01-01T${timeStr}`);
  }
  if (isNaN(date.getTime())) return timeStr;
  return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
};
