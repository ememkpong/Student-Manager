import type {
  ActivityRequest,
  BudgetCategoryName,
  BudgetLimits,
  RecurringBill,
  ScheduleBlock,
  SchedulePreferences,
  StudentClass,
  TodoTask,
  Transaction,
} from "../types";
import { addDaysToISO, formatISODate, getWeekdayFromDate } from "../utils/dateUtils";

export const BUDGET_CATEGORIES: BudgetCategoryName[] = [
  "Dining & Groceries",
  "Housing & Utilities",
  "Textbooks & Study",
  "Transit",
  "Personal & Leisure",
  "Other",
];

export function createInitialClasses(): StudentClass[] {
  const todayWd = getWeekdayFromDate(new Date());
  const now = new Date();
  const nextHour = Math.min(20, Math.max(9, now.getHours() + 1));
  const nextClassStart = `${String(nextHour).padStart(2, "0")}:00`;
  const nextClassEnd = `${String(nextHour + 1).padStart(2, "0")}:15`;

  const ensureToday = (days: StudentClass["days"]): StudentClass["days"] =>
    days.includes(todayWd) ? days : [...days, todayWd];

  return [
    {
      id: "cls-cs301",
      code: "CS 301",
      title: "Data Structures & Algorithms",
      days: ensureToday(["Mon", "Wed", "Fri"]),
      startTime: nextClassStart,
      endTime: nextClassEnd,
      location: "Engineering Hall 204",
      instructor: "Prof. Elena Vance",
      remindMinutesBefore: 15,
      remindersEnabled: true,
    },
    {
      id: "cls-econ204",
      code: "ECON 204",
      title: "Macroeconomic Policy",
      days: ["Tue", "Thu"],
      startTime: "10:30",
      endTime: "11:45",
      location: "Social Sciences 112",
      instructor: "Dr. Marcus Cole",
      remindMinutesBefore: 15,
      remindersEnabled: true,
    },
    {
      id: "cls-bio115",
      code: "BIO 115",
      title: "Cellular Biology Lab",
      days: ["Mon", "Wed"],
      startTime: "14:00",
      endTime: "15:50",
      location: "Life Sciences Wing B",
      instructor: "Dr. Priya Nair",
      remindMinutesBefore: 30,
      remindersEnabled: true,
    },
    {
      id: "cls-writ210",
      code: "WRIT 210",
      title: "Technical & Research Writing",
      days: ["Tue", "Fri"],
      startTime: "13:00",
      endTime: "14:15",
      location: "Humanities 308",
      instructor: "Prof. Jonah Brooks",
      remindMinutesBefore: 15,
      remindersEnabled: true,
    },
  ];
}

export function createInitialTasks(): TodoTask[] {
  const today = formatISODate(new Date());
  const tomorrow = addDaysToISO(today, 1);
  const inTwoDays = addDaysToISO(today, 2);
  const inFourDays = addDaysToISO(today, 4);

  return [
    {
      id: "tsk-1",
      title: "Submit CS 301 Graph Traversal Problem Set",
      category: "Academic",
      priority: "High",
      dueDate: today,
      dueTime: "23:59",
      estimatedMinutes: 90,
      courseCode: "CS 301",
      notes: "Double-check BFS/DFS complexity proofs before uploading PDF.",
      completed: false,
      remindBeforeMinutes: 60,
      createdAt: today,
    },
    {
      id: "tsk-2",
      title: "Read Macroeconomics Chapters 6 & 7",
      category: "Academic",
      priority: "Medium",
      dueDate: tomorrow,
      dueTime: "10:00",
      estimatedMinutes: 60,
      courseCode: "ECON 204",
      notes: "Focus on monetary policy transmission diagrams.",
      completed: false,
      remindBeforeMinutes: 30,
      createdAt: today,
    },
    {
      id: "tsk-3",
      title: "Pick up groceries & meal prep staples",
      category: "Errand",
      priority: "Medium",
      dueDate: tomorrow,
      dueTime: "18:00",
      estimatedMinutes: 45,
      notes: "Oats, eggs, spinach, chicken breast, coffee beans.",
      completed: false,
      remindBeforeMinutes: 30,
      createdAt: today,
    },
    {
      id: "tsk-4",
      title: "Pay campus transit pass renewal",
      category: "Finance",
      priority: "High",
      dueDate: inTwoDays,
      dueTime: "17:00",
      estimatedMinutes: 15,
      notes: "Renew student semester shuttle card online.",
      completed: false,
      remindBeforeMinutes: 60,
      createdAt: today,
    },
    {
      id: "tsk-5",
      title: "Draft WRIT 210 literature review outline",
      category: "Academic",
      priority: "Low",
      dueDate: inFourDays,
      dueTime: "15:00",
      estimatedMinutes: 75,
      courseCode: "WRIT 210",
      notes: "Compile at least 5 peer-reviewed sources.",
      completed: false,
      remindBeforeMinutes: 30,
      createdAt: today,
    },
  ];
}

