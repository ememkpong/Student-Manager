import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarPlus,
  Check,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  StudentClass,
  TaskCategory,
  TaskPriority,
  TodoTask,
} from "../types";
import {
  formatFriendlyDate,
  formatISODate,
  formatTime12h,
} from "../utils/dateUtils";

interface TasksViewProps {
  tasks: TodoTask[];
  classes: StudentClass[];
  onAddTask: (task: Omit<TodoTask, "id" | "createdAt" | "completed">) => void;
  onAddMultipleTasks: (
    tasks: Omit<TodoTask, "id" | "createdAt" | "completed">[]
  ) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onScheduleTask: (task: TodoTask) => void;
}

type TaskFilter = "open" | "today" | "upcoming" | "overdue" | "completed";

export function TasksView({
  tasks,
  classes,
  onAddTask,
  onAddMultipleTasks,
  onToggleTask,
  onDeleteTask,
  onScheduleTask,
}: TasksViewProps) {
  const todayISO = formatISODate(new Date());

  const [filter, setFilter] = useState<TaskFilter>("open");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Add State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("Academic");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [dueDate, setDueDate] = useState(todayISO);
  const [dueTime, setDueTime] = useState("17:00");
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [courseCode, setCourseCode] = useState("");

  // Smart Brain Dump State
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [brainDumpText, setBrainDumpText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const open = tasks.filter((t) => !t.completed);
    return {
      open: open.length,
      today: open.filter((t) => t.dueDate === todayISO).length,
      upcoming: open.filter((t) => t.dueDate > todayISO).length,
      overdue: open.filter((t) => t.dueDate < todayISO).length,
      completed: tasks.filter((t) => t.completed).length,
    };
  }, [tasks, todayISO]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (filter === "open" && t.completed) return false;
        if (filter === "today" && (t.completed || t.dueDate !== todayISO))
          return false;
        if (filter === "upcoming" && (t.completed || t.dueDate <= todayISO))
          return false;
        if (filter === "overdue" && (t.completed || t.dueDate >= todayISO))
          return false;
        if (filter === "completed" && !t.completed) return false;

        if (categoryFilter !== "All" && t.category !== categoryFilter)
          return false;

        if (
          q &&
          !t.title.toLowerCase().includes(q) &&
          !(t.courseCode || "").toLowerCase().includes(q) &&
          !(t.notes || "").toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        const weight = { High: 0, Medium: 1, Low: 2 };
        return weight[a.priority] - weight[b.priority];
      });
  }, [tasks, filter, categoryFilter, searchQuery, todayISO]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask({
      title: title.trim(),
      category,
      priority,
      dueDate,
      dueTime,
      estimatedMinutes: Number(estimatedMinutes) || 30,
      courseCode: courseCode || undefined,
      remindBeforeMinutes: 30,
    });
    setTitle("");
  };

  const handleBrainDumpParse = async () => {
    if (!brainDumpText.trim()) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const response = await fetch("/api/tasks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: brainDumpText,
          todayDate: todayISO,
          classes: classes.map((c) => ({ code: c.code, title: c.title })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not parse notes.");
      }

      const parsed = (data.tasks || []).map(
        (item: {
          title: string;
          category?: TaskCategory;
          priority?: TaskPriority;
          dueDate?: string;
          dueTime?: string;
          estimatedMinutes?: number;
          courseCode?: string;
          notes?: string;
        }) => ({
          title: item.title,
          category: item.category || "Personal",
          priority: item.priority || "Medium",
          dueDate: item.dueDate || todayISO,
          dueTime: item.dueTime || "18:00",
          estimatedMinutes: Number(item.estimatedMinutes) || 30,
          courseCode: item.courseCode || undefined,
          notes: item.notes || undefined,
          remindBeforeMinutes: 30,
        })
      );

      if (parsed.length > 0) {
        onAddMultipleTasks(parsed);
        setBrainDumpText("");
        setShowBrainDump(false);
      }
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to organize notes."
      );
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Task & Brain Dump Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Everything You Have To Do
            </h2>
            <p className="text-xs text-slate-500">
              Assignments, exams, errands, and reminders in one organized queue
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBrainDump((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
              showBrainDump
                ? "border-violet-600 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
            <span>Organize Brain Dump</span>
          </button>
        </div>

        {showBrainDump && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              Paste everything on your mind (assignments, errands, bills,
              appointments)
            </label>
            <textarea
              rows={3}
              value={brainDumpText}
              onChange={(e) => setBrainDumpText(e.target.value)}
              placeholder="e.g. Finish CS 301 lab by tomorrow 6pm takes 90 min, buy groceries and laundry detergent tonight, email Dr. Cole about Econ paper Friday..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
            {parseError && (
              <div className="flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBrainDump(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isParsing || !brainDumpText.trim()}
                onClick={handleBrainDumpParse}
                className="px-4 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-60"
              >
                {isParsing ? "Organizing..." : "Convert Into Tasks"}
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={handleAddSubmit}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-1"
        >
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Study for Biology Midterm"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="Academic">Academic</option>
              <option value="Errand">Errand</option>
              <option value="Finance">Finance</option>
              <option value="Personal">Personal</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="High">High</option>
              <option value="Medium">Med</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Mins
            </label>
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            {classes.length > 0 && (
              <select
                aria-label="Course"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-24 px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Course</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </form>
      </section>

      {/* Filter Toolbar & Task List */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(
              [
                { id: "open", label: `Open (${counts.open})` },
                { id: "today", label: `Today (${counts.today})` },
                { id: "upcoming", label: `Upcoming (${counts.upcoming})` },
                { id: "overdue", label: `Overdue (${counts.overdue})` },
                { id: "completed", label: `Done (${counts.completed})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap tabular-nums ${
                  filter === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Categories</option>
              <option value="Academic">Academic</option>
              <option value="Errand">Errand</option>
              <option value="Finance">Finance</option>
              <option value="Personal">Personal</option>
            </select>

            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-800">
              No tasks match this view
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Add a task above or switch filters to review completed or upcoming
              items.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredTasks.map((task) => {
              const isOverdue = !task.completed && task.dueDate < todayISO;
              return (
                <div
                  key={task.id}
                  className={`px-5 py-3.5 flex items-start justify-between gap-4 transition-colors ${
                    task.completed ? "bg-slate-50/60" : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      aria-label={`Mark ${task.title} as ${
                        task.completed ? "incomplete" : "complete"
                      }`}
                      className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        task.completed
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "border-slate-300 bg-white hover:border-violet-600"
                      }`}
                    >
                      {task.completed && <Check className="h-3.5 w-3.5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-medium ${
                          task.completed
                            ? "line-through text-slate-400"
                            : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 tabular-nums">
                        {task.courseCode && (
                          <>
                            <span className="font-mono font-medium text-violet-700">
                              {task.courseCode}
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            isOverdue
                              ? "text-red-600 font-semibold"
                              : task.dueDate === todayISO && !task.completed
                              ? "text-amber-700 font-medium"
                              : ""
                          }
                        >
                          {isOverdue
                            ? `Overdue (${formatFriendlyDate(task.dueDate)})`
                            : `Due ${formatFriendlyDate(task.dueDate)}`}
                          {task.dueTime ? ` at ${formatTime12h(task.dueTime)}` : ""}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{task.estimatedMinutes} min</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            task.priority === "High"
                              ? "text-red-600 font-medium"
                              : task.priority === "Medium"
                              ? "text-amber-700 font-medium"
                              : "text-slate-500"
                          }
                        >
                          {task.priority} Priority
                        </span>
                      </div>
                      {task.notes && (
                        <p className="mt-1 text-xs text-slate-500">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!task.completed && (
                      <button
                        type="button"
                        onClick={() => onScheduleTask(task)}
                        title="Add this task to today's schedule"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      >
                        <CalendarPlus className="h-3.5 w-3.5 text-violet-600" />
                        <span className="hidden sm:inline">Schedule</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={`Delete ${task.title}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
