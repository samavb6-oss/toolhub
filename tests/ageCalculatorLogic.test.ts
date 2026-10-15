import test from "node:test";
import assert from "node:assert/strict";
import { calculateAge, formatCalendarDate, parseDateOnly } from "../src/tools/ageCalculatorLogic.ts";

const age = (birth: string, on: string) => calculateAge(birth, on)?.age;
test("validates strict calendar dates", () => {
  assert.deepEqual(parseDateOnly("2000-02-29"), { year: 2000, month: 2, day: 29 });
  assert.equal(parseDateOnly("0001-02-29"), null);
  assert.deepEqual(parseDateOnly("0004-02-29"), { year: 4, month: 2, day: 29 });
  for (const value of ["1900-02-29", "2024-04-31", "2024-2-03", "0000-01-01", ""]) assert.equal(parseDateOnly(value), null);
});
test("calculates age on birthday and the preceding day", () => {
  assert.deepEqual(age("2000-10-12", "2026-10-12"), { years: 26, months: 0, days: 0 });
  assert.deepEqual(age("2000-10-12", "2026-10-11"), { years: 25, months: 11, days: 29 });
});
test("handles leap-day birthdays on February 28 in non-leap years", () => {
  assert.deepEqual(calculateAge("2000-02-29", "2023-02-28"), { age: { years: 23, months: 0, days: 0 }, nextBirthday: "2023-02-28", daysUntilBirthday: 0 });
  assert.deepEqual(calculateAge("2000-02-29", "2024-02-28")?.age, { years: 23, months: 11, days: 30 });
  assert.deepEqual(calculateAge("2000-02-29", "2024-03-01")?.age, { years: 24, months: 0, days: 1 });
});
test("clamps month-end anniversaries", () => {
  assert.deepEqual(age("2023-01-31", "2023-02-28"), { years: 0, months: 1, days: 0 });
  assert.deepEqual(age("2023-01-31", "2023-03-01"), { years: 0, months: 1, days: 1 });
  assert.deepEqual(age("2024-01-31", "2024-03-31"), { years: 0, months: 2, days: 0 });
});
test("rejects invalid inputs and future birth dates", () => {
  assert.equal(calculateAge("2020-02-30", "2021-01-01"), null);
  assert.equal(calculateAge("2021-01-01", "2020-12-31"), null);
  assert.equal(calculateAge("", "2020-01-01"), null);
});
test("same-day birth and reference dates return zero age", () => {
  assert.deepEqual(calculateAge("2026-10-12", "2026-10-12"), { age: { years: 0, months: 0, days: 0 }, nextBirthday: "2026-10-12", daysUntilBirthday: 0 });
});


test("formats years below 100 without Date.UTC's 1900 offset", () => {
  assert.equal(formatCalendarDate("0001-01-01", "en-US"), "January 1, 1");
  assert.equal(formatCalendarDate("0099-12-31", "en-US"), "December 31, 99");
  assert.equal(formatCalendarDate("0100-01-01", "en-US"), "January 1, 100");
  assert.equal(formatCalendarDate("0000-01-01", "en-US"), "");
});

test("calculates exact age on a leap birthday and for future reference dates", () => {
  assert.deepEqual(age("2000-02-29", "2024-02-29"), { years: 24, months: 0, days: 0 });
  assert.deepEqual(age("2020-06-15", "2030-06-15"), { years: 10, months: 0, days: 0 });
  assert.deepEqual(age("2020-06-15", "2030-06-14"), { years: 9, months: 11, days: 30 });
});
