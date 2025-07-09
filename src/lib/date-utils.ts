/**
 * Parses a natural language date reference and returns a Date object
 */
export function parseDateReference(dateRef: string): Date | null {
  const lowerRef = dateRef.toLowerCase().trim();
  const today = new Date();
  
  // Reset time portion to start of day
  today.setHours(0, 0, 0, 0);
  
  // Handle common date references
  if (lowerRef === 'today') {
    return today;
  } else if (lowerRef === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  } else if (lowerRef === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  } else if (lowerRef.includes('next')) {
    // Handle "next X" references
    if (lowerRef.includes('monday')) return getNextDayOfWeek(today, 1);
    if (lowerRef.includes('tuesday')) return getNextDayOfWeek(today, 2);
    if (lowerRef.includes('wednesday')) return getNextDayOfWeek(today, 3);
    if (lowerRef.includes('thursday')) return getNextDayOfWeek(today, 4);
    if (lowerRef.includes('friday')) return getNextDayOfWeek(today, 5);
    if (lowerRef.includes('saturday')) return getNextDayOfWeek(today, 6);
    if (lowerRef.includes('sunday')) return getNextDayOfWeek(today, 0);
    
    if (lowerRef.includes('week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    if (lowerRef.includes('month')) {
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    }
  } else if (lowerRef.includes('this')) {
    // Handle "this X" references
    if (lowerRef.includes('week')) {
      // End of current week (Sunday)
      return getEndOfWeek(today);
    }
    
    if (lowerRef.includes('month')) {
      // End of current month
      return getEndOfMonth(today);
    }
  } else if (lowerRef.match(/in \d+ days?/)) {
    // Handle "in X days"
    const daysMatch = lowerRef.match(/in (\d+) days?/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      return futureDate;
    }
  } else if (lowerRef.match(/\d+ days? from now/)) {
    // Handle "X days from now"
    const daysMatch = lowerRef.match(/(\d+) days? from now/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      return futureDate;
    }
  }
  
  // Try parsing as a specific date format (MM/DD/YYYY or similar)
  const specificDate = new Date(dateRef);
  if (!isNaN(specificDate.getTime())) {
    return specificDate;
  }
  
  // Couldn't parse the date reference
  return null;
}

/**
 * Gets the next occurrence of a specific day of the week
 * @param date The reference date
 * @param dayOfWeek Day of week (0 = Sunday, 1 = Monday, etc.)
 */
export function getNextDayOfWeek(date: Date, dayOfWeek: number): Date {
  const resultDate = new Date(date.getTime());
  resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
  
  // If it's the same day, add 7 days to get next week
  if (resultDate.getDay() === date.getDay() && resultDate.getDate() === date.getDate()) {
    resultDate.setDate(resultDate.getDate() + 7);
  }
  
  return resultDate;
}

/**
 * Gets the end of the current week (Saturday)
 */
export function getEndOfWeek(date: Date): Date {
  const resultDate = new Date(date.getTime());
  // Get to the end of the week (Saturday = day 6)
  const daysToSaturday = 6 - date.getDay();
  resultDate.setDate(date.getDate() + daysToSaturday);
  return resultDate;
}

/**
 * Gets the end of the current month
 */
export function getEndOfMonth(date: Date): Date {
  const resultDate = new Date(date.getTime());
  // Move to the next month, then back one day
  resultDate.setMonth(resultDate.getMonth() + 1);
  resultDate.setDate(0);
  return resultDate;
}

/**
 * Generates a date for next Friday
 */
export function generateNextFriday(): Date {
  const today = new Date();
  return getNextDayOfWeek(today, 5); // 5 = Friday
}

/**
 * Formats a date as a string
 */
export function formatDateString(date: Date | null): string {
  if (!date) return 'No date';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Checks if a date is in the past
 */
export function isDateInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Gets a relative date description (e.g., "Today", "Tomorrow", "In 3 days")
 */
export function getRelativeDateDescription(date: Date | null): string {
  if (!date) return 'No date';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);
  
  // Get days difference
  const timeDiff = dateToCheck.getTime() - today.getTime();
  const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));
  
  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Tomorrow';
  if (daysDiff === -1) return 'Yesterday';
  
  if (daysDiff > 0 && daysDiff < 7) return `In ${daysDiff} days`;
  if (daysDiff < 0 && daysDiff > -7) return `${Math.abs(daysDiff)} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: today.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
  });
} 