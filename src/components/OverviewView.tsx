import { useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Plus,
} from "lucide-react";
import type {
  ActiveReminder,
  AppTab,
  BudgetLimits,
  ScheduleBlock,
  StudentClass,
  StudentProfile,
  TodoTask,
  Transaction,
} from "../types";
import type { NextClassInfo } from "../hooks/useReminders";
import {
  formatCurrency,
  formatFriendlyDate,
  formatISODate,
  formatTime12h,
  getCurrentMonthPrefix,
  getDaysRemainingInMonth,
  getWeekdayFromDate,
  timeToMinutes,
} from "../utils/dateUtils";
import { CategorySpendingChart } from "./CategorySpendingChart";
import { WeeklySpendingChart } from "./WeeklySpendingChart";

interface OverviewViewProps {
  profile: StudentProfile | null;
  onEditProfile: () => void;
  nextClass: NextClassInfo | null;
  classes: StudentClass[];
  scheduleBlocks: ScheduleBlock[];
  tasks: TodoTask[];
  transactions: Transaction[];
  budgetLimits: BudgetLimits;
  activeAlerts: ActiveReminder[];
  onNavigate: (tab: AppTab) => void;
  onToggleBlockComplete: (id: string) => void;
  onToggleTaskComplete: (id: string) => void;
  onQuickAddTask: (title: string) => void;
}

