export type AppTab = "overview" | "schedule" | "classes" | "tasks" | "money";

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type BlockCategory =
  | "class"
  | "study"
  | "activity"
  | "errand"
  | "wellness"
  | "work"
  | "break";

export type TaskCategory = "Academic" | "Errand" | "Finance" | "Personal";
export type TaskPriority = "High" | "Medium" | "Low";

export type BudgetCategoryName =
  | "Dining & Groceries"
  | "Housing & Utilities"
  | "Textbooks & Study"
  | "Transit"
  | "Personal & Leisure"
  | "Other";

export interface StudentClass {
  id: string;
  code: string;
  title: string;
  days: Weekday[];
  startTime: string; // HH:MM 24h
  endTime: string; // HH:MM 24h
  location: string;
  instructor: string;
  remindMinutesBefore: number;
  remindersEnabled: boolean;
}

export interface TodoTask {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM 24h
  estimatedMinutes: number;
  courseCode?: string;
  notes?: string;
  completed: boolean;
  remindBeforeMinutes: number;
  createdAt: string;
}

export interface ActivityRequest {
  id: string;
  title: string;
  durationMinutes: number;
  frequency: string;
  preferredWindow: "Anytime" | "Morning" | "Afternoon" | "Evening";
  category: BlockCategory;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  day: Weekday;
  startTime: string; // HH:MM 24h
  endTime: string; // HH:MM 24h
  category: BlockCategory;
  location?: string;
  notes?: string;
  sourceType: "class" | "task" | "activity";
  sourceId?: string;
  completed?: boolean;
}

export interface SchedulePreferences {
  wakeTime: string;
  sleepTime: string;
  breakMinutes: number;
  scope: "today" | "week";
  focusNote: string;
  includeClasses: boolean;
  includeTasks: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "expense" | "income";
  category: BudgetCategoryName | "Income";
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface BudgetLimits {
  monthlyCap: number;
  categories: Record<BudgetCategoryName, number>;
}

export interface RecurringBill {
  id: string;
  title: string;
  amount: number;
  dueDay: number; // 1-31
  category: BudgetCategoryName;
  lastPaidMonth?: string; // YYYY-MM
}

export interface ActiveReminder {
  id: string;
  type: "class" | "task" | "schedule" | "bill";
  title: string;
  subtitle: string;
  urgency: "now" | "soon" | "upcoming";
  minutesRemaining: number;
  targetTab: AppTab;
  relatedId: string;
}

export interface StudentProfile {
  uid: string;
  name: string;
  gmail: string;
  semester: string;
  level: string;
  photoURL: string;
  profileCompleted: boolean;
}

