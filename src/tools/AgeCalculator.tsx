import { useMemo, useState } from "react";
import { CalendarDays, RotateCcw } from "lucide-react";
import { ToolField, ToolPanel, secondaryButtonClass, toolInputClass } from "./ToolPageFrame";
import { calculateAge, formatCalendarDate, parseDateOnly } from "./ageCalculatorLogic";

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function ResultStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#2d4058] bg-[#162336] p-4"><p className="text-xs font-semibold text-[#91a3b9]">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white">{value}</p></div>;
}
export function AgeCalculator() {
  const [birthDate, setBirthDate] = useState("");
  const [referenceDate, setReferenceDate] = useState(localToday);
  const result = useMemo(() => birthDate && referenceDate ? calculateAge(birthDate, referenceDate) : null, [birthDate, referenceDate]);
  const invalidBirthDate = birthDate !== "" && parseDateOnly(birthDate) === null;
  const invalidReferenceDate = referenceDate !== "" && parseDateOnly(referenceDate) === null;
  const birthAfterReference = Boolean(birthDate && referenceDate && parseDateOnly(birthDate) && parseDateOnly(referenceDate) && birthDate > referenceDate);
  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[1fr_0.92fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">Your dates</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Calculate your completed age on any calendar date.</p>
        <div className="mt-5 grid gap-4">
          <ToolField label="Date of birth" htmlFor="age-birth-date" hint="Choose your birth date. Dates after the reference date are not accepted.">
            <input id="age-birth-date" data-testid="age-birth-date" type="date" value={birthDate} max={referenceDate || undefined} onChange={(event) => setBirthDate(event.target.value)} className={toolInputClass} />
          </ToolField>
          <ToolField label="Age on date" htmlFor="age-reference-date" hint="Defaults to today; a future reference date is allowed.">
            <input id="age-reference-date" data-testid="age-reference-date" type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} className={toolInputClass} />
          </ToolField>
          <button type="button" className={secondaryButtonClass} onClick={() => { setBirthDate(""); setReferenceDate(localToday()); }}><RotateCcw size={15} /> Reset dates</button>
          {invalidBirthDate && <p role="alert" className="text-sm font-semibold text-rose-300">Enter a valid date of birth.</p>}
          {invalidReferenceDate && <p role="alert" className="text-sm font-semibold text-rose-300">Enter a valid reference date.</p>}
          {birthAfterReference && <p role="alert" className="text-sm font-semibold text-rose-300">The reference date must be on or after the date of birth.</p>}
        </div>
      </div>
      <section aria-label="Age result" aria-live="polite" className="rounded-2xl border border-[#2d4058] bg-[#0c1420] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-[#cbd5e1]"><CalendarDays size={17} /> Age result</div>
        {result && birthDate && referenceDate ? <>
          <p className="mt-5 text-xs text-[#91a3b9]">Completed age on {formatCalendarDate(referenceDate)}</p>
          <div className="mt-3 grid grid-cols-3 gap-2"><ResultStat label="Years" value={String(result.age.years)} /><ResultStat label="Months" value={String(result.age.months)} /><ResultStat label="Days" value={String(result.age.days)} /></div>
          <div className="mt-5 rounded-xl border border-[#2d4058] bg-[#162336] p-4">
            <p className="text-xs font-semibold text-[#91a3b9]">{result.daysUntilBirthday === 0 ? "Birthday" : "Next birthday"}</p>
            <p data-testid="age-next-birthday" className="mt-1 text-lg font-extrabold text-white">{formatCalendarDate(result.nextBirthday)}</p>
            <p data-testid="age-days-until-birthday" className="mt-1 text-sm text-[#9fb0c5]">{result.daysUntilBirthday === 0 ? "Happy birthday! Today is your birthday." : `${result.daysUntilBirthday} ${result.daysUntilBirthday === 1 ? "day" : "days"} to go`}</p>
          </div>
        </> : <p className="mt-5 text-sm leading-6 text-[#8193a9]">Enter a date of birth to see your age in years, months and days, plus your next birthday.</p>}
      </section>
    </div>
    <p className="mt-5 text-xs leading-5 text-[#8193a9]">Calendar dates are compared without time-of-day or time-zone conversion. February 29 birthdays are observed on February 28 in non-leap years.</p>
  </ToolPanel>;
}
