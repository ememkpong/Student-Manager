import { useMemo, useState } from "react";
import { Bell, BellOff, Pencil, Plus, Trash2 } from "lucide-react";
import type { StudentClass, Weekday } from "../types";
import type { NextClassInfo } from "../hooks/useReminders";
import {
  formatTime12h,
  getWeekdayFromDate,
  timeToMinutes,
  WEEKDAYS,
} from "../utils/dateUtils";

interface ClassesViewProps {
  classes: StudentClass[];
  nextClass: NextClassInfo | null;
  onAddClass: (cls: Omit<StudentClass, "id">) => void;
  onUpdateClass: (cls: StudentClass) => void;
  onDeleteClass: (id: string) => void;
  onToggleClassReminder: (id: string) => void;
}

export function ClassesView({
  classes,
  nextClass,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onToggleClassReminder,
}: ClassesViewProps) {
  const todayWd = getWeekdayFromDate(new Date());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<Weekday[]>(["Mon", "Wed", "Fri"]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:15");
  const [location, setLocation] = useState("");
  const [instructor, setInstructor] = useState("");
  const [remindMinutesBefore, setRemindMinutesBefore] = useState(15);

  const todaysClasses = useMemo(
    () =>
      classes
        .filter((c) => c.days.includes(todayWd))
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    [classes, todayWd]
  );

  const weeklyLectureHours = useMemo(() => {
    const totalMinutes = classes.reduce((sum, c) => {
      const dur = Math.max(0, timeToMinutes(c.endTime) - timeToMinutes(c.startTime));
      return sum + dur * c.days.length;
    }, 0);
    return (totalMinutes / 60).toFixed(1);
  }, [classes]);

  const activeRemindersCount = classes.filter((c) => c.remindersEnabled).length;

  const resetForm = () => {
    setEditingId(null);
    setCode("");
    setTitle("");
    setDays(["Mon", "Wed", "Fri"]);
    setStartTime("10:00");
    setEndTime("11:15");
    setLocation("");
    setInstructor("");
    setRemindMinutesBefore(15);
  };

  const startEdit = (cls: StudentClass) => {
    setEditingId(cls.id);
    setCode(cls.code);
    setTitle(cls.title);
    setDays(cls.days);
    setStartTime(cls.startTime);
    setEndTime(cls.endTime);
    setLocation(cls.location);
    setInstructor(cls.instructor);
    setRemindMinutesBefore(cls.remindMinutesBefore);
    setShowForm(true);
  };

  const toggleDay = (d: Weekday) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim() || days.length === 0) return;

    if (editingId) {
      const existing = classes.find((c) => c.id === editingId);
      onUpdateClass({
        id: editingId,
        code: code.trim().toUpperCase(),
        title: title.trim(),
        days,
        startTime,
        endTime,
        location: location.trim() || "TBA",
        instructor: instructor.trim(),
        remindMinutesBefore,
        remindersEnabled: existing ? existing.remindersEnabled : true,
      });
    } else {
      onAddClass({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        days,
        startTime,
        endTime,
        location: location.trim() || "TBA",
        instructor: instructor.trim(),
        remindMinutesBefore,
        remindersEnabled: true,
      });
    }

    resetForm();
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* 4-Column Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-medium text-purple-700">
            Enrolled Courses
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {classes.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {weeklyLectureHours} hrs/week in class
          </div>
        </div>

        <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-medium text-purple-700">
            Today&apos;s Sessions ({todayWd})
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {todaysClasses.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {todaysClasses.length > 0
              ? `First at ${formatTime12h(todaysClasses[0].startTime)}`
              : "No classes today"}
          </div>
        </div>

        <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-medium text-purple-700">
            Class Reminders
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {activeRemindersCount} / {classes.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Automatic pre-class alerts active
          </div>
        </div>

        <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-medium text-purple-700">Next Class</div>
          {nextClass ? (
            <>
              <div className="mt-2 font-display text-lg font-semibold text-slate-900 truncate">
                {nextClass.cls.code}
              </div>
              <div className="mt-1 font-mono text-xs text-purple-700 tabular-nums">
                {nextClass.countdownText}
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm text-slate-500">No upcoming class</div>
          )}
        </div>
      </section>

      {/* Today's Class Agenda */}
      <section className="bg-white border border-purple-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-purple-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-purple-950">
              Today&apos;s Classes ({todayWd})
            </h2>
            <p className="text-xs text-slate-500">
              Live check-in and pre-class reminder status
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm((v) => !v);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-700 text-white text-xs font-medium hover:bg-purple-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showForm ? "Close Form" : "Add Class"}</span>
          </button>
        </div>

        {/* Add / Edit Class Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="p-5 border-b border-purple-100 bg-purple-50/60 space-y-4"
          >
            <div className="text-xs font-semibold text-purple-950">
              {editingId ? "Edit Class Details" : "Register New Class"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="CS 301"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Data Structures & Algorithms"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reminder Lead
                </label>
                <select
                  value={remindMinutesBefore}
                  onChange={(e) =>
                    setRemindMinutesBefore(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  <option value={5}>5 min before</option>
                  <option value={10}>10 min before</option>
                  <option value={15}>15 min before</option>
                  <option value={30}>30 min before</option>
                  <option value={60}>1 hour before</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Room / Building
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Engineering Hall 204"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Instructor
                </label>
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="Prof. Vance"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-slate-700 mr-2">
                  Days:
                </span>
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      days.includes(day)
                        ? "bg-purple-700 text-white border-purple-700"
                        : "bg-white text-slate-600 border-purple-200 hover:bg-purple-50"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-purple-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-purple-700 rounded-lg hover:bg-purple-800"
                >
                  {editingId ? "Update Class" : "Save Class"}
                </button>
              </div>
            </div>
          </form>
        )}

        {todaysClasses.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-slate-500">
            No classes scheduled on {todayWd}.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {todaysClasses.map((cls) => (
              <div
                key={cls.id}
                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-36 font-mono text-xs text-slate-700 tabular-nums shrink-0">
                    {formatTime12h(cls.startTime)} – {formatTime12h(cls.endTime)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {cls.code} · {cls.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {cls.location}
                      {cls.instructor ? ` · ${cls.instructor}` : ""}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 tabular-nums">
                  {cls.remindersEnabled
                    ? `Alert ${cls.remindMinutesBefore}m prior`
                    : "Alerts paused"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Complete Course Timetable Table */}
      <section className="bg-white border border-purple-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-purple-100">
          <h2 className="font-display text-base font-semibold text-purple-950">
            All Registered Classes
          </h2>
          <p className="text-xs text-slate-500">
            Manage course times, room locations, and per-class reminder alerts
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-800">
              No courses registered yet
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Add your weekly classes so Termflow can remind you before lectures
              and block your schedule around them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-purple-100 bg-purple-50/70 text-xs font-medium text-purple-900">
                  <th className="py-3 px-5">Course</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Reminder</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 text-sm">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-purple-50/35">
                    <td className="py-3 px-5">
                      <div className="font-medium text-slate-900">
                        <span className="font-mono text-xs text-purple-700 mr-2">
                          {cls.code}
                        </span>
                        {cls.title}
                      </div>
                      {cls.instructor && (
                        <div className="text-xs text-slate-500">
                          {cls.instructor}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      {cls.days.join(" · ")}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {formatTime12h(cls.startTime)} – {formatTime12h(cls.endTime)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {cls.location}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onToggleClassReminder(cls.id)}
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          cls.remindersEnabled
                            ? "text-green-700"
                            : "text-slate-400"
                        }`}
                      >
                        {cls.remindersEnabled ? (
                          <Bell className="h-3.5 w-3.5" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5" />
                        )}
                        <span className="tabular-nums">
                          {cls.remindersEnabled
                            ? `${cls.remindMinutesBefore}m before`
                            : "Off"}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(cls)}
                        aria-label={`Edit ${cls.code}`}
                        className="p-1.5 text-slate-400 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteClass(cls.id)}
                        aria-label={`Delete ${cls.code}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 ml-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
