/** Date-only age calculations using ISO calendar dates (YYYY-MM-DD).
 * All arithmetic is performed in UTC calendar space; local time zones never participate.
 * In non-leap years, a February 29 birthday is observed on February 28.
 */
export type CalendarDate = { year: number; month: number; day: number };
export type AgeBreakdown = { years: number; months: number; days: number };
export type AgeCalculation = { age: AgeBreakdown; nextBirthday: string; daysUntilBirthday: number };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(value: string): CalendarDate | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > days) return null;
  return { year, month, day };
}
function ordinal(date: CalendarDate): number {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86_400_000);
}
function formatDate(date: CalendarDate): string {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function addAgeOffset(birth: CalendarDate, years: number, months: number): CalendarDate {
  const absoluteMonth = (birth.year + years) * 12 + birth.month - 1 + months;
  const year = Math.floor(absoluteMonth / 12);
  const month = absoluteMonth - year * 12 + 1;
  return { year, month, day: Math.min(birth.day, daysInMonth(year, month)) };
}
function birthdayInYear(birth: CalendarDate, year: number): CalendarDate {
  return { year, month: birth.month, day: Math.min(birth.day, daysInMonth(year, birth.month)) };
}
export function calculateAge(birthText: string, referenceText: string): AgeCalculation | null {
  const birth = parseDateOnly(birthText), reference = parseDateOnly(referenceText);
  if (!birth || !reference || ordinal(reference) < ordinal(birth)) return null;
  let years = reference.year - birth.year;
  if (ordinal(addAgeOffset(birth, years, 0)) > ordinal(reference)) years--;
  let months = 0;
  while (months < 11 && ordinal(addAgeOffset(birth, years, months + 1)) <= ordinal(reference)) months++;
  const cursor = addAgeOffset(birth, years, months);
  let nextBirthday = birthdayInYear(birth, reference.year);
  if (ordinal(nextBirthday) < ordinal(reference)) nextBirthday = birthdayInYear(birth, reference.year + 1);
  return {
    age: { years, months, days: ordinal(reference) - ordinal(cursor) },
    nextBirthday: formatDate(nextBirthday),
    daysUntilBirthday: ordinal(nextBirthday) - ordinal(reference),
  };
}
