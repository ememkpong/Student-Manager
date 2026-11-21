import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  ActivityRequest,
  BlockCategory,
  ScheduleBlock,
  SchedulePreferences,
  StudentClass,
  TodoTask,
  Weekday,
} from "../types";
import {
  formatISODate,
  formatTime12h,
  FULL_WEEKDAY_NAMES,
  getCurrentWeekDates,
  getWeekdayFromDate,
  timeToMinutes,
  WEEKDAYS,
} from "../utils/dateUtils";

interface ScheduleViewProps {
  activitiesPrompt: string;
  onChangeActivitiesPrompt: (val: string) => void;
  activitiesList: ActivityRequest[];
  onAddActivity: (act: Omit<ActivityRequest, "id">) => void;
  onDeleteActivity: (id: string) => void;
  preferences: SchedulePreferences;
  onChangePreferences: (prefs: SchedulePreferences) => void;
  classes: StudentClass[];
  tasks: TodoTask[];
  scheduleBlocks: ScheduleBlock[];
  scheduleSummary: string;
  onApplyGeneratedSchedule: (blocks: ScheduleBlock[], summary: string) => void;
  onAddManualBlock: (block: Omit<ScheduleBlock, "id">) => void;
  onToggleBlockComplete: (id: string) => void;
  onDeleteBlock: (id: string) => void;
}

const CATEGORY_TEXT_COLORS: Record<BlockCategory, string> = {
  class: "text-violet-700",
  study: "text-indigo-700",
  activity: "text-slate-700",
  errand: "text-amber-700",
  wellness: "text-green-700",
  work: "text-cyan-700",
  break: "text-slate-500",
};

