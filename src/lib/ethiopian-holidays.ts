/**
 * Ethiopian Public Holidays - Comprehensive calendar
 * Includes both fixed Gregorian dates and estimated moveable feasts
 * Updated annually. Covers 2025-2027.
 */

export interface EthiopianHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  nameAmharic: string;
}

// Fixed and moveable holidays per year
const HOLIDAYS_BY_YEAR: Record<number, EthiopianHoliday[]> = {
  2025: [
    { date: "2025-01-07", name: "Christmas (Genna)", nameAmharic: "ገና" },
    { date: "2025-01-19", name: "Epiphany (Timkat)", nameAmharic: "ጥምቀት" },
    { date: "2025-03-02", name: "Battle of Adwa", nameAmharic: "የአድዋ ድል" },
    { date: "2025-03-30", name: "Eid al-Fitr", nameAmharic: "ኢድ አልፈጥር" },
    { date: "2025-04-18", name: "Good Friday", nameAmharic: "ስቅለት" },
    { date: "2025-04-20", name: "Easter (Fasika)", nameAmharic: "ፋሲካ" },
    { date: "2025-05-01", name: "Labour Day", nameAmharic: "የሰራተኞች ቀን" },
    { date: "2025-05-05", name: "Patriots' Victory Day", nameAmharic: "የአርበኞች ቀን" },
    { date: "2025-05-28", name: "Derg Downfall Day", nameAmharic: "ደርግ የወደቀበት ቀን" },
    { date: "2025-06-06", name: "Eid al-Adha", nameAmharic: "አረፋ" },
    { date: "2025-09-11", name: "New Year (Enkutatash)", nameAmharic: "እንቁጣጣሽ" },
    { date: "2025-09-27", name: "Meskel", nameAmharic: "መስቀል" },
    { date: "2025-10-05", name: "Mawlid", nameAmharic: "መውሊድ" },
  ],
  2026: [
    { date: "2026-01-07", name: "Christmas (Genna)", nameAmharic: "ገና" },
    { date: "2026-01-19", name: "Epiphany (Timkat)", nameAmharic: "ጥምቀት" },
    { date: "2026-03-02", name: "Battle of Adwa", nameAmharic: "የአድዋ ድል" },
    { date: "2026-03-20", name: "Eid al-Fitr", nameAmharic: "ኢድ አልፈጥር" },
    { date: "2026-04-03", name: "Good Friday", nameAmharic: "ስቅለት" },
    { date: "2026-04-05", name: "Easter (Fasika)", nameAmharic: "ፋሲካ" },
    { date: "2026-05-01", name: "Labour Day", nameAmharic: "የሰራተኞች ቀን" },
    { date: "2026-05-05", name: "Patriots' Victory Day", nameAmharic: "የአርበኞች ቀን" },
    { date: "2026-05-27", name: "Eid al-Adha", nameAmharic: "አረፋ" },
    { date: "2026-05-28", name: "Derg Downfall Day", nameAmharic: "ደርግ የወደቀበት ቀን" },
    { date: "2026-09-11", name: "New Year (Enkutatash)", nameAmharic: "እንቁጣጣሽ" },
    { date: "2026-09-25", name: "Mawlid", nameAmharic: "መውሊድ" },
    { date: "2026-09-27", name: "Meskel", nameAmharic: "መስቀል" },
  ],
  2027: [
    { date: "2027-01-07", name: "Christmas (Genna)", nameAmharic: "ገና" },
    { date: "2027-01-19", name: "Epiphany (Timkat)", nameAmharic: "ጥምቀት" },
    { date: "2027-03-02", name: "Battle of Adwa", nameAmharic: "የአድዋ ድል" },
    { date: "2027-03-10", name: "Eid al-Fitr", nameAmharic: "ኢድ አልፈጥር" },
    { date: "2027-04-23", name: "Good Friday", nameAmharic: "ስቅለት" },
    { date: "2027-04-25", name: "Easter (Fasika)", nameAmharic: "ፋሲካ" },
    { date: "2027-05-01", name: "Labour Day", nameAmharic: "የሰራተኞች ቀን" },
    { date: "2027-05-05", name: "Patriots' Victory Day", nameAmharic: "የአርበኞች ቀን" },
    { date: "2027-05-16", name: "Eid al-Adha", nameAmharic: "አረፋ" },
    { date: "2027-05-28", name: "Derg Downfall Day", nameAmharic: "ደርግ የወደቀበት ቀን" },
    { date: "2027-09-12", name: "New Year (Enkutatash)", nameAmharic: "እንቁጣጣሽ" },
    { date: "2027-09-14", name: "Mawlid", nameAmharic: "መውሊድ" },
    { date: "2027-09-27", name: "Meskel", nameAmharic: "መስቀል" },
  ],
};

/** Get all holidays for a given year */
export function getHolidaysForYear(year: number): EthiopianHoliday[] {
  return HOLIDAYS_BY_YEAR[year] || [];
}

/** Check if a specific date is a public holiday */
export function isEthiopianHoliday(date: Date | string): EthiopianHoliday | null {
  const dateStr = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const year = parseInt(dateStr.slice(0, 4));
  const holidays = getHolidaysForYear(year);
  return holidays.find(h => h.date === dateStr) || null;
}

/** Check if a date is a working day (Mon-Fri, not a holiday) */
export function isWorkingDay(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDay();
  if (day === 0) return false; // Sunday
  if (isEthiopianHoliday(d)) return false;
  return true;
}

/** Check if Saturday (half-day) */
export function isSaturday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getDay() === 6;
}

/** Get expected working hours for a date: 8h Mon-Fri, 4h Sat, 0 Sun/Holiday */
export function getExpectedHours(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDay();
  if (day === 0 || isEthiopianHoliday(d)) return 0;
  if (day === 6) return 4;
  return 8;
}

/** Count working days in a date range (inclusive) */
export function countWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  while (cursor <= endDate) {
    if (isWorkingDay(cursor)) count++;
    else if (isSaturday(cursor) && !isEthiopianHoliday(cursor)) count++; // Saturday counts as half
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Get total expected hours in a month */
export function getMonthExpectedHours(year: number, month: number): number {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  let hours = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    hours += getExpectedHours(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  return hours;
}

/** Get upcoming holidays (next N days) */
export function getUpcomingHolidays(fromDate: Date = new Date(), daysAhead: number = 30): EthiopianHoliday[] {
  const year = fromDate.getFullYear();
  const holidays = [...getHolidaysForYear(year), ...getHolidaysForYear(year + 1)];
  const from = fromDate.getTime();
  const to = from + daysAhead * 86400000;
  return holidays.filter(h => {
    const t = new Date(h.date).getTime();
    return t >= from && t <= to;
  }).sort((a, b) => a.date.localeCompare(b.date));
}
