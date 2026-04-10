export function getFirstDayOfWeek(day: Date): Date {
  const dayOfWeek = day.getDay();
  const diff = day.getDate() - dayOfWeek + (dayOfWeek == 0 ? -6 : 1); // adjust when day is sunday
  return new Date(day.setDate(diff));
}
