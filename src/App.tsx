import { useState } from "react";
import { ClassesView } from "./components/ClassesView";
import { MoneyView } from "./components/MoneyView";
import { OverviewView } from "./components/OverviewView";
import { QuickAddModal } from "./components/QuickAddModal";
import { ReminderPopover } from "./components/ReminderPopover";
import { ScheduleView } from "./components/ScheduleView";
import { Sidebar } from "./components/Sidebar";
import { TasksView } from "./components/TasksView";
import { TopBar } from "./components/TopBar";
import {
  createInitialActivities,
  createInitialBills,
  createInitialClasses,
  createInitialSchedule,
  createInitialTasks,
  createInitialTransactions,
  DEFAULT_ACTIVITIES_PROMPT,
  DEFAULT_BUDGET_LIMITS,
  DEFAULT_PREFERENCES,
} from "./data/defaultData";
import { usePersistentState } from "./hooks/usePersistentState";
import { useReminders } from "./hooks/useReminders";
import type {
  ActivityRequest,
  AppTab,
  BudgetLimits,
  RecurringBill,
  ScheduleBlock,
  SchedulePreferences,
  StudentClass,
  TodoTask,
  Transaction,
} from "./types";
import {
  formatISODate,
  getCurrentMonthPrefix,
  getWeekdayFromDate,
  timeToMinutes,
} from "./utils/dateUtils";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Persistent Student State
  const [classes, setClasses] = usePersistentState<StudentClass[]>(
    "termflow_v1_classes",
    () => createInitialClasses()
  );
  const [tasks, setTasks] = usePersistentState<TodoTask[]>(
    "termflow_v1_tasks",
    () => createInitialTasks()
  );
  const [activitiesPrompt, setActivitiesPrompt] = usePersistentState<string>(
    "termflow_v1_activities_prompt",
    DEFAULT_ACTIVITIES_PROMPT
  );
  const [activitiesList, setActivitiesList] = usePersistentState<
    ActivityRequest[]
  >("termflow_v1_activities_list", () => createInitialActivities());
  const [preferences, setPreferences] =
    usePersistentState<SchedulePreferences>(
      "termflow_v1_preferences",
      DEFAULT_PREFERENCES
    );
  const [scheduleBlocks, setScheduleBlocks] = usePersistentState<
    ScheduleBlock[]
  >("termflow_v1_schedule", () => createInitialSchedule(createInitialClasses()));
  const [scheduleSummary, setScheduleSummary] = usePersistentState<string>(
    "termflow_v1_schedule_summary",
    ""
  );
  const [transactions, setTransactions] = usePersistentState<Transaction[]>(
    "termflow_ngn_v2_transactions",
    () => createInitialTransactions()
  );
  const [budgetLimits, setBudgetLimits] = usePersistentState<BudgetLimits>(
    "termflow_ngn_v1_budget",
    DEFAULT_BUDGET_LIMITS
  );
  const [bills, setBills] = usePersistentState<RecurringBill[]>(
    "termflow_ngn_v1_bills",
    () => createInitialBills()
  );
  const [soundEnabled, setSoundEnabled] = usePersistentState<boolean>(
    "termflow_v1_sound",
    true
  );
  const [browserAlertsEnabled, setBrowserAlertsEnabled] =
    usePersistentState<boolean>("termflow_v1_browser_alerts", false);

  const { now, nextClass, activeAlerts, dismissAlert, snoozeAlert } =
    useReminders({
      classes,
      tasks,
      scheduleBlocks,
      bills,
      soundEnabled,
      browserAlertsEnabled,
    });

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Handlers: Tasks
  const handleAddTask = (
    task: Omit<TodoTask, "id" | "createdAt" | "completed">
  ) => {
    const newTask: TodoTask = {
      ...task,
      id: `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      completed: false,
      createdAt: formatISODate(new Date()),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleAddMultipleTasks = (
    items: Omit<TodoTask, "id" | "createdAt" | "completed">[]
  ) => {
    const todayISO = formatISODate(new Date());
    const newTasks: TodoTask[] = items.map((item, idx) => ({
      ...item,
      id: `tsk-${Date.now()}-${idx}`,
      completed: false,
      createdAt: todayISO,
    }));
    setTasks((prev) => [...newTasks, ...prev]);
  };

  const handleQuickAddTask = (title: string) => {
    handleAddTask({
      title,
      category: "Personal",
      priority: "Medium",
      dueDate: formatISODate(new Date()),
      dueTime: "18:00",
      estimatedMinutes: 30,
      remindBeforeMinutes: 30,
    });
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleScheduleTask = (task: TodoTask) => {
    const todayWd = getWeekdayFromDate(new Date());
    const existing = scheduleBlocks
      .filter((b) => b.day === todayWd)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    let slotStart = Math.max(9 * 60, now.getHours() * 60 + 30);
    slotStart = Math.ceil(slotStart / 15) * 15;
    const duration = Math.max(15, task.estimatedMinutes || 30);

    for (const blk of existing) {
      const bStart = timeToMinutes(blk.startTime);
      const bEnd = timeToMinutes(blk.endTime);
      if (slotStart + duration <= bStart) break;
      if (slotStart < bEnd) {
        slotStart = bEnd + 15;
      }
    }

    if (slotStart + duration > 23 * 60) {
      slotStart = 19 * 60;
    }

    const toHHMM = (mins: number) =>
      `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(
        mins % 60
      ).padStart(2, "0")}`;

    const newBlock: ScheduleBlock = {
      id: `blk-tsk-${Date.now()}`,
      title: task.title,
      day: todayWd,
      startTime: toHHMM(slotStart),
      endTime: toHHMM(slotStart + duration),
      category: task.category === "Errand" ? "errand" : "study",
      notes: task.courseCode ? `Task for ${task.courseCode}` : "Scheduled task",
      sourceType: "task",
      sourceId: task.id,
      completed: false,
    };

    setScheduleBlocks((prev) => [...prev, newBlock]);
    setActiveTab("schedule");
  };

  // Handlers: Classes
  const handleAddClass = (cls: Omit<StudentClass, "id">) => {
    const newCls: StudentClass = {
      ...cls,
      id: `cls-${Date.now()}`,
    };
    setClasses((prev) => [...prev, newCls]);

    // Also reflect in current schedule blocks
    const newBlocks: ScheduleBlock[] = newCls.days.map((day) => ({
      id: `blk-${newCls.id}-${day}`,
      title: `${newCls.code}: ${newCls.title}`,
      day,
      startTime: newCls.startTime,
      endTime: newCls.endTime,
      category: "class",
      location: newCls.location,
      notes: newCls.instructor,
      sourceType: "class",
      sourceId: newCls.id,
      completed: false,
    }));
    setScheduleBlocks((prev) => [...prev, ...newBlocks]);
  };

  const handleUpdateClass = (updated: StudentClass) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setScheduleBlocks((prev) => {
      const withoutOld = prev.filter(
        (b) => !(b.sourceType === "class" && b.sourceId === updated.id)
      );
      const refreshed: ScheduleBlock[] = updated.days.map((day) => ({
        id: `blk-${updated.id}-${day}`,
        title: `${updated.code}: ${updated.title}`,
        day,
        startTime: updated.startTime,
        endTime: updated.endTime,
        category: "class",
        location: updated.location,
        notes: updated.instructor,
        sourceType: "class",
        sourceId: updated.id,
        completed: false,
      }));
      return [...withoutOld, ...refreshed];
    });
  };

  const handleDeleteClass = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setScheduleBlocks((prev) =>
      prev.filter((b) => !(b.sourceType === "class" && b.sourceId === id))
    );
  };

  const handleToggleClassReminder = (id: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, remindersEnabled: !c.remindersEnabled } : c
      )
    );
  };

  // Handlers: Activities & Schedule
  const handleAddActivity = (act: Omit<ActivityRequest, "id">) => {
    setActivitiesList((prev) => [
      ...prev,
      { ...act, id: `act-${Date.now()}` },
    ]);
  };

  const handleDeleteActivity = (id: string) => {
    setActivitiesList((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddManualBlock = (block: Omit<ScheduleBlock, "id">) => {
    setScheduleBlocks((prev) => [
      ...prev,
      { ...block, id: `blk-${Date.now()}` },
    ]);
  };

  const handleToggleBlockComplete = (id: string) => {
    setScheduleBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, completed: !b.completed } : b))
    );
  };

  const handleDeleteBlock = (id: string) => {
    setScheduleBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  // Handlers: Money & Bills
  const handleAddTransaction = (tx: Omit<Transaction, "id">) => {
    setTransactions((prev) => [{ ...tx, id: `tx-${Date.now()}` }, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddBill = (bill: Omit<RecurringBill, "id">) => {
    setBills((prev) => [...prev, { ...bill, id: `bill-${Date.now()}` }]);
  };

  const handlePayBill = (bill: RecurringBill) => {
    const monthPrefix = getCurrentMonthPrefix(new Date());
    setBills((prev) =>
      prev.map((b) =>
        b.id === bill.id ? { ...b, lastPaidMonth: monthPrefix } : b
      )
    );
    handleAddTransaction({
      title: bill.title,
      amount: bill.amount,
      type: "expense",
      category: bill.category,
      date: formatISODate(new Date()),
      notes: "Paid recurring bill",
    });
  };

  const handleDeleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  // Browser notifications permission
  const handleRequestBrowserAlerts = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      setBrowserAlertsEnabled((v) => !v);
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setBrowserAlertsEnabled(true);
    }
  };

  // Reset demo data
  const handleResetDemoData = () => {
    const freshClasses = createInitialClasses();
    setClasses(freshClasses);
    setTasks(createInitialTasks());
    setActivitiesPrompt(DEFAULT_ACTIVITIES_PROMPT);
    setActivitiesList(createInitialActivities());
    setPreferences(DEFAULT_PREFERENCES);
    setScheduleBlocks(createInitialSchedule(freshClasses));
    setScheduleSummary("");
    setTransactions(createInitialTransactions());
    setBudgetLimits(DEFAULT_BUDGET_LIMITS);
    setBills(createInitialBills());
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        nextClass={nextClass}
        openTasksCount={tasks.filter((t) => !t.completed).length}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
        onResetDemoData={handleResetDemoData}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeTab={activeTab}
          alertCount={activeAlerts.length}
          remindersOpen={remindersOpen}
          onToggleReminders={() => setRemindersOpen((v) => !v)}
          onOpenQuickAdd={() => setQuickAddOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          todayLabel={todayLabel}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">
          {activeTab === "overview" && (
            <OverviewView
              nextClass={nextClass}
              classes={classes}
              scheduleBlocks={scheduleBlocks}
              tasks={tasks}
              transactions={transactions}
              budgetLimits={budgetLimits}
              activeAlerts={activeAlerts}
              onNavigate={setActiveTab}
              onToggleBlockComplete={handleToggleBlockComplete}
              onToggleTaskComplete={handleToggleTask}
              onQuickAddTask={handleQuickAddTask}
            />
          )}

          {activeTab === "schedule" && (
            <ScheduleView
              activitiesPrompt={activitiesPrompt}
              onChangeActivitiesPrompt={setActivitiesPrompt}
              activitiesList={activitiesList}
              onAddActivity={handleAddActivity}
              onDeleteActivity={handleDeleteActivity}
              preferences={preferences}
              onChangePreferences={setPreferences}
              classes={classes}
              tasks={tasks}
              scheduleBlocks={scheduleBlocks}
              scheduleSummary={scheduleSummary}
              onApplyGeneratedSchedule={(blocks, summary) => {
                setScheduleBlocks(blocks);
                setScheduleSummary(summary);
              }}
              onAddManualBlock={handleAddManualBlock}
              onToggleBlockComplete={handleToggleBlockComplete}
              onDeleteBlock={handleDeleteBlock}
            />
          )}

          {activeTab === "classes" && (
            <ClassesView
              classes={classes}
              nextClass={nextClass}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
              onToggleClassReminder={handleToggleClassReminder}
            />
          )}

          {activeTab === "tasks" && (
            <TasksView
              tasks={tasks}
              classes={classes}
              onAddTask={handleAddTask}
              onAddMultipleTasks={handleAddMultipleTasks}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onScheduleTask={handleScheduleTask}
            />
          )}

          {activeTab === "money" && (
            <MoneyView
              transactions={transactions}
              budgetLimits={budgetLimits}
              bills={bills}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onUpdateBudgetLimits={setBudgetLimits}
              onAddBill={handleAddBill}
              onPayBill={handlePayBill}
              onDeleteBill={handleDeleteBill}
            />
          )}
        </main>
      </div>

      <ReminderPopover
        open={remindersOpen}
        alerts={activeAlerts}
        browserAlertsEnabled={browserAlertsEnabled}
        onRequestBrowserAlerts={handleRequestBrowserAlerts}
        onSnooze={(id) => snoozeAlert(id, 10)}
        onDismiss={dismissAlert}
        onNavigate={setActiveTab}
        onClose={() => setRemindersOpen(false)}
      />

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        classes={classes}
        onAddTask={handleAddTask}
        onAddTransaction={handleAddTransaction}
        onAddClass={handleAddClass}
        onAddActivity={handleAddActivity}
      />
    </div>
  );
}