export function createInitialActivities(): ActivityRequest[] {
  return [
    {
      id: "act-1",
      title: "Campus Gym Strength Session",
      durationMinutes: 60,
      frequency: "3x per week",
      preferredWindow: "Morning",
      category: "wellness",
    },
    {
      id: "act-2",
      title: "Deep Focus Library Study",
      durationMinutes: 90,
      frequency: "Daily",
      preferredWindow: "Afternoon",
      category: "study",
    },
    {
      id: "act-3",
      title: "Campus Coffee Shop Shift",
      durationMinutes: 180,
      frequency: "Wed & Fri",
      preferredWindow: "Afternoon",
      category: "work",
    },
    {
      id: "act-4",
      title: "Laundry & Room Reset",
      durationMinutes: 60,
      frequency: "Once on weekend",
      preferredWindow: "Morning",
      category: "errand",
    },
  ];
}

export const DEFAULT_ACTIVITIES_PROMPT =
  "Gym workout 1 hour 3x/week in the morning, Deep study blocks 90 min daily, Campus library part-time shift Thu 16:00-19:00, Grocery run 45 min, Laundry 1 hour on Sunday morning.";

export const DEFAULT_PREFERENCES: SchedulePreferences = {
  wakeTime: "07:30",
  sleepTime: "23:00",
  breakMinutes: 15,
  scope: "week",
  focusNote: "Keep evenings lighter after 8 PM and group errands together.",
  includeClasses: true,
  includeTasks: true,
};

export function createInitialSchedule(classes: StudentClass[]): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  classes.forEach((cls) => {
    cls.days.forEach((day) => {
      blocks.push({
        id: `blk-${cls.id}-${day}`,
        title: `${cls.code}: ${cls.title}`,
        day,
        startTime: cls.startTime,
        endTime: cls.endTime,
        category: "class",
        location: cls.location,
        notes: cls.instructor,
        sourceType: "class",
        sourceId: cls.id,
        completed: false,
      });
    });
  });

  const todayWd = getWeekdayFromDate(new Date());
  blocks.push(
    {
      id: "blk-seed-study",
      title: "CS 301 Graph Problem Set Sprint",
      day: todayWd,
      startTime: "16:30",
      endTime: "18:00",
      category: "study",
      location: "Main Library Floor 3",
      notes: "Finish BFS/DFS proofs before tonight's deadline.",
      sourceType: "task",
      sourceId: "tsk-1",
      completed: false,
    },
    {
      id: "blk-seed-gym",
      title: "Campus Recreation Strength Workout",
      day: "Tue",
      startTime: "08:00",
      endTime: "09:00",
      category: "wellness",
      location: "Student Rec Center",
      notes: "Morning lift before ECON 204.",
      sourceType: "activity",
      completed: false,
    },
    {
      id: "blk-seed-groceries",
      title: "Grocery Run & Meal Prep",
      day: "Sat",
      startTime: "10:30",
      endTime: "11:30",
      category: "errand",
      location: "Fresh Market",
      notes: "Weekly produce and pantry essentials.",
      sourceType: "activity",
      completed: false,
    }
  );

  return blocks;
}