export function OverviewView({
  profile,
  onEditProfile,
  nextClass,
  scheduleBlocks,
  tasks,
  transactions,
  budgetLimits,
  activeAlerts,
  onNavigate,
  onToggleBlockComplete,
  onToggleTaskComplete,
  onQuickAddTask,
}: OverviewViewProps) {
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const today = new Date();
  const todayISO = formatISODate(today);
  const todayWd = getWeekdayFromDate(today);
  const monthPrefix = getCurrentMonthPrefix(today);

  const todaysBlocks = scheduleBlocks
    .filter((b) => b.day === todayWd)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const completedTodayCount = todaysBlocks.filter((b) => b.completed).length;

  const openTasks = tasks.filter((t) => !t.completed);
  const dueTodayOrOverdue = openTasks
    .filter((t) => t.dueDate <= todayISO)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const prioritizedOpenTasks = [...openTasks]
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      const pWeight = { High: 0, Medium: 1, Low: 2 };
      return pWeight[a.priority] - pWeight[b.priority];
    })
    .slice(0, 6);

  const monthExpenses = transactions
    .filter((tx) => tx.type === "expense" && tx.date.startsWith(monthPrefix))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthIncome = transactions
    .filter((tx) => tx.type === "income" && tx.date.startsWith(monthPrefix))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const remainingBudget = budgetLimits.monthlyCap - monthExpenses;
  const daysLeft = getDaysRemainingInMonth(today);
  const safeDailySpend = Math.max(0, remainingBudget / daysLeft);

  const handleQuickTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    onQuickAddTask(quickTaskTitle.trim());
    setQuickTaskTitle("");
  };

  const firstName = profile?.name?.trim().split(/\s+/)[0] || "Student";
  const academicMeta = [profile?.semester?.trim(), profile?.level?.trim(), profile?.gmail?.trim()]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      {/* Student Profile Header */}
      <section className="bg-white border border-violet-200/80 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-slate-900 truncate">
            Welcome, {firstName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {academicMeta || "Set your semester, academic level, and Gmail."}
          </p>
        </div>
        <button
          type="button"
          onClick={onEditProfile}
          className="px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50/50 text-xs font-medium text-violet-800 hover:bg-violet-100/70 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          Edit Student Info
        </button>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-violet-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Next Class</div>
          {nextClass ? (
            <>
              <div className="mt-2 font-display text-xl font-semibold text-slate-900 truncate">
                {nextClass.cls.code}
              </div>
              <div className="mt-1 font-mono text-xs font-medium text-violet-700 tabular-nums">
                {nextClass.countdownText}
              </div>
              <div className="mt-2 text-xs text-slate-500 truncate">
                {nextClass.cls.title} · {nextClass.cls.location}
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 font-display text-xl font-semibold text-slate-900">
                None Scheduled
              </div>
              <button
                type="button"
                onClick={() => onNavigate("classes")}
                className="mt-2 text-xs font-medium text-violet-700 hover:text-violet-900"
              >
                Add your classes →
              </button>
            </>
          )}
        </div>

        <div className="bg-white border border-violet-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Today&apos;s Schedule
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {completedTodayCount} / {todaysBlocks.length}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Blocks completed on {todayWd}
          </div>
          <button
            type="button"
            onClick={() => onNavigate("schedule")}
            className="mt-2 text-xs font-medium text-violet-700 hover:text-violet-900"
          >
            Generate from activities →
          </button>
        </div>

        <div className="bg-white border border-violet-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Everything To-Do
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {openTasks.length}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {dueTodayOrOverdue.length > 0 ? (
              <span className="text-amber-700 font-medium">
                {dueTodayOrOverdue.length} due today or overdue
              </span>
            ) : (
              "No overdue deadlines"
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate("tasks")}
            className="mt-2 text-xs font-medium text-violet-700 hover:text-violet-900"
          >
            Open To-Do Hub →
          </button>
        </div>

        <div className="bg-white border border-violet-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Budget Remaining
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
              remainingBudget < 0 ? "text-red-600" : "text-slate-900"
            }`}
          >
            {formatCurrency(remainingBudget)}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            Safe daily spend: {formatCurrency(safeDailySpend)}/day
          </div>
          <div className="mt-2 text-xs text-slate-500 tabular-nums">
            Spent {formatCurrency(monthExpenses)} · Income {formatCurrency(monthIncome)}
          </div>
        </div>
      </section>

      {/* Active Alerts Strip (only shown when real reminders are active) */}
      {activeAlerts.length > 0 && (
        <section className="bg-white border border-amber-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-amber-700">
              Upcoming Reminder · {activeAlerts[0].type}
            </div>
            <div className="text-sm font-medium text-slate-900">
              {activeAlerts[0].title}
            </div>
            <div className="text-xs text-slate-600">
              {activeAlerts[0].subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(activeAlerts[0].targetTab)}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900 whitespace-nowrap shrink-0"
          >
            <span>View Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>
      )}

      {/* Visual Financial Comparison Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <CategorySpendingChart
          transactions={transactions}
          onNavigateToMoney={() => onNavigate("money")}
        />
        <WeeklySpendingChart
          transactions={transactions}
          budgetLimits={budgetLimits}
          onNavigateToMoney={() => onNavigate("money")}
        />
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Today's Schedule Timeline */}
        <section className="lg:col-span-7 bg-white border border-violet-200/80 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-100 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Today&apos;s Timeline
              </h2>
              <p className="text-xs text-slate-500">
                Classes, study sessions, and scheduled activities for {todayWd}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("schedule")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 text-xs font-medium text-violet-800 hover:bg-violet-50 whitespace-nowrap shrink-0"
            >
              <CalendarClock className="h-3.5 w-3.5 text-violet-600" />
              <span>AI Schedule Builder</span>
            </button>
          </div>

          {todaysBlocks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-800">
                Nothing scheduled for {todayWd} yet
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Give Termflow your activities and let it build a conflict-free
                day around your classes and deadlines.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("schedule")}
                className="mt-4 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700"
              >
                Generate Today&apos;s Schedule
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {todaysBlocks.map((block) => (
                <div
                  key={block.id}
                  className={`px-5 py-3.5 flex items-start gap-4 transition-colors ${
                    block.completed ? "bg-slate-50/70" : "hover:bg-violet-50/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleBlockComplete(block.id)}
                    aria-label={`Mark ${block.title} complete`}
                    className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      block.completed
                        ? "bg-violet-600 border-violet-600 text-white"
                        : "border-slate-300 bg-white hover:border-violet-500"
                    }`}
                  >
                    {block.completed && <Check className="h-3.5 w-3.5" />}
                  </button>

                  <div className="w-32 shrink-0 font-mono text-xs text-slate-600 tabular-nums pt-0.5">
                    {formatTime12h(block.startTime)} –{" "}
                    {formatTime12h(block.endTime)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-sm font-medium ${
                        block.completed
                          ? "line-through text-slate-400"
                          : "text-slate-900"
                      }`}
                    >
                      {block.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="capitalize font-medium text-slate-600">
                        {block.category}
                      </span>
                      {block.location && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{block.location}</span>
                        </>
                      )}
                      {block.notes && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{block.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: Everything To-Do + Money Snapshot */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tasks Card */}
          <section className="bg-white border border-violet-200/80 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Things To Do
                </h2>
                <p className="text-xs text-slate-500">
                  Next deadlines and errands
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("tasks")}
                className="text-xs font-medium text-violet-700 hover:text-violet-900 whitespace-nowrap"
              >
                View All ({openTasks.length})
              </button>
            </div>

            <form
              onSubmit={handleQuickTaskSubmit}
              className="px-5 py-3 border-b border-violet-100 bg-violet-50/40 flex items-center gap-2"
            >
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="Quick add something you have to do..."
                className="flex-1 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
              <button
                type="submit"
                aria-label="Add task"
                className="px-3 py-1.5 rounded-lg bg-violet-700 text-white text-xs font-medium hover:bg-violet-800 flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </form>

            {prioritizedOpenTasks.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500">
                No open tasks right now. Add anything you need to remember above.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {prioritizedOpenTasks.map((task) => {
                  const isOverdue = task.dueDate < todayISO;
                  return (
                    <div
                      key={task.id}
                      className="px-5 py-3 flex items-start gap-3 hover:bg-violet-50/30"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleTaskComplete(task.id)}
                        aria-label={`Complete ${task.title}`}
                        className="mt-0.5 h-4 w-4 rounded border border-slate-300 bg-white hover:border-violet-600 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {task.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5 tabular-nums">
                          <span
                            className={
                              isOverdue
                                ? "text-red-600 font-medium"
                                : task.dueDate === todayISO
                                ? "text-amber-700 font-medium"
                                : ""
                            }
                          >
                            {isOverdue
                              ? `Overdue (${formatFriendlyDate(task.dueDate)})`
                              : formatFriendlyDate(task.dueDate)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              task.priority === "High"
                                ? "text-red-600 font-medium"
                                : ""
                            }
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Money Snapshot */}
          <section className="bg-white border border-violet-200/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Monthly Spending Pace
                </h2>
                <p className="text-xs text-slate-500 tabular-nums">
                  {formatCurrency(monthExpenses)} of{" "}
                  {formatCurrency(budgetLimits.monthlyCap)} monthly limit
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("money")}
                className="text-xs font-medium text-violet-700 hover:text-violet-900 whitespace-nowrap"
              >
                Manage Money
              </button>
            </div>

            {(() => {
              const pct =
                budgetLimits.monthlyCap > 0
                  ? Math.min(100, (monthExpenses / budgetLimits.monthlyCap) * 100)
                  : 0;
              const statusText =
                monthExpenses > budgetLimits.monthlyCap
                  ? "Over budget"
                  : pct >= 85
                  ? "Approaching limit"
                  : "On track";
              const barColor =
                monthExpenses > budgetLimits.monthlyCap
                  ? "bg-red-600"
                  : pct >= 85
                  ? "bg-amber-500"
                  : "bg-green-600";

              return (
                <div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600 tabular-nums">
                    <span>{statusText}</span>
                    <span className="font-mono">{pct.toFixed(0)}% used</span>
                  </div>
                </div>
              );
            })()}
          </section>
        </div>
      </div>
    </div>
  );
}
