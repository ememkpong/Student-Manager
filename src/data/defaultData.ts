import type {
  BudgetCategoryName,
  BudgetLimits,
  SchedulePreferences,
} from "../types";

export const BUDGET_CATEGORIES: BudgetCategoryName[] = [
  "Dining & Groceries",
  "Housing & Utilities",
  "Textbooks & Study",
  "Transit",
  "Personal & Leisure",
  "Other",
];

export const DEFAULT_PREFERENCES: SchedulePreferences = {
  wakeTime: "07:30",
  sleepTime: "23:00",
  breakMinutes: 15,
  scope: "week",
  focusNote: "",
  includeClasses: true,
  includeTasks: true,
};

export const DEFAULT_BUDGET_LIMITS: BudgetLimits = {
  monthlyCap: 0,
  categories: {
    "Dining & Groceries": 0,
    "Housing & Utilities": 0,
    "Textbooks & Study": 0,
    Transit: 0,
    "Personal & Leisure": 0,
    Other: 0,
  },
};
