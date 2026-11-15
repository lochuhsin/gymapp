/** The time of day of a timestamp as the phone shows times, such as "14:05". */
export function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** The day of a timestamp without the year, such as "Nov 10". */
export function formatDay(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
