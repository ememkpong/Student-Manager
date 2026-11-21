import { useState } from "react";
import { X } from "lucide-react";
import { BUDGET_CATEGORIES } from "../data/defaultData";
import type {
  ActivityRequest,
  BlockCategory,
  BudgetCategoryName,
  StudentClass,
  TaskCategory,
  TaskPriority,
  TodoTask,
  Transaction,
  Weekday,
} from "../types";
import { formatISODate, WEEKDAYS } from "../utils/dateUtils";

type QuickAddKind = "task" | "money" | "class" | "activity";

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  classes: StudentClass[];
  onAddTask: (task: Omit<TodoTask, "id" | "createdAt" | "completed">) => void;
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
  onAddClass: (cls: Omit<StudentClass, "id">) => void;
  onAddActivity: (act: Omit<ActivityRequest, "id">) => void;
}

export function QuickAddModal({
  open,
  onClose,
  classes,
  onAddTask,
  onAddTransaction,
  onAddClass,
  onAddActivity,
}: QuickAddModalProps) {
  const [kind, setKind] = useState<QuickAddKind>("task");

  // Task fields
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState<TaskCategory>("Academic");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("Medium");
  const [taskDueDate, setTaskDueDate] = useState(() => formatISODate(new Date()));
  const [taskDueTime, setTaskDueTime] = useState("17:00");
  const [taskEstMin, setTaskEstMin] = useState(45);
  const [taskCourse, setTaskCourse] = useState("");

  // Money fields
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [txCategory, setTxCategory] = useState<BudgetCategoryName>("Dining & Groceries");
  const [txDate, setTxDate] = useState(() => formatISODate(new Date()));

  // Class fields
  const [clsCode, setClsCode] = useState("");
  const [clsTitle, setClsTitle] = useState("");
  const [clsDays, setClsDays] = useState<Weekday[]>(["Mon", "Wed"]);
  const [clsStart, setClsStart] = useState("09:00");
  const [clsEnd, setClsEnd] = useState("10:15");
  const [clsLocation, setClsLocation] = useState("");
  const [clsRemind, setClsRemind] = useState(15);

  // Activity fields
  const [actTitle, setActTitle] = useState("");
  const [actDuration, setActDuration] = useState(60);
  const [actFrequency, setActFrequency] = useState("3x per week");
  const [actWindow, setActWindow] = useState<ActivityRequest["preferredWindow"]>("Afternoon");
  const [actCategory, setActCategory] = useState<BlockCategory>("activity");

  if (!open) return null;

  const toggleDay = (day: Weekday) => {
    setClsDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kind === "task") {
      if (!taskTitle.trim()) return;
      onAddTask({
        title: taskTitle.trim(),
        category: taskCategory,
        priority: taskPriority,
        dueDate: taskDueDate,
        dueTime: taskDueTime,
        estimatedMinutes: Number(taskEstMin) || 30,
        courseCode: taskCourse || undefined,
        remindBeforeMinutes: 30,
      });
      setTaskTitle("");
      onClose();
    } else if (kind === "money") {
      const amt = parseFloat(txAmount);
      if (!txTitle.trim() || Number.isNaN(amt) || amt <= 0) return;
      onAddTransaction({
        title: txTitle.trim(),
        amount: amt,
        type: txType,
        category: txType === "income" ? "Income" : txCategory,
        date: txDate,
      });
      setTxTitle("");
      setTxAmount("");
      onClose();
    } else if (kind === "class") {
      if (!clsCode.trim() || !clsTitle.trim() || clsDays.length === 0) return;
      onAddClass({
        code: clsCode.trim().toUpperCase(),
        title: clsTitle.trim(),
        days: clsDays,
        startTime: clsStart,
        endTime: clsEnd,
        location: clsLocation.trim() || "TBA",
        instructor: "",
        remindMinutesBefore: clsRemind,
        remindersEnabled: true,
      });
      setClsCode("");
      setClsTitle("");
      setClsLocation("");
      onClose();
    } else if (kind === "activity") {
      if (!actTitle.trim()) return;
      onAddActivity({
        title: actTitle.trim(),
        durationMinutes: Number(actDuration) || 60,
        frequency: actFrequency.trim() || "Once",
        preferredWindow: actWindow,
        category: actCategory,
      });
      setActTitle("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Quick Add
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented Type Selector */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: "task", label: "To-Do" },
                { id: "money", label: "Money" },
                { id: "class", label: "Class" },
                { id: "activity", label: "Activity" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setKind(item.id)}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  kind === item.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {kind === "task" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  What do you have to do?
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Finish Physics Lab Report"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Errand">Errand</option>
                    <option value="Finance">Finance</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Due Time
                  </label>
                  <input
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Est. Minutes
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={taskEstMin}
                    onChange={(e) => setTaskEstMin(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              {classes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Linked Class (Optional)
                  </label>
                  <select
                    value={taskCourse}
                    onChange={(e) => setTaskCourse(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">None</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {kind === "money" && (
            <>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTxType("expense")}
                  className={`py-1.5 text-xs font-medium rounded-md ${
                    txType === "expense"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("income")}
                  className={`py-1.5 text-xs font-medium rounded-md ${
                    txType === "income"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Income / Deposit
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  placeholder="e.g., Campus Dining Lunch"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount (NGN ₦)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-500">
                      ₦
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="2500"
                      className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              {txType === "expense" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={txCategory}
                    onChange={(e) =>
                      setTxCategory(e.target.value as BudgetCategoryName)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {BUDGET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {kind === "class" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    required
                    value={clsCode}
                    onChange={(e) => setClsCode(e.target.value)}
                    placeholder="MATH 240"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    value={clsTitle}
                    onChange={(e) => setClsTitle(e.target.value)}
                    placeholder="Linear Algebra"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Class Days
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const selected = clsDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                          selected
                            ? "bg-violet-600 text-white border-violet-600"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={clsStart}
                    onChange={(e) => setClsStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={clsEnd}
                    onChange={(e) => setClsEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Remind Before
                  </label>
                  <select
                    value={clsRemind}
                    onChange={(e) => setClsRemind(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Room / Location
                </label>
                <input
                  type="text"
                  value={clsLocation}
                  onChange={(e) => setClsLocation(e.target.value)}
                  placeholder="Science Hall 302"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </>
          )}

          {kind === "activity" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  required
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="e.g., Swimming at Rec Pool"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={actDuration}
                    onChange={(e) => setActDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={actFrequency}
                    onChange={(e) => setActFrequency(e.target.value)}
                    placeholder="e.g., 2x per week"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preferred Window
                  </label>
                  <select
                    value={actWindow}
                    onChange={(e) =>
                      setActWindow(
                        e.target.value as ActivityRequest["preferredWindow"]
                      )
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Anytime">Anytime</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={actCategory}
                    onChange={(e) =>
                      setActCategory(e.target.value as BlockCategory)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="activity">Activity</option>
                    <option value="study">Study</option>
                    <option value="wellness">Wellness / Gym</option>
                    <option value="work">Part-Time Work</option>
                    <option value="errand">Errand</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              Save {kind === "task" ? "Task" : kind === "money" ? "Entry" : kind === "class" ? "Class" : "Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
