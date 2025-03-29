import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date from YYYY-MM-DD to a more readable format
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

// Get current date in YYYY-MM-DD format
export function getCurrentDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Calculate total hours from an array of events
export function calculateTotalHours(events: { hours: string }[]): string {
  let totalHours = 0;
  let totalMinutes = 0;
  
  events.forEach(event => {
    const [hours, minutes] = event.hours.split(':').map(Number);
    totalHours += hours;
    totalMinutes += minutes;
  });
  
  // Convert excess minutes to hours
  totalHours += Math.floor(totalMinutes / 60);
  totalMinutes = totalMinutes % 60;
  
  return `${totalHours}:${totalMinutes.toString().padStart(2, '0')}`;
}

// Validate hours format (HH:MM)
export function isValidHoursFormat(hours: string): boolean {
  return /^[0-9]+:[0-5][0-9]$/.test(hours);
}
