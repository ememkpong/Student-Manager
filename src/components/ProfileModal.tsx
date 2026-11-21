import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  Mail,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { StudentClass, StudentProfile, Weekday } from "../types";
import { formatTime12h, WEEKDAYS } from "../utils/dateUtils";

interface ProfileModalProps {
  open: boolean;
  isOnboarding: boolean;
  profile: StudentProfile | null;
  fallbackName: string;
  fallbackEmail: string;
  onSave: (
    data: {
      name: string;
      gmail: string;
      semester: string;
      level: string;
    },
    initialCourses?: Omit<StudentClass, "id">[]
  ) => Promise<void>;
  onClose: () => void;
}

const SEMESTER_PRESETS = [
  "First Semester 2026",
  "Second Semester 2026",
  "Harmattan 2026",
  "Rain 2026",
  "Fall 2026",
  "Spring 2027",
];

const LEVEL_PRESETS = [
  "100 Level",
  "200 Level",
  "300 Level",
  "400 Level",
  "500 Level",
  "Postgraduate",
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
];

export function ProfileModal({
  open,
  isOnboarding,
  profile,
  fallbackName,
  fallbackEmail,
  onSave,
  onClose,
}: ProfileModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Student Info
  const [name, setName] = useState("");
  const [gmail, setGmail] = useState("");
  const [semester, setSemester] = useState("");
  const [level, setLevel] = useState("");

  // Step 2: Courses added during login onboarding
  const [courses, setCourses] = useState<Omit<StudentClass, "id">[]>([]);
  const [clsCode, setClsCode] = useState("");
  const [clsTitle, setClsTitle] = useState("");
  const [clsDays, setClsDays] = useState<Weekday[]>(["Mon", "Wed"]);
  const [clsStart, setClsStart] = useState("09:00");
  const [clsEnd, setClsEnd] = useState("10:30");
  const [clsLocation, setClsLocation] = useState("");
  const [clsInstructor, setClsInstructor] = useState("");
  const [clsRemind, setClsRemind] = useState(15);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName(profile?.name || fallbackName || "");
    setGmail(profile?.gmail || fallbackEmail || "");
    setSemester(profile?.semester || "");
    setLevel(profile?.level || "");
    setCourses([]);
    setClsCode("");
    setClsTitle("");
    setClsDays(["Mon", "Wed"]);
    setClsStart("09:00");
    setClsEnd("10:30");
    setClsLocation("");
    setClsInstructor("");
    setClsRemind(15);
    setErrorMsg(null);
  }, [open, profile, fallbackName, fallbackEmail]);

  if (!open) return null;

  const validateProfileFields = (): boolean => {
    const cleanName = name.trim();
    const cleanGmail = gmail.trim();
    const cleanSemester = semester.trim();
    const cleanLevel = level.trim();

    if (!cleanName) {
      setErrorMsg("Please enter your full name.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanGmail)) {
      setErrorMsg("Please enter a valid Gmail or email address.");
      return false;
    }
    if (!cleanSemester) {
      setErrorMsg("Please enter or choose your current semester.");
      return false;
    }
    if (!cleanLevel) {
      setErrorMsg("Please enter or choose your academic level.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const toggleDay = (day: Weekday) => {
    setClsDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddDraftCourse = () => {
    if (!clsCode.trim() || !clsTitle.trim()) {
      setErrorMsg("Enter both a course code and course title to add a course.");
      return;
    }
    if (clsDays.length === 0) {
      setErrorMsg("Select at least one day for this course.");
      return;
    }
    setErrorMsg(null);
    setCourses((prev) => [
      ...prev,
      {
        code: clsCode.trim().toUpperCase(),
        title: clsTitle.trim(),
        days: clsDays,
        startTime: clsStart,
        endTime: clsEnd,
        location: clsLocation.trim() || "TBA",
        instructor: clsInstructor.trim(),
        remindMinutesBefore: clsRemind,
        remindersEnabled: true,
      },
    ]);
    setClsCode("");
    setClsTitle("");
    setClsLocation("");
    setClsInstructor("");
  };

  const handleRemoveDraftCourse = (idx: number) => {
    setCourses((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfileFields()) return;
    if (isOnboarding) {
      setStep(2);
    } else {
      void handleFinalSave();
    }
  };

  const handleFinalSave = async () => {
    if (!validateProfileFields()) {
      setStep(1);
      return;
    }

    let finalCourses = [...courses];
    if (isOnboarding && clsCode.trim() && clsTitle.trim() && clsDays.length > 0) {
      finalCourses = [
        ...finalCourses,
        {
          code: clsCode.trim().toUpperCase(),
          title: clsTitle.trim(),
          days: clsDays,
          startTime: clsStart,
          endTime: clsEnd,
          location: clsLocation.trim() || "TBA",
          instructor: clsInstructor.trim(),
          remindMinutesBefore: clsRemind,
          remindersEnabled: true,
        },
      ];
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave(
        {
          name: name.trim().slice(0, 120),
          gmail: gmail.trim().slice(0, 160),
          semester: semester.trim().slice(0, 80),
          level: level.trim().slice(0, 60),
        },
        finalCourses
      );
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Could not save your information. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/65 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="w-full max-w-xl bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-2xl my-auto">
        <div className="px-6 py-4 border-b border-purple-100 flex items-center justify-between gap-4 bg-purple-50/70">
          <div>
            {isOnboarding && (
              <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-700 mb-0.5 tabular-nums">
                Step {step} of 2 · {step === 1 ? "Student Details" : "Your Courses"}
              </div>
            )}
            <h2
              id="profile-modal-title"
              className="font-display text-base font-semibold text-purple-950"
            >
              {isOnboarding
                ? step === 1
                  ? "Set Up Your Student Profile"
                  : "Add Your Semester Courses"
                : "Edit Student Profile"}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {isOnboarding
                ? step === 1
                  ? "Enter your name, Gmail, semester, and level to personalize Termflow."
                  : "Register the classes you're taking this semester for reminders and scheduling."
                : "Update your saved name, Gmail, semester, and academic level."}
            </p>
          </div>
          {!isOnboarding && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile dialog"
              className="p-1.5 text-slate-400 hover:text-purple-800 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {step === 1 ? (
          <form onSubmit={handleStep1Next} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label
                htmlFor="student-name"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"
              >
                <User className="h-3.5 w-3.5 text-purple-700" />
                <span>Full Name</span>
              </label>
              <input
                id="student-name"
                type="text"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* Gmail */}
            <div>
              <label
                htmlFor="student-gmail"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"
              >
                <Mail className="h-3.5 w-3.5 text-purple-700" />
                <span>Gmail Address</span>
              </label>
              <input
                id="student-gmail"
                type="email"
                required
                maxLength={160}
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* Semester */}
            <div>
              <label
                htmlFor="student-semester"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"
              >
                <GraduationCap className="h-3.5 w-3.5 text-purple-700" />
                <span>Semester</span>
              </label>
              <input
                id="student-semester"
                type="text"
                required
                maxLength={80}
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. First Semester 2026 or Harmattan 2026"
                className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SEMESTER_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSemester(preset)}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                      semester === preset
                        ? "bg-purple-700 border-purple-700 text-white"
                        : "bg-purple-50/60 border-purple-200 text-purple-900 hover:bg-purple-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Level */}
            <div>
              <label
                htmlFor="student-level"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Academic Level
              </label>
              <input
                id="student-level"
                type="text"
                required
                maxLength={60}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g. 300 Level, 200 Level, or Junior"
                className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LEVEL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLevel(preset)}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                      level === preset
                        ? "bg-purple-700 border-purple-700 text-white"
                        : "bg-purple-50/60 border-purple-200 text-purple-900 hover:bg-purple-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-purple-100">
              {!isOnboarding && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-purple-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-purple-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-purple-700 text-white text-xs sm:text-sm font-medium hover:bg-purple-800 disabled:opacity-60 flex items-center gap-2"
              >
                {isOnboarding ? (
                  <>
                    <span>Next: Add Your Courses</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{saving ? "Saving..." : "Save Information"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Add Courses During Onboarding */
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-900">
                <BookOpen className="h-3.5 w-3.5 text-purple-700" />
                <span>Add a Course</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    maxLength={32}
                    value={clsCode}
                    onChange={(e) => setClsCode(e.target.value)}
                    placeholder="e.g., CSC 301"
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-purple-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={clsTitle}
                    onChange={(e) => setClsTitle(e.target.value)}
                    placeholder="e.g., Data Structures & Algorithms"
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
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
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                          selected
                            ? "bg-purple-700 text-white border-purple-700"
                            : "bg-white text-slate-600 border-purple-200 hover:bg-purple-50"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={clsStart}
                    onChange={(e) => setClsStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={clsEnd}
                    onChange={(e) => setClsEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg font-mono"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Reminder Lead
                  </label>
                  <select
                    value={clsRemind}
                    onChange={(e) => setClsRemind(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg"
                  >
                    <option value={5}>5 min before</option>
                    <option value={10}>10 min before</option>
                    <option value={15}>15 min before</option>
                    <option value={30}>30 min before</option>
                    <option value={60}>1 hour before</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Room / Location (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={clsLocation}
                    onChange={(e) => setClsLocation(e.target.value)}
                    placeholder="e.g., Faculty Hall B"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Lecturer / Instructor (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={clsInstructor}
                    onChange={(e) => setClsInstructor(e.target.value)}
                    placeholder="e.g., Dr. Adewale"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddDraftCourse}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-medium hover:bg-purple-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Course</span>
                </button>
              </div>
            </div>

            {/* Queued Courses List */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-700 tabular-nums">
                Courses to Save ({courses.length})
              </div>
              {courses.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-purple-200 text-center text-xs text-slate-500">
                  No courses added yet. Add your classes above or finish setup and
                  add them anytime in the Classes tab.
                </div>
              ) : (
                <div className="divide-y divide-purple-100 border border-purple-200 rounded-xl overflow-hidden bg-white">
                  {courses.map((c, idx) => (
                    <div
                      key={`${c.code}-${idx}`}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          <span className="font-mono text-purple-700 mr-1.5">
                            {c.code}
                          </span>
                          {c.title}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {c.days.join(", ")} · {formatTime12h(c.startTime)} –{" "}
                          {formatTime12h(c.endTime)}
                          {c.location ? ` · ${c.location}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftCourse(idx)}
                        aria-label={`Remove ${c.code}`}
                        className="p-1 text-slate-400 hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-between gap-3 border-t border-purple-100">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep(1);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-purple-200 text-xs font-medium text-purple-800 hover:bg-purple-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleFinalSave()}
                className="px-5 py-2 rounded-lg bg-purple-700 text-white text-xs sm:text-sm font-medium hover:bg-purple-800 disabled:opacity-60 flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>
                  {saving
                    ? "Saving Workspace..."
                    : courses.length > 0
                    ? `Save & Enter Termflow (${courses.length})`
                    : "Complete Setup"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
