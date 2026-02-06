import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatDate(date: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  let d: Date;

  if (typeof date === 'string') {
    // Ensure the date string is treated as UTC if it doesn't have a timezone offset
    // Supabase and Postgres often return 'YYYY-MM-DD HH:mm:ss' which some browsers parse as local.
    let dateStr = date.trim();
    if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('GMT')) {
      // Replace space with T and add Z to force UTC parsing
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    }
    d = new Date(dateStr);
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return "Geçersiz Tarih";

  return d.toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  });
}

export function formatDateTime(date: string | Date) {
  return formatDate(date, {
    hour: '2-digit',
    minute: '2-digit'
  });
}
