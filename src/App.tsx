import { useState } from "react";
import { AuthGate } from "./components/AuthGate";
import { ClassesView } from "./components/ClassesView";
import { MoneyView } from "./components/MoneyView";
import { OverviewView } from "./components/OverviewView";
import { ProfileModal } from "./components/ProfileModal";
import { QuickAddModal } from "./components/QuickAddModal";
import { ReminderPopover } from "./components/ReminderPopover";
import { ScheduleView } from "./components/ScheduleView";
import { Sidebar } from "./components/Sidebar";
import { TasksView } from "./components/TasksView";
import { TopBar } from "./components/TopBar";
import { useReminders } from "./hooks/useReminders";
import { useStudentWorkspace } from "./hooks/useStudentWorkspace";
import type { AppTab, TodoTask } from "./types";
import {
  formatISODate,
  getWeekdayFromDate,
  timeToMinutes,
} from "./utils/dateUtils";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const workspace = useStudentWorkspace();
  const {
    user,
    authReady,
    workspaceReady,
    profile,
    classes,
    tasks,
    activitiesPrompt,
    activitiesList,
    preferences,
    scheduleBlocks,
    scheduleSummary,
    transactions,
    budgetLimits,
    bills,
    goals,
    soundEnabled,
    browserAlertsEnabled,
  } = workspace;

  const { now, nextClass, activeAlerts, dismissAlert, snoozeAlert } =
    useReminders({
      classes,
      tasks,
      scheduleBlocks,
      bills,
      soundEnabled,
      browserAlertsEnabled,
    });

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#4c1d95] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="font-display text-2xl font-bold text-white tracking-tight">
            Termflow
          </div>
          <div className="text-xs text-purple-200">Checking your session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  if (!workspaceReady) {
    return (
      <div className="min-h-screen bg-[#4c1d95] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="font-display text-2xl font-bold text-white tracking-tight">
            Termflow
          </div>
          <div className="text-xs text-purple-200">
            Loading your saved student workspace...
          </div>
        </div>
      </div>
    );
  }

  const needsOnboarding = Boolean(profile && !profile.profileCompleted);
  const showProfileModal = needsOnboarding || profileModalOpen;

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleQuickAddTask = (title: string) => {
    void workspace.addTask({
      title,
      category: "Personal",
      priority: "Medium",
      dueDate: formatISODate(new Date()),
      dueTime: "18:00",
      estimatedMinutes: 30,
      remindBeforeMinutes: 30,
    });
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

    void workspace.addScheduleBlock({
      title: task.title,
      day: todayWd,
      startTime: toHHMM(slotStart),
      endTime: toHHMM(slotStart + duration),
      category: task.category === "Errand" ? "errand" : "study",
      notes: task.courseCode ? `Task for ${task.courseCode}` : "Scheduled task",
      sourceType: "task",
      sourceId: task.id,
      completed: false,
    });

    setActiveTab("schedule");
  };

  const handleRequestBrowserAlerts = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      void workspace.setBrowserAlerts(!browserAlertsEnabled);
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      void workspace.setBrowserAlerts(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#4c1d95] text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        nextClass={nextClass}
        openTasksCount={tasks.filter((t) => !t.completed).length}
        soundEnabled={soundEnabled}
        onToggleSound={() => void workspace.toggleSound()}
        onClearWorkspaceData={() => void workspace.clearWorkspaceData()}
        profile={profile}
        onEditProfile={() => setProfileModalOpen(true)}
        onSignOut={() => void workspace.handleSignOut()}
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
              profile={profile}
              onEditProfile={() => setProfileModalOpen(true)}
              nextClass={nextClass}
              classes={classes}
              scheduleBlocks={scheduleBlocks}
              tasks={tasks}
              transactions={transactions}
              budgetLimits={budgetLimits}
              goals={goals}
              activeAlerts={activeAlerts}
              onNavigate={setActiveTab}
              onToggleBlockComplete={(id) =>
                void workspace.toggleBlockComplete(id)
              }
              onToggleTaskComplete={(id) => void workspace.toggleTask(id)}
              onQuickAddTask={handleQuickAddTask}
              onAddGoal={(goal) => void workspace.addGoal(goal)}
              onUpdateGoalProgress={(id, nextVal, explicitCompleted) =>
                void workspace.updateGoalProgress(id, nextVal, explicitCompleted)
              }
              onUpdateGoal={(goal) => void workspace.updateGoal(goal)}
              onDeleteGoal={(id) => void workspace.deleteGoal(id)}
            />
          )}

          {activeTab === "schedule" && (
            <ScheduleView
              activitiesPrompt={activitiesPrompt}
              onChangeActivitiesPrompt={workspace.setActivitiesPrompt}
              activitiesList={activitiesList}
              onAddActivity={(act) => void workspace.addActivity(act)}
              onDeleteActivity={(id) => void workspace.deleteActivity(id)}
              preferences={preferences}
              onChangePreferences={workspace.setPreferences}
              classes={classes}
              tasks={tasks}
              scheduleBlocks={scheduleBlocks}
              scheduleSummary={scheduleSummary}
              onApplyGeneratedSchedule={(blocks, summary) =>
                void workspace.applyGeneratedSchedule(blocks, summary)
              }
              onAddManualBlock={(block) =>
                void workspace.addScheduleBlock(block)
              }
              onToggleBlockComplete={(id) =>
                void workspace.toggleBlockComplete(id)
              }
              onDeleteBlock={(id) => void workspace.deleteBlock(id)}
            />
          )}

          {activeTab === "classes" && (
            <ClassesView
              classes={classes}
              nextClass={nextClass}
              onAddClass={(cls) => void workspace.addClass(cls)}
              onUpdateClass={(cls) => void workspace.updateClass(cls)}
              onDeleteClass={(id) => void workspace.deleteClass(id)}
              onToggleClassReminder={(id) =>
                void workspace.toggleClassReminder(id)
              }
            />
          )}

          {activeTab === "tasks" && (
            <TasksView
              tasks={tasks}
              classes={classes}
              onAddTask={(t) => void workspace.addTask(t)}
              onAddMultipleTasks={(items) =>
                void workspace.addMultipleTasks(items)
              }
              onToggleTask={(id) => void workspace.toggleTask(id)}
              onDeleteTask={(id) => void workspace.deleteTask(id)}
              onScheduleTask={handleScheduleTask}
            />
          )}

          {activeTab === "money" && (
            <MoneyView
              transactions={transactions}
              budgetLimits={budgetLimits}
              bills={bills}
              onAddTransaction={(tx) => void workspace.addTransaction(tx)}
              onDeleteTransaction={(id) =>
                void workspace.deleteTransaction(id)
              }
              onUpdateBudgetLimits={(limits) =>
                void workspace.setBudgetLimits(limits)
              }
              onAddBill={(bill) => void workspace.addBill(bill)}
              onPayBill={(bill) => void workspace.payBill(bill)}
              onDeleteBill={(id) => void workspace.deleteBill(id)}
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
        onAddTask={(t) => void workspace.addTask(t)}
        onAddTransaction={(tx) => void workspace.addTransaction(tx)}
        onAddClass={(cls) => void workspace.addClass(cls)}
        onAddActivity={(act) => void workspace.addActivity(act)}
      />

      <ProfileModal
        open={showProfileModal}
        isOnboarding={needsOnboarding}
        profile={profile}
        fallbackName={user.displayName || ""}
        fallbackEmail={user.email || ""}
        onSave={workspace.saveProfile}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}
