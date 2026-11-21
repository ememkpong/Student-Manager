import { useEffect, useState } from "react";
import { AlertCircle, Check, GraduationCap, Mail, User, X } from "lucide-react";
import type { StudentProfile } from "../types";

interface ProfileModalProps {
  open: boolean;
  isOnboarding: boolean;
  profile: StudentProfile | null;
  fallbackName: string;
  fallbackEmail: string;
  onSave: (data: {
    name: string;
    gmail: string;
    semester: string;
    level: string;
  }) => Promise<void>;
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
  const [name, setName] = useState("");
  const [gmail, setGmail] = useState("");
  const [semester, setSemester] = useState("");
  const [level, setLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(profile?.name || fallbackName || "");
    setGmail(profile?.gmail || fallbackEmail || "");
    setSemester(profile?.semester || "");
    setLevel(profile?.level || "");
    setErrorMsg(null);
  }, [open, profile, fallbackName, fallbackEmail]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanGmail = gmail.trim();
    const cleanSemester = semester.trim();
    const cleanLevel = level.trim();

    if (!cleanName) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanGmail)) {
      setErrorMsg("Please enter a valid Gmail or email address.");
      return;
    }
    if (!cleanSemester) {
      setErrorMsg("Please enter or choose your current semester.");
      return;
    }
    if (!cleanLevel) {
      setErrorMsg("Please enter or choose your academic level.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave({
        name: cleanName.slice(0, 120),
        gmail: cleanGmail.slice(0, 160),
        semester: cleanSemester.slice(0, 80),
        level: cleanLevel.slice(0, 60),
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Could not save your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-violet-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-violet-100 flex items-center justify-between gap-4 bg-violet-50/40">
          <div>
            <h2
              id="profile-modal-title"
              className="font-display text-base font-semibold text-slate-900"
            >
              {isOnboarding
                ? "Complete Your Student Profile"
                : "Edit Student Profile"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isOnboarding
                ? "Enter your details below so Termflow saves your personal academic workspace."
                : "Update your saved name, Gmail, semester, and academic level."}
            </p>
          </div>
          {!isOnboarding && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile dialog"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
              <User className="h-3.5 w-3.5 text-violet-600" />
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          {/* Gmail */}
          <div>
            <label
              htmlFor="student-gmail"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"
            >
              <Mail className="h-3.5 w-3.5 text-violet-600" />
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          {/* Semester */}
          <div>
            <label
              htmlFor="student-semester"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"
            >
              <GraduationCap className="h-3.5 w-3.5 text-violet-600" />
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SEMESTER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSemester(preset)}
                  className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                    semester === preset
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-800"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LEVEL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLevel(preset)}
                  className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                    level === preset
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-800"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            {!isOnboarding && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-violet-600 text-white text-xs sm:text-sm font-medium hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save Information"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
