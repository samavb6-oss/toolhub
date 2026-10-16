export type CalorieUnit = "metric" | "imperial";
export type CalorieSex = "female" | "male";
export type CalorieActivity = "sedentary" | "light" | "moderate" | "active" | "very-active";
export type CalorieGoal = "maintain" | "lose" | "gain";
export interface CalorieInput { unit: CalorieUnit; sex: CalorieSex; age: string; height: string; weight: string; activity: CalorieActivity; goal: CalorieGoal }
export type CalorieResult = { ok: true; bmr: number; maintenance: number; target: number | null; proteinGrams: number } | { ok: false; empty: boolean; errors: Partial<Record<"age"|"height"|"weight", string>> };
export const ACTIVITY_MULTIPLIERS: Record<CalorieActivity, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, "very-active": 1.9 };
const DECIMAL = /^(?:\d+\.?\d*|\.\d+)$/;
function parse(text: string): number | null { const s=text.trim(); if (!s || !DECIMAL.test(s)) return null; const n=Number(s); return Number.isFinite(n) ? n : null; }
export function calculateCalories(input: CalorieInput): CalorieResult {
 const errors: Partial<Record<"age"|"height"|"weight",string>>={};
 const age=parse(input.age), height=parse(input.height), weight=parse(input.weight);
 const empty=!input.age.trim()&&!input.height.trim()&&!input.weight.trim();
 if(empty) return {ok:false,empty:true,errors};
 if(age===null) errors.age=input.age.trim() ? "Enter age as a plain whole number." : "Enter your age.";
 else if(!Number.isInteger(age)||age<18||age>120) errors.age="Age must be a whole number from 18 to 120.";
 const heightCm=height===null?null:(input.unit==="metric"?height:height*2.54);
 if(height===null) errors.height=input.height.trim()?"Enter height as a plain number.":"Enter your height.";
 else if(heightCm!<100||heightCm!>250) errors.height=input.unit==="metric"?"Height must be between 100 and 250 cm.":"Height must be between about 39.4 and 98.4 inches.";
 const weightKg=weight===null?null:(input.unit==="metric"?weight:weight*0.45359237);
 if(weight===null) errors.weight=input.weight.trim()?"Enter weight as a plain number.":"Enter your weight.";
 else if(weightKg!<25||weightKg!>350) errors.weight=input.unit==="metric"?"Weight must be between 25 and 350 kg.":"Weight must be between about 55 and 772 lb.";
 if(Object.keys(errors).length) return {ok:false,empty:false,errors};
 const bmr=10*weightKg!+6.25*heightCm!-5*age!+(input.sex==="male"?5:-161);
 const maintenance=Math.round(bmr*ACTIVITY_MULTIPLIERS[input.activity]);
 // Do not invent a weight-loss target when a fixed 500 kcal deficit would reach zero or below.\n const target=input.goal==="lose"&&maintenance<=500?null:Math.round(maintenance+(input.goal==="lose"?-500:input.goal==="gain"?300:0));
 return {ok:true,bmr:Math.round(bmr),maintenance,target,proteinGrams:Math.round(weightKg!*1.6)};
}