export function createInitialTransactions(): Transaction[] {
  const now = new Date();
  const today = formatISODate(now);
  const d1 = addDaysToISO(today, -1);
  const d2 = addDaysToISO(today, -2);
  const d3 = addDaysToISO(today, -3);
  const d4 = addDaysToISO(today, -4);
  const d5 = addDaysToISO(today, -5);
  const d8 = addDaysToISO(today, -8);

  const prevMonthDate = (day: number) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - 1, day);
    return formatISODate(dt);
  };

  return [
    {
      id: "tx-1",
      title: "Monthly Student Allowance & Stipend",
      amount: 200000,
      type: "income",
      category: "Income",
      date: d8,
      notes: "Monthly student stipend deposit",
    },
    {
      id: "tx-2",
      title: "Part-Time Library Desk Pay",
      amount: 45000,
      type: "income",
      category: "Income",
      date: d3,
      notes: "Bi-weekly campus work hours",
    },
    {
      id: "tx-3",
      title: "Shared Hostel Rent & Wi-Fi",
      amount: 65000,
      type: "expense",
      category: "Housing & Utilities",
      date: d8,
      notes: "Monthly accommodation & internet split",
    },
    {
      id: "tx-4",
      title: "Weekly Foodstuffs & Groceries",
      amount: 14500,
      type: "expense",
      category: "Dining & Groceries",
      date: d5,
      notes: "Garri, rice, eggs, produce, provisions",
    },
    {
      id: "tx-5",
      title: "Campus Shuttle & BRT Reload",
      amount: 4200,
      type: "expense",
      category: "Transit",
      date: d4,
      notes: "Weekly commute card top-up",
    },
    {
      id: "tx-6",
      title: "Algorithms Lab Manual & Printing",
      amount: 7800,
      type: "expense",
      category: "Textbooks & Study",
      date: d3,
      notes: "Departmental bookshop",
    },
    {
      id: "tx-7",
      title: "Cafeteria Lunch & Bottled Water",
      amount: 3200,
      type: "expense",
      category: "Dining & Groceries",
      date: d2,
      notes: "Between afternoon lectures",
    },
    {
      id: "tx-8",
      title: "Mobile Data Bundle Renewal",
      amount: 4500,
      type: "expense",
      category: "Housing & Utilities",
      date: d1,
      notes: "Monthly student data plan",
    },
    {
      id: "tx-9",
      title: "Campus Coffee & Meat Pie",
      amount: 2400,
      type: "expense",
      category: "Dining & Groceries",
      date: today,
      notes: "Morning study snack",
    },
    {
      id: "tx-10",
      title: "Weekend Movie & Hangout",
      amount: 6500,
      type: "expense",
      category: "Personal & Leisure",
      date: d4,
      notes: "Student union cinema night",
    },
    // Previous Month Reference Transactions
    {
      id: "tx-prev-1",
      title: "Previous Month Allowance",
      amount: 200000,
      type: "income",
      category: "Income",
      date: prevMonthDate(2),
      notes: "October stipend deposit",
    },
    {
      id: "tx-prev-2",
      title: "Hostel Rent & Utilities",
      amount: 65000,
      type: "expense",
      category: "Housing & Utilities",
      date: prevMonthDate(3),
      notes: "October accommodation & internet",
    },
    {
      id: "tx-prev-3",
      title: "October Foodstuffs & Dining",
      amount: 38500,
      type: "expense",
      category: "Dining & Groceries",
      date: prevMonthDate(10),
      notes: "Monthly groceries and cafeteria meals",
    },
    {
      id: "tx-prev-4",
      title: "Semester Course Readers & Stationery",
      amount: 16500,
      type: "expense",
      category: "Textbooks & Study",
      date: prevMonthDate(12),
      notes: "Course handouts and notebooks",
    },
    {
      id: "tx-prev-5",
      title: "October Campus Commute & Ride Shares",
      amount: 11200,
      type: "expense",
      category: "Transit",
      date: prevMonthDate(18),
      notes: "Shuttle pass and errands",
    },
    {
      id: "tx-prev-6",
      title: "Personal Care & Leisure",
      amount: 9400,
      type: "expense",
      category: "Personal & Leisure",
      date: prevMonthDate(21),
      notes: "Haircut and weekend outing",
    },
    {
      id: "tx-prev-7",
      title: "Laundry & Miscellaneous Supplies",
      amount: 4800,
      type: "expense",
      category: "Other",
      date: prevMonthDate(24),
      notes: "Detergent and room essentials",
    },
  ];
}

export const DEFAULT_BUDGET_LIMITS: BudgetLimits = {
  monthlyCap: 180000,
  categories: {
    "Dining & Groceries": 55000,
    "Housing & Utilities": 65000,
    "Textbooks & Study": 22000,
    Transit: 16000,
    "Personal & Leisure": 14000,
    Other: 8000,
  },
};

export function createInitialBills(): RecurringBill[] {
  const todayDay = new Date().getDate();
  const upcomingDay = Math.min(28, todayDay + 2);
  return [
    {
      id: "bill-1",
      title: "Student Mobile Data Plan",
      amount: 4500,
      dueDay: upcomingDay,
      category: "Housing & Utilities",
    },
    {
      id: "bill-2",
      title: "Campus Shuttle & Transit Pass",
      amount: 5000,
      dueDay: Math.min(28, todayDay + 1),
      category: "Transit",
    },
    {
      id: "bill-3",
      title: "Hostel Rent Share",
      amount: 65000,
      dueDay: 1,
      category: "Housing & Utilities",
    },
  ];
}
