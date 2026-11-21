import { useMemo, useState } from "react";
import { Check, Minus, Pencil, Plus, Target, Trash2 } from "lucide-react";
import type { AcademicGoal, StudentClass } from "../types";
import { formatFriendlyDate } from "../utils/dateUtils";

interface AcademicGoalsSectionProps {
  goals: AcademicGoal[];
  classes: StudentClass[];
  onAddGoal: (goal: Omit<AcademicGoal, "id">) => void;
  onUpdateGoalProgress: (
    id: string,
    nextValue: number,
    explicitCompleted?: boolean
  ) => void;
  onUpdateGoal: (goal: AcademicGoal) => void;
  onDeleteGoal: (id: string) => void;
}

const UNIT_PRESETS = ["%", "chapters", "labs", "assignments", "hours", "credits"];

export function AcademicGoalsSection({
  goals,
  classes,
  onAddGoal,
  onUpdateGoalProgress,
  onUpdateGoal,
  onDeleteGoal,
}: AcademicGoalsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [description, setDescription] = useState("");
  const [currentValue, setCurrentValue] = useState("0");
  const [targetValue, setTargetValue] = useState("100");
  const [unit, setUnit] = useState("%");
  const [targetDate, setTargetDate] = useState("");

  const stats = useMemo(() => {
    if (goals.length === 0) {
      return { completedCount: 0, avgPercent: 0 };
    }
    const completedCount = goals.filter((g) => g.completed).length;
    const sumPct = goals.reduce((sum, g) => {
      const pct =
        g.targetValue > 0
          ? Math.min(100, Math.max(0, (g.currentValue / g.targetValue) * 100))
          : g.completed
          ? 100
          : 0;
      return sum + pct;
    }, 0);
    return {
      completedCount,
      avgPercent: Math.round(sumPct / goals.length),
    };
  }, [goals]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setCourseCode("");
    setDescription("");
    setCurrentValue("0");
    setTargetValue("100");
    setUnit("%");
    setTargetDate("");
  };

  const startEdit = (goal: AcademicGoal) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setCourseCode(goal.courseCode || "");
    setDescription(goal.description || "");
    setCurrentValue(String(goal.currentValue));
    setTargetValue(String(goal.targetValue));
    setUnit(goal.unit);
    setTargetDate(goal.targetDate || "");
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const parsedTarget = Math.max(1, Number(targetValue) || 100);
    const parsedCurrent = Math.max(0, Number(currentValue) || 0);
    const cleanUnit = unit.trim() || "%";

    if (editingId) {
      onUpdateGoal({
        id: editingId,
        title: title.trim(),
        courseCode: courseCode.trim() || undefined,
        description: description.trim() || undefined,
        currentValue: parsedCurrent,
        targetValue: parsedTarget,
        unit: cleanUnit,
        targetDate: targetDate.trim() || undefined,
        completed: parsedCurrent >= parsedTarget,
      });
    } else {
      onAddGoal({
        title: title.trim(),
        courseCode: courseCode.trim() || undefined,
        description: description.trim() || undefined,
        currentValue: parsedCurrent,
        targetValue: parsedTarget,
        unit: cleanUnit,
        targetDate: targetDate.trim() || undefined,
        completed: parsedCurrent >= parsedTarget,
      });
    }

    resetForm();
    setShowForm(false);
  };

  const getStepSize = (goal: AcademicGoal) => {
    if (goal.unit === "%" || goal.targetValue >= 50) return 5;
    return 1;
  };

  return (
    <section className="bg-white border border-purple-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-purple-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-700" />
            <h2 className="font-display text-base font-semibold text-purple-950">
              Academic Goals
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
            {goals.length === 0
              ? "Set long-term semester targets and track your steady progress"
              : `${stats.completedCount} of ${goals.length} completed · ${stats.avgPercent}% average progress`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
              setShowForm(false);
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-medium hover:bg-purple-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{showForm ? "Close Form" : "New Goal"}</span>
        </button>
      </div>

      {/* Add / Edit Goal Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 border-b border-purple-100 bg-purple-50/60 space-y-4"
        >
          <div className="text-xs font-semibold text-purple-900">
            {editingId ? "Edit Academic Goal" : "Set a Long-Term Semester Goal"}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Goal Title
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Complete all 12 CSC 301 programming labs"
                className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Course (Optional)
              </label>
              {classes.length > 0 ? (
                <select
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="">General / All Courses</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.code}>
                      {cls.code}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  maxLength={32}
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g., CSC 301"
                  className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              )}
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Date (Optional)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Current Progress
              </label>
              <input
                type="number"
                min={0}
                max={100000}
                step="any"
                required
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Amount
              </label>
              <input
                type="number"
                min={1}
                max={100000}
                step="any"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Unit
              </label>
              <input
                type="text"
                required
                maxLength={32}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, chapters, labs..."
                className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="sm:col-span-3 flex flex-wrap gap-1">
              {UNIT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setUnit(preset);
                    if (preset === "%" && Number(targetValue) !== 100) {
                      setTargetValue("100");
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    unit === preset
                      ? "bg-purple-700 border-purple-700 text-white"
                      : "bg-white border-purple-200 text-purple-800 hover:bg-purple-50"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Milestone Notes (Optional)
            </label>
            <input
              type="text"
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Finish 1 lab every Friday before exams start"
              className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-purple-700 text-white rounded-lg hover:bg-purple-800"
            >
              {editingId ? "Update Goal" : "Save Goal"}
            </button>
          </div>
        </form>
      )}

      {/* Goals List / Empty State */}
      {goals.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-800">
            No academic goals added yet
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Add your long-term semester goals — like hitting a target GPA,
            finishing course readings, or completing capstone milestones — and
            track progress with live progress bars.
          </p>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-purple-700 text-white text-xs font-medium hover:bg-purple-800 transition-colors"
            >
              Set First Academic Goal
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-purple-100">
          {goals.map((goal) => {
            const rawPct =
              goal.targetValue > 0
                ? (goal.currentValue / goal.targetValue) * 100
                : goal.completed
                ? 100
                : 0;
            const pct = Math.min(100, Math.max(0, Math.round(rawPct)));
            const step = getStepSize(goal);
            const isComplete = goal.completed || pct >= 100;

            return (
              <div
                key={goal.id}
                className={`px-5 py-4 space-y-2.5 transition-colors ${
                  isComplete ? "bg-purple-50/40" : "hover:bg-purple-50/25"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateGoalProgress(
                            goal.id,
                            isComplete ? 0 : goal.targetValue,
                            !isComplete
                          )
                        }
                        aria-label={`Mark ${goal.title} as ${
                          isComplete ? "in progress" : "completed"
                        }`}
                        className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isComplete
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-purple-300 bg-white hover:border-purple-600"
                        }`}
                      >
                        {isComplete && <Check className="h-3.5 w-3.5" />}
                      </button>

                      <h3
                        className={`text-sm font-semibold truncate ${
                          isComplete
                            ? "line-through text-slate-500"
                            : "text-slate-900"
                        }`}
                      >
                        {goal.title}
                      </h3>
                    </div>

                    <div className="mt-1 pl-7 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 tabular-nums">
                      {goal.courseCode && (
                        <>
                          <span className="font-mono font-medium text-purple-700">
                            {goal.courseCode}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span className="font-mono text-slate-700">
                        {goal.currentValue} / {goal.targetValue}{" "}
                        {goal.unit === "%" ? "%" : goal.unit}
                      </span>
                      {goal.targetDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Target {formatFriendlyDate(goal.targetDate)}</span>
                        </>
                      )}
                      {goal.description && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-600">{goal.description}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Actions & Progress Readout */}
                  <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
                    <div className="flex items-center border border-purple-200 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateGoalProgress(
                            goal.id,
                            Math.max(0, goal.currentValue - step)
                          )
                        }
                        aria-label={`Decrease progress for ${goal.title}`}
                        className="px-2 py-1 text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-2.5 py-1 text-xs font-mono font-semibold text-purple-900 border-x border-purple-100 tabular-nums">
                        {pct}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateGoalProgress(
                            goal.id,
                            Math.min(goal.targetValue, goal.currentValue + step)
                          )
                        }
                        aria-label={`Increase progress for ${goal.title}`}
                        className="px-2 py-1 text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => startEdit(goal)}
                      aria-label={`Edit ${goal.title}`}
                      className="p-1.5 text-slate-400 hover:text-purple-700 rounded-md"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(goal.id)}
                      aria-label={`Delete ${goal.title}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pl-7">
                  <div
                    className="h-2.5 w-full bg-purple-100 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${goal.title} progress`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isComplete ? "bg-emerald-600" : "bg-purple-600"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