export function ScheduleView({
  activitiesPrompt,
  onChangeActivitiesPrompt,
  activitiesList,
  onAddActivity,
  onDeleteActivity,
  preferences,
  onChangePreferences,
  classes,
  tasks,
  scheduleBlocks,
  scheduleSummary,
  onApplyGeneratedSchedule,
  onAddManualBlock,
  onToggleBlockComplete,
  onDeleteBlock,
}: ScheduleViewProps) {
  const today = new Date();
  const todayWd = getWeekdayFromDate(today);
  const weekDates = useMemo(() => getCurrentWeekDates(today), []);

  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [selectedDay, setSelectedDay] = useState<Weekday>(todayWd);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Activity Form
  const [showActForm, setShowActForm] = useState(false);
  const [actTitle, setActTitle] = useState("");
  const [actDuration, setActDuration] = useState(60);
  const [actFrequency, setActFrequency] = useState("3x per week");
  const [actWindow, setActWindow] =
    useState<ActivityRequest["preferredWindow"]>("Afternoon");
  const [actCategory, setActCategory] = useState<BlockCategory>("activity");

  // Manual Block Form
  const [showManualForm, setShowManualForm] = useState(false);
  const [blkTitle, setBlkTitle] = useState("");
  const [blkDay, setBlkDay] = useState<Weekday>(todayWd);
  const [blkStart, setBlkStart] = useState("15:00");
  const [blkEnd, setBlkEnd] = useState("16:00");
  const [blkCategory, setBlkCategory] = useState<BlockCategory>("study");
  const [blkLocation, setBlkLocation] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const openTasks = preferences.includeTasks
        ? tasks
            .filter((t) => !t.completed)
            .map((t) => ({
              id: t.id,
              title: t.title,
              dueDate: t.dueDate,
              dueTime: t.dueTime,
              priority: t.priority,
              estimatedMinutes: t.estimatedMinutes,
              courseCode: t.courseCode || "",
            }))
        : [];

      const fixedClasses = preferences.includeClasses
        ? classes.map((c) => ({
            id: c.id,
            code: c.code,
            title: c.title,
            days: c.days,
            startTime: c.startTime,
            endTime: c.endTime,
            location: c.location,
          }))
        : [];

      const response = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activitiesText: activitiesPrompt,
          activitiesList,
          classes: fixedClasses,
          tasks: openTasks,
          preferences: {
            ...preferences,
            targetDay: selectedDay,
            targetDate: formatISODate(today),
            weekDates: WEEKDAYS.map((wd) => ({ day: wd, date: weekDates[wd] })),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate schedule.");
      }

      const generatedBlocks: ScheduleBlock[] = (data.blocks || []).map(
        (b: Omit<ScheduleBlock, "id">, idx: number) => ({
          ...b,
          id: `gen-${Date.now()}-${idx}`,
          completed: false,
        })
      );

      if (preferences.scope === "today") {
        const otherDays = scheduleBlocks.filter((b) => b.day !== selectedDay);
        const todayGenerated = generatedBlocks.map((b) => ({
          ...b,
          day: selectedDay,
        }));
        onApplyGeneratedSchedule(
          [...otherDays, ...todayGenerated],
          data.summary || "Generated schedule for today."
        );
      } else {
        onApplyGeneratedSchedule(
          generatedBlocks,
          data.summary || "Generated weekly schedule."
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not generate schedule."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;
    onAddActivity({
      title: actTitle.trim(),
      durationMinutes: Number(actDuration) || 60,
      frequency: actFrequency.trim() || "Once",
      preferredWindow: actWindow,
      category: actCategory,
    });
    setActTitle("");
    setShowActForm(false);
  };

  const handleAddManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blkTitle.trim()) return;
    onAddManualBlock({
      title: blkTitle.trim(),
      day: blkDay,
      startTime: blkStart,
      endTime: blkEnd,
      category: blkCategory,
      location: blkLocation.trim() || undefined,
      sourceType: "activity",
      completed: false,
    });
    setBlkTitle("");
    setBlkLocation("");
    setShowManualForm(false);
  };

  const dayBlocks = useMemo(
    () =>
      scheduleBlocks
        .filter((b) => b.day === selectedDay)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    [scheduleBlocks, selectedDay]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Activity Inputs & AI Generator Controls */}
      <section className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Activity Schedule Builder
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tell Termflow what activities you want to fit in, and it builds a
            conflict-free plan around your classes and tasks.
          </p>
        </div>

        {/* Natural-Language Activities Box */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Activities & Routines You Want Scheduled
          </label>
          <textarea
            rows={4}
            value={activitiesPrompt}
            onChange={(e) => onChangeActivitiesPrompt(e.target.value)}
            placeholder="e.g. Gym 1h 3x/week in the morning, Study Algorithms 90m daily, Campus work shift Thu 2-6pm, Grocery run 45m..."
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 resize-y"
          />
        </div>

        {/* Structured Activities List */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              Saved Activities ({activitiesList.length})
            </span>
            <button
              type="button"
              onClick={() => setShowActForm((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showActForm ? "Close" : "Add Activity"}</span>
            </button>
          </div>

          {showActForm && (
            <form
              onSubmit={handleAddActivitySubmit}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5"
            >
              <input
                type="text"
                required
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
                placeholder="Activity name (e.g., Piano practice)"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={actDuration}
                  onChange={(e) => setActDuration(Number(e.target.value))}
                  placeholder="Minutes"
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                />
                <input
                  type="text"
                  value={actFrequency}
                  onChange={(e) => setActFrequency(e.target.value)}
                  placeholder="Frequency"
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={actWindow}
                  onChange={(e) =>
                    setActWindow(
                      e.target.value as ActivityRequest["preferredWindow"]
                    )
                  }
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="Anytime">Anytime</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
                <select
                  value={actCategory}
                  onChange={(e) =>
                    setActCategory(e.target.value as BlockCategory)
                  }
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="activity">Activity</option>
                  <option value="study">Study</option>
                  <option value="wellness">Wellness</option>
                  <option value="work">Work</option>
                  <option value="errand">Errand</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800"
              >
                Save Activity
              </button>
            </form>
          )}

          {activitiesList.length > 0 && (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
              {activitiesList.map((act) => (
                <div
                  key={act.id}
                  className="px-3 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-900 truncate">
                      {act.title}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      {act.durationMinutes}m · {act.frequency} ·{" "}
                      {act.preferredWindow}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteActivity(act.id)}
                    aria-label={`Remove ${act.title}`}
                    className="p-1 text-slate-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduling Constraints */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Schedule Scope
              </label>
              <select
                value={preferences.scope}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    scope: e.target.value as "today" | "week",
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="week">Full Week (Mon–Sun)</option>
                <option value="today">Selected Day ({selectedDay})</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Break Buffer (min)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                step={5}
                value={preferences.breakMinutes}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    breakMinutes: Number(e.target.value),
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Day Starts
              </label>
              <input
                type="time"
                value={preferences.wakeTime}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    wakeTime: e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Day Ends
              </label>
              <input
                type="time"
                value={preferences.sleepTime}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    sleepTime: e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.includeClasses}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    includeClasses: e.target.checked,
                  })
                }
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-600"
              />
              <span>
                Lock fixed classes ({classes.length} enrolled)
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.includeTasks}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    includeTasks: e.target.checked,
                  })
                }
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-600"
              />
              <span>
                Auto-slot pending to-dos ({tasks.filter((t) => !t.completed).length} open)
              </span>
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerate}
          className="w-full py-2.5 px-4 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          <span>
            {isGenerating ? "Building Schedule..." : "Generate Schedule"}
          </span>
        </button>
      </section>

      {/* Right: Timetable Output & Interactive Controls */}
      <section className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  viewMode === "day"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Day View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  viewMode === "week"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Week Grid
              </button>
            </div>

            {viewMode === "day" && (
              <div className="flex items-center gap-1 overflow-x-auto">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      selectedDay === day
                        ? "bg-violet-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setBlkDay(selectedDay);
              setShowManualForm((v) => !v);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Time Block</span>
          </button>
        </div>

        {/* AI Rationale Summary */}
        {scheduleSummary && (
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900">Plan Notes: </span>
            {scheduleSummary}
          </div>
        )}

        {/* Manual Add Block Drawer */}
        {showManualForm && (
          <form
            onSubmit={handleAddManualSubmit}
            className="px-5 py-4 border-b border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Block Title
              </label>
              <input
                type="text"
                required
                value={blkTitle}
                onChange={(e) => setBlkTitle(e.target.value)}
                placeholder="Study or activity"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Day
              </label>
              <select
                value={blkDay}
                onChange={(e) => setBlkDay(e.target.value as Weekday)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Start
              </label>
              <input
                type="time"
                value={blkStart}
                onChange={(e) => setBlkStart(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                End
              </label>
              <input
                type="time"
                value={blkEnd}
                onChange={(e) => setBlkEnd(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={blkCategory}
                onChange={(e) =>
                  setBlkCategory(e.target.value as BlockCategory)
                }
                className="flex-1 px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="study">Study</option>
                <option value="activity">Activity</option>
                <option value="wellness">Wellness</option>
                <option value="work">Work</option>
                <option value="errand">Errand</option>
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Loading Skeleton */}
        {isGenerating ? (
          <div className="p-5 space-y-3" aria-busy="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-14 rounded-lg bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : viewMode === "day" ? (
          <div>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                {FULL_WEEKDAY_NAMES[selectedDay]} · {weekDates[selectedDay]}
              </span>
              <span className="font-mono tabular-nums">
                {dayBlocks.length} scheduled blocks
              </span>
            </div>

            {dayBlocks.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <CalendarClock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800">
                  No blocks scheduled on {FULL_WEEKDAY_NAMES[selectedDay]}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Click &ldquo;Generate Schedule&rdquo; on the left or add a
                  manual time block above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {dayBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={`px-5 py-4 flex items-start gap-4 transition-colors ${
                      block.completed ? "bg-slate-50/70" : "hover:bg-slate-50/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleBlockComplete(block.id)}
                      aria-label={`Toggle ${block.title}`}
                      className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                        block.completed
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "border-slate-300 bg-white hover:border-violet-600"
                      }`}
                    >
                      {block.completed && <Check className="h-3.5 w-3.5" />}
                    </button>

                    <div className="w-36 shrink-0 font-mono text-xs text-slate-700 tabular-nums pt-0.5">
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
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span
                          className={`font-medium capitalize ${
                            CATEGORY_TEXT_COLORS[block.category] ||
                            "text-slate-600"
                          }`}
                        >
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
                            <span>{block.notes}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteBlock(block.id)}
                      aria-label={`Delete ${block.title}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Weekly 7-Day Grid */
          <div className="overflow-x-auto">
            <div className="min-w-[840px] grid grid-cols-7 divide-x divide-slate-200">
              {WEEKDAYS.map((day) => {
                const blocksForDay = scheduleBlocks
                  .filter((b) => b.day === day)
                  .sort(
                    (a, b) =>
                      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
                  );
                const isToday = day === todayWd;

                return (
                  <div key={day} className="min-h-[420px] flex flex-col">
                    <div
                      className={`px-3 py-2.5 border-b border-slate-200 text-xs font-semibold flex items-center justify-between ${
                        isToday
                          ? "bg-violet-50/70 text-violet-700"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span>{day}</span>
                      <span className="font-mono font-normal text-slate-500 tabular-nums">
                        {weekDates[day].slice(5)}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200 flex-1">
                      {blocksForDay.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400">Open</div>
                      ) : (
                        blocksForDay.map((b) => (
                          <div
                            key={b.id}
                            className={`p-2.5 space-y-1 ${
                              b.completed ? "opacity-55 bg-slate-50" : ""
                            }`}
                          >
                            <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                              {b.startTime}–{b.endTime}
                            </div>
                            <div className="text-xs font-medium text-slate-900 leading-snug">
                              {b.title}
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span
                                className={`capitalize font-medium ${
                                  CATEGORY_TEXT_COLORS[b.category] ||
                                  "text-slate-600"
                                }`}
                              >
                                {b.category}
                              </span>
                              <button
                                type="button"
                                onClick={() => onToggleBlockComplete(b.id)}
                                className="text-slate-400 hover:text-violet-600"
                              >
                                {b.completed ? "Undo" : "Done"}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
